import { motion, AnimatePresence } from "framer-motion";
import { Settings, Edit, Check, X, Upload, Calendar, Trophy, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomNavigation } from "@/components/rooms/BottomNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, OperationType, handleFirestoreError } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editData, setEditData] = useState({
    displayName: "",
    username: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
      try {
        const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setProfile(data);
          setEditData({
            displayName: data.displayName || "",
            username: data.username || ""
          });
          setPreviewUrl(data.avatarUrl || "");
        }
      } catch (error) {
        toast({
          title: "Error loading profile",
          description: "Failed to load profile data",
          variant: "destructive"
        });
      }
    };

    loadProfile();
  }, [user, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    
    setIsLoading(true);
    const profilePath = `profiles/${user.uid}`;
    try {
      let avatarUrl = profile.avatarUrl;

      // Handle avatar change - Using mock URL for now as per useAuth pattern
      if (selectedFile) {
        avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}-${Date.now()}`;
      }

      // Update profile in Firestore
      await updateDoc(doc(db, 'profiles', user.uid), {
        displayName: editData.displayName,
        username: editData.username,
        avatarUrl: avatarUrl,
        updatedAt: serverTimestamp()
      });

      setProfile({
        ...profile,
        displayName: editData.displayName,
        username: editData.username,
        avatarUrl: avatarUrl
      });

      setIsEditing(false);
      setSelectedFile(null);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, profilePath);
      toast({
        title: "Update failed",
        description: "Could not update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="p-6 flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/settings')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-6 mb-6"
        >
          <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-6 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative"
                >
                  <Avatar className="w-24 h-24 mx-auto ring-4 ring-room-primary/20">
                    <AvatarImage src={previewUrl} />
                    <AvatarFallback className="bg-room-primary text-white text-2xl">
                      {profile.displayName?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-room-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-room-primary/90"
                    >
                      <Upload className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Name & Username */}
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4 mb-4"
                  >
                    <div className="text-left">
                      <Label htmlFor="displayName" className="text-foreground">Display Name</Label>
                      <Input
                        id="displayName"
                        value={editData.displayName}
                        onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div className="text-left">
                      <Label htmlFor="username" className="text-foreground">Username</Label>
                      <Input
                        id="username"
                        value={editData.username}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4"
                  >
                    <h2 className="text-xl font-semibold text-foreground mb-1">
                      {profile.displayName || 'No name set'}
                    </h2>
                    <p className="text-muted-foreground">@{profile.username}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stats */}
              <div className="flex justify-center gap-8 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-room-primary">{profile.level || 1}</p>
                  <p className="text-sm text-muted-foreground">Level</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-room-primary">{profile.charms || 0}</p>
                  <p className="text-sm text-muted-foreground">Charms</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Member since {formatDate(profile.createdAt || profile.created_at)}</span>
              </div>

              {/* Action Buttons */}
              {isEditing ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1 bg-room-primary hover:bg-room-primary/90"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({
                        displayName: profile.displayName || "",
                        username: profile.username || ""
                      });
                      setSelectedFile(null);
                      setPreviewUrl(profile.avatarUrl || "");
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-room-primary hover:bg-room-primary/90"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <div className="px-6 space-y-4 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-room-primary/10 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-room-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Achievements</h3>
                  <p className="text-sm text-muted-foreground">0 badges earned</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-room-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-room-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Room Activity</h3>
                  <p className="text-sm text-muted-foreground">Join rooms to see stats</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-room-primary/10 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-room-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Messages Sent</h3>
                  <p className="text-sm text-muted-foreground">Start chatting!</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
