import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DigitKeypad } from "./DigitKeypad";
import { useRooms } from "@/hooks/useRooms";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (room: any) => void;
}

export const JoinRoomModal = ({ isOpen, onClose, onSuccess }: JoinRoomModalProps) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { joinRoom } = useRooms();

  useEffect(() => {
    if (isOpen) {
      setCode("");
      setError("");
    }
  }, [isOpen]);

  const handleDigitPress = (digit: string) => {
    if (code.length < 6) {
      setCode(prev => prev + digit);
      setError("");
    }
  };

  const handleBackspace = () => {
    setCode(prev => prev.slice(0, -1));
    setError("");
  };

  const handleJoinRoom = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const room = await joinRoom(code);
      if (room) {
        onSuccess?.(room);
        onClose();
      } else {
        setError("Invalid room code or room not found");
        // Trigger shake animation
        setCode("");
      }
    } catch (error) {
      setError("Failed to join room. Please try again.");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && !isLoading) {
      handleJoinRoom();
    }
  }, [code, isLoading]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Join Room</DialogTitle>
          <DialogDescription>Enter a 6-digit code to join a private room</DialogDescription>
        </DialogHeader>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
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
              Join Room
            </motion.h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Code Display */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-center text-muted-foreground mb-4">
              Enter the 6-digit room code
            </p>
            
            <motion.div 
              className={`flex justify-center gap-2 mb-4 ${
                error ? "animate-shake" : ""
              }`}
              animate={error ? { 
                x: [0, -10, 10, -10, 10, 0],
                borderColor: ["hsl(var(--room-error))", "hsl(var(--border))"]
              } : {}}
              transition={{ duration: 0.6 }}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={index}
                  className={`
                    w-12 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-mono font-semibold
                    ${
                      error
                        ? "border-room-error bg-room-error/10 text-room-error"
                        : index < code.length
                        ? "border-room-primary bg-room-primary/10 text-room-primary"
                        : "border-border bg-background text-muted-foreground"
                    }
                    transition-all duration-200
                  `}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    ...(index === code.length - 1 && code.length > 0 ? {
                      scale: [1, 1.1, 1],
                      transition: { duration: 0.3 }
                    } : {})
                  }}
                  transition={{ delay: index * 0.05 }}
                >
                  {code[index] || ""}
                </motion.div>
              ))}
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.p 
                  className="text-center text-room-error text-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Keypad */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <DigitKeypad
              onDigitPress={handleDigitPress}
              onBackspace={handleBackspace}
              disabled={isLoading}
            />
          </motion.div>

          {/* Loading state */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className="text-center"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                >
                  <div className="w-8 h-8 border-4 border-room-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Joining room...</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};