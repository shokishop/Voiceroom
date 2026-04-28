import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get auth user from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { code } = await req.json()

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: 'Valid 6-digit room code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single()

    if (roomError || !room) {
      console.error('Room lookup error:', roomError)
      return new Response(
        JSON.stringify({ error: 'Room not found or invalid code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if room is at capacity
    if (room.active_members >= room.max_members) {
      return new Response(
        JSON.stringify({ error: 'Room is at maximum capacity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('id, is_active')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      if (existingMember.is_active) {
        return new Response(
          JSON.stringify({ 
            message: 'Already a member of this room',
            room 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Reactivate membership
        const { error: updateError } = await supabase
          .from('room_members')
          .update({ is_active: true })
          .eq('id', existingMember.id)

        if (updateError) {
          console.error('Membership reactivation error:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to rejoin room' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } else {
      // Add user as member
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: user.id
        })

      if (memberError) {
        console.error('Member creation error:', memberError)
        return new Response(
          JSON.stringify({ error: 'Failed to join room' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('User joined room successfully:', room.id, user.id)

    return new Response(
      JSON.stringify({ 
        message: 'Successfully joined room',
        room
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})