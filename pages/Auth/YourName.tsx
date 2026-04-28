import { useState } from "react";
import { motion } from "framer-motion";
import { User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

const YourName = () => {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { updateDisplayName } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (displayName.trim().length < 2) {
      toast({
        variant: "destructive",
        title: "Name too short",
        description: "Please enter at least 2 characters for your display name"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await updateDisplayName(displayName.trim());
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update name",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-accent to-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-card/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-border/50">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-6 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">What's your name?</h1>
            <p className="text-muted-foreground">This is how others will see you in chats</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="space-y-3"
            >
              <label className="text-sm font-medium text-foreground">Display Name</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-center text-xl font-medium bg-background/50 border-border/50 focus:border-primary transition-all duration-300 py-6"
                  required
                  minLength={2}
                  maxLength={50}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                You can always change this later in your profile
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="space-y-4"
            >
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-medium py-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] group"
                disabled={isLoading || displayName.trim().length < 2}
              >
                {isLoading ? (
                  "Updating..."
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => window.history.back()}
                >
                  Back
                </Button>
              </div>
            </motion.div>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8"
          >
            <div className="flex justify-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
              <div className="w-8 h-2 bg-primary rounded-full"></div>
              <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Step 1 of 2 • Setting up your profile
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default YourName;