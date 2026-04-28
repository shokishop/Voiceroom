import { useState, useEffect, useCallback } from "react";
import { db, auth, OperationType, handleFirestoreError } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDocs, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  orderBy,
  runTransaction
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export interface Room {
  id: string;
  name: string;
  code: string;
  isPublic: boolean;
  creatorId: string;
  activeMembers: number;
  maxMembers: number;
  lastActivity: any;
  createdAt: any;
  updatedAt: any;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: any;
  isActive: boolean;
}

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateRoomCode = async () => {
    let code = "";
    let unique = false;
    while (!unique) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const q = query(collection(db, "rooms"), where("code", "==", code));
      const snapshot = await getDocs(q);
      if (snapshot.empty) unique = true;
    }
    return code;
  };

  // Fetch public rooms
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const q = query(
        collection(db, "rooms"), 
        where("isPublic", "==", true),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const roomsList: Room[] = [];
        snapshot.forEach((doc) => {
          roomsList.push({ id: doc.id, ...doc.data() } as Room);
        });
        setRooms(roomsList);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching rooms:", err);
        setError("Failed to load rooms");
        handleFirestoreError(err, OperationType.LIST, "rooms");
      });

      return unsubscribe;
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }, []); // removed toast dependency

  // Create room
  const createRoom = useCallback(async (name: string, isPublic: boolean = true) => {
    try {
      if (!auth.currentUser) {
        toast({
          title: "Authentication required",
          description: "Please log in to create a room",
          variant: "destructive",
        });
        return null;
      }

      const roomCode = await generateRoomCode();
      const roomId = crypto.randomUUID();

      const roomData = {
        name,
        code: roomCode,
        isPublic,
        creatorId: auth.currentUser.uid,
        activeMembers: 1,
        maxMembers: 10,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      };

      await runTransaction(db, async (transaction) => {
        // Create the room
        transaction.set(doc(db, "rooms", roomId), roomData);

        // Add creator as member
        const memberId = auth.currentUser!.uid;
        transaction.set(doc(db, `rooms/${roomId}/members`, memberId), {
          roomId,
          userId: auth.currentUser!.uid,
          isActive: true,
          joinedAt: serverTimestamp()
        });
      });

      toast({
        title: "Room created!",
        description: `Room "${name}" created successfully`,
      });

      return { id: roomId, ...roomData };
    } catch (error) {
      console.error("Create room error:", error);
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Join room by code
  const joinRoom = useCallback(async (code: string) => {
    try {
      if (!auth.currentUser) {
        toast({
          title: "Authentication required",
          description: "Please log in to join a room",
          variant: "destructive",
        });
        return null;
      }

      const q = query(collection(db, "rooms"), where("code", "==", code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          title: "Error",
          description: "Invalid room code",
          variant: "destructive",
        });
        return null;
      }

      const roomDoc = querySnapshot.docs[0];
      const roomId = roomDoc.id;
      const roomData = roomDoc.data() as Room;

      // Check if already a member
      const memberDoc = await getDoc(doc(db, `rooms/${roomId}/members`, auth.currentUser.uid));
      if (memberDoc.exists()) {
        toast({
          title: "Already joined",
          description: `You are already in "${roomData.name}"`,
        });
        return { id: roomId, ...roomData };
      }

      await runTransaction(db, async (transaction) => {
        // Add member
        transaction.set(doc(db, `rooms/${roomId}/members`, auth.currentUser!.uid), {
          roomId,
          userId: auth.currentUser!.uid,
          isActive: true,
          joinedAt: serverTimestamp()
        });

        // Update active members count
        transaction.update(doc(db, "rooms", roomId), {
          activeMembers: (roomData.activeMembers || 0) + 1,
          updatedAt: serverTimestamp()
        });
      });

      toast({
        title: "Successfully joined!",
        description: `You joined "${roomData.name}"`,
      });

      return { id: roomId, ...roomData };
    } catch (error) {
      console.error("Join room error:", error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const leaveRoom = useCallback(async (roomId: string) => {
    try {
      if (!auth.currentUser) return false;

      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, "rooms", roomId);
        const memberRef = doc(db, `rooms/${roomId}/members`, auth.currentUser!.uid);

        const roomSnap = await transaction.get(roomRef);
        if (!roomSnap.exists()) return;

        transaction.delete(memberRef);
        
        const currentMembers = roomSnap.data().activeMembers || 1;
        transaction.update(roomRef, {
          activeMembers: Math.max(0, currentMembers - 1),
          updatedAt: serverTimestamp()
        });
      });

      toast({
        title: "Left room",
        description: "You have left the room",
      });

      return true;
    } catch (error) {
      console.error("Leave room error:", error);
      return false;
    }
  }, [toast]);

  useEffect(() => {
    let unsubscribe: () => void;
    (async () => {
      const unsub = await fetchRooms();
      if (unsub) unsubscribe = unsub;
    })();
    return () => unsubscribe && unsubscribe();
  }, [fetchRooms]);

  return {
    rooms,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRooms: fetchRooms,
  };
};
