import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth, OperationType, handleFirestoreError } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRooms } from "@/hooks/useRooms";
import { motion } from "framer-motion";

interface Message {
  id: string;
  content: string;
  createdAt: any;
  userId: string;
  roomId: string;
}

const MAX_MESSAGE_LENGTH = 1000;

const RoomChat = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { leaveRoom } = useRooms();

  const [roomName, setRoomName] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // SEO: update title
  useEffect(() => {
    document.title = roomName ? `${roomName} | Chat Room` : "Room Chat";
  }, [roomName]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!roomId) return;

    const loadRoom = async () => {
      setLoading(true);
      try {
        const roomSnap = await getDoc(doc(db, "rooms", roomId));
        if (roomSnap.exists()) {
          const room = roomSnap.data();
          setRoomName(room.name);
          setIsPublic(room.isPublic);
        } else {
          navigate("/rooms");
        }
      } catch (error) {
        console.error("Error loading room:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRoom();

    const q = query(
      collection(db, "rooms", roomId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      scrollToBottom();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}/messages`);
    });

    return () => unsubscribe();
  }, [roomId, navigate]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !roomId || !auth.currentUser) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    setSending(true);
    const messagesPath = `rooms/${roomId}/messages`;
    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        content: text,
        userId: auth.currentUser.uid,
        roomId: roomId,
        createdAt: serverTimestamp(),
        messageType: "text"
      });
      setInput("");
      scrollToBottom();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, messagesPath);
    } finally {
      setSending(false);
    }
  };

  const handleLeave = async () => {
    if (!roomId) return;
    const ok = await leaveRoom(roomId);
    if (ok) navigate("/rooms");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-room-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-room-primary/5 to-room-primary-glow/10 pb-24 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-room-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />
      </div>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-room-primary/20 shadow-lg">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-room-primary to-room-primary-glow bg-clip-text text-transparent">
            {roomName || "Room"}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" className="border-room-primary/30 hover:bg-room-primary/10" onClick={() => navigate('/rooms')}>
              Back
            </Button>
            <Button variant="destructive" className="hover:shadow-lg transition-all duration-300" onClick={handleLeave}>
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages yet. Say hi!</p>
        ) : (
          messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-card to-card/80 border border-room-primary/20 shadow-sm hover:shadow-[0_4px_20px_rgba(168,85,247,0.15)] transition-all duration-300 backdrop-blur-sm"
            >
              <div className="text-xs text-room-primary font-medium mb-1">
                {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString() : new Date().toLocaleTimeString()}
              </div>
              <div className="text-foreground">{m.content}</div>
            </motion.div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="fixed inset-x-0 bottom-0 border-t border-room-primary/20 bg-background/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(168,85,247,0.1)] p-3 relative z-40">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={isPublic ? "Message public room" : "Message private room"}
            maxLength={MAX_MESSAGE_LENGTH}
            className="border-room-primary/30 focus:border-room-primary focus:ring-room-primary/20 bg-background/80 backdrop-blur-sm"
          />
          <Button 
            onClick={sendMessage} 
            disabled={sending}
            className="bg-gradient-to-r from-room-primary to-room-primary-glow hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all duration-300"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomChat;

