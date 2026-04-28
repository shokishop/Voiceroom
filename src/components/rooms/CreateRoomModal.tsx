import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Lock, Copy, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRooms } from "@/hooks/useRooms";
import { useToast } from "@/hooks/use-toast";
import Lottie from "lottie-react";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (room: any) => void;
}

// Simple confetti animation data
const confettiAnimation = {
  v: "5.7.6",
  fr: 60,
  ip: 0,
  op: 180,
  w: 400,
  h: 400,
  nm: "Confetti",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "confetti",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [
          { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0] },
          { t: 180, s: [360] }
        ]},
        p: { a: 0, k: [200, 200] },
        a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [0, 0] },
          { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 30, s: [100, 100] },
          { t: 180, s: [0, 0] }
        ]}
      },
      ao: 0,
      shapes: [{
        ty: "rc",
        d: 1,
        s: { a: 0, k: [20, 20] },
        p: { a: 0, k: [0, 0] },
        r: { a: 0, k: 0 },
        nm: "Rectangle",
        hd: false
      }],
      ip: 0,
      op: 180,
      st: 0
    }
  ]
};

export const CreateRoomModal = ({ isOpen, onClose, onSuccess }: CreateRoomModalProps) => {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const { createRoom } = useRooms();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName("");
      setIsPublic(true);
      setCreatedRoom(null);
      setShowSuccess(false);
      setCopiedCode(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const room = await createRoom(name.trim(), isPublic);
      if (room) {
        setCreatedRoom(room);
        setShowSuccess(true);
        onSuccess?.(room);
      }
    } catch (error) {
      console.error("Failed to create room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    if (createdRoom?.code) {
      await navigator.clipboard.writeText(createdRoom.code);
      setCopiedCode(true);
      toast({
        title: "Code copied!",
        description: "Room code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setShowSuccess(false);
      setCreatedRoom(null);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Accessible title/description for screen readers */}
        <DialogHeader className="sr-only">
          <DialogTitle>Create Room</DialogTitle>
          <DialogDescription>Choose visibility and name your room</DialogDescription>
        </DialogHeader>
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key="create-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <motion.h2 
                  className="text-2xl font-bold bg-gradient-to-r from-room-primary to-room-primary-glow bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Create Room
                </motion.h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <motion.form
                onSubmit={handleSubmit}
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Room Name */}
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-sm font-medium">
                    Room Name
                  </Label>
                  <Input
                    id="roomName"
                    type="text"
                    placeholder="Enter room name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full"
                    maxLength={50}
                    disabled={isLoading}
                  />
                </div>

                {/* Room Visibility */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Room Visibility</Label>
                  
                  <div className="space-y-3">
                    <motion.div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isPublic 
                          ? "border-room-primary bg-room-primary/5" 
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onClick={() => setIsPublic(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Globe className="w-5 h-5 text-room-primary" />
                          <div>
                            <p className="font-medium">Public</p>
                            <p className="text-sm text-muted-foreground">
                              Visible in public room list
                            </p>
                          </div>
                        </div>
                        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                      </div>
                    </motion.div>

                    <motion.div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        !isPublic 
                          ? "border-room-primary bg-room-primary/5" 
                          : "border-border hover:border-muted-foreground"
                      }`}
                      onClick={() => setIsPublic(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Lock className="w-5 h-5 text-room-primary" />
                          <div>
                            <p className="font-medium">Private</p>
                            <p className="text-sm text-muted-foreground">
                              Join only with room code
                            </p>
                          </div>
                        </div>
                        <Switch checked={!isPublic} onCheckedChange={(v) => setIsPublic(!v)} />
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-room-primary to-room-primary-glow hover:shadow-lg transition-all duration-200"
                    disabled={isLoading || !name.trim()}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating...</span>
                      </div>
                    ) : (
                      "Create Room"
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </motion.div>
          ) : (
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="p-6 text-center relative overflow-hidden"
            >
              {/* Background Confetti */}
              <div className="absolute inset-0 pointer-events-none">
                <Lottie
                  animationData={confettiAnimation}
                  loop={false}
                  className="w-full h-full"
                />
              </div>

              {/* Success Content */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative z-10"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  className="w-16 h-16 bg-gradient-to-r from-room-success to-green-400 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl font-bold text-foreground mb-2"
                >
                  Room Created Successfully!
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground mb-6"
                >
                  Share this code with others to join your room
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="bg-room-primary/10 border border-room-primary/20 rounded-lg p-4 mb-6"
                >
                  <p className="text-sm text-muted-foreground mb-2">Room Code</p>
                  <div className="flex items-center justify-center space-x-2">
                    <motion.span
                      className="text-3xl font-mono font-bold text-room-primary tracking-widest"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      {createdRoom?.code}
                    </motion.span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCode}
                      className="ml-2 hover:bg-room-primary/10"
                    >
                      {copiedCode ? (
                        <CheckCircle2 className="w-4 h-4 text-room-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={handleClose}
                    className="w-full bg-gradient-to-r from-room-primary to-room-primary-glow"
                  >
                    Done
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};