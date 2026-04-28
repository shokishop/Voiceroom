import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, User, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";

const PfpUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadAvatar, completeOnboarding } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 5MB"
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      // Skip avatar upload, just complete onboarding
      try {
        await completeOnboarding();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Failed to complete setup",
          description: error.message
        });
      }
      return;
    }

    setIsLoading(true);
    
    try {
      await uploadAvatar(selectedFile);
      await completeOnboarding();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to upload avatar",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center p-4">
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
            <h1 className="text-3xl font-bold text-foreground mb-2">Add a profile photo</h1>
            <p className="text-muted-foreground">Help others recognize you (optional)</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border-4 border-border/30 flex items-center justify-center overflow-hidden">
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
              
              {preview && (
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="space-y-4"
          >
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full border-border/50 bg-background/50 hover:bg-accent/50 py-6 rounded-xl transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              {selectedFile ? "Change Photo" : "Upload Photo"}
            </Button>

            <Button
              onClick={handleUpload}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-medium py-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] group"
              disabled={isLoading}
            >
              {isLoading ? (
                "Finishing setup..."
              ) : (
                <>
                  {selectedFile ? "Continue with Photo" : "Skip for now"}
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

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8"
          >
            <div className="flex justify-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
              <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
              <div className="w-8 h-2 bg-primary rounded-full"></div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Step 2 of 2 • Almost done!
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default PfpUpload;