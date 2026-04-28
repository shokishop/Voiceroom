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

    // TTL for empty rooms (5 minutes by default)
    const ttlMinutes = 5
    const cutoffTime = new Date(Date.now() - ttlMinutes * 60 * 1000).toISOString()

    console.log('Starting room cleanup, cutoff time:', cutoffTime)

    // Find empty rooms older than TTL
    const { data: emptyRooms, error: selectError } = await supabase
      .from('rooms')
      .select('id, name, code, last_activity')
      .eq('active_members', 0)
      .lt('last_activity', cutoffTime)

    if (selectError) {
      console.error('Error finding empty rooms:', selectError)
      return new Response(
        JSON.stringify({ error: 'Failed to find empty rooms' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!emptyRooms || emptyRooms.length === 0) {
      console.log('No empty rooms to clean up')
      return new Response(
        JSON.stringify({ 
          message: 'No empty rooms to clean up',
          cleanedCount: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${emptyRooms.length} empty rooms to clean up`)

    // Delete empty rooms (cascade will handle messages and members)
    const roomIds = emptyRooms.map(room => room.id)
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .in('id', roomIds)

    if (deleteError) {
      console.error('Error deleting empty rooms:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete empty rooms' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully cleaned up ${emptyRooms.length} empty rooms`)

    return new Response(
      JSON.stringify({ 
        message: `Successfully cleaned up ${emptyRooms.length} empty rooms`,
        cleanedCount: emptyRooms.length,
        cleanedRooms: emptyRooms.map(room => ({ 
          id: room.id, 
          name: room.name, 
          code: room.code 
        }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error during cleanup:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error during cleanup' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})