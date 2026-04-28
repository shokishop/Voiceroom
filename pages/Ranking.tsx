import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/rooms/BottomNavigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";

export default function Ranking() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "profiles"),
      orderBy("charms", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        rank: index + 1,
        username: doc.data().username || "User",
        charms: doc.data().charms || 0,
        avatar: doc.data().avatarUrl || "",
      }));
      setRankings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching rankings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-room-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Fetching legends...</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <Trophy className="w-6 h-6 text-room-primary" />;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500";
      case 2:
        return "bg-gray-400";
      case 3:
        return "bg-amber-600";
      default:
        return "bg-room-primary";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="p-6 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">Rankings</h1>
          <p className="text-muted-foreground">Top performers this week</p>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-6 mb-8"
        >
          <div className="relative flex items-end justify-center gap-4">
            {/* 2nd Place */}
            {rankings[1] && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <Avatar className="w-16 h-16 mx-auto mb-2 ring-4 ring-gray-400">
                  <AvatarImage src={rankings[1].avatar} />
                  <AvatarFallback className="bg-room-primary text-white">
                    {rankings[1].username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-400 text-white px-3 py-8 rounded-t-lg min-h-[80px] flex flex-col justify-center">
                  <Medal className="w-6 h-6 mx-auto mb-1 text-white" />
                  <p className="font-semibold text-sm">{rankings[1].username}</p>
                  <p className="text-xs opacity-90">{rankings[1].charms} charms</p>
                </div>
              </motion.div>
            )}

            {/* 1st Place */}
            {rankings[0] && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <Avatar className="w-20 h-20 mx-auto mb-2 ring-4 ring-yellow-500">
                  <AvatarImage src={rankings[0].avatar} />
                  <AvatarFallback className="bg-room-primary text-white">
                    {rankings[0].username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-yellow-500 text-white px-3 py-10 rounded-t-lg min-h-[100px] flex flex-col justify-center">
                  <Crown className="w-8 h-8 mx-auto mb-1 text-white" />
                  <p className="font-bold">{rankings[0].username}</p>
                  <p className="text-sm opacity-90">{rankings[0].charms} charms</p>
                </div>
              </motion.div>
            )}

            {/* 3rd Place */}
            {rankings[2] && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <Avatar className="w-14 h-14 mx-auto mb-2 ring-4 ring-amber-600">
                  <AvatarImage src={rankings[2].avatar} />
                  <AvatarFallback className="bg-room-primary text-white">
                    {rankings[2].username.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-amber-600 text-white px-3 py-6 rounded-t-lg min-h-[60px] flex flex-col justify-center">
                  <Award className="w-5 h-5 mx-auto mb-1 text-white" />
                  <p className="font-semibold text-sm">{rankings[2].username}</p>
                  <p className="text-xs opacity-90">{rankings[2].charms} charms</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Rest of Rankings */}
        <div className="px-6 space-y-3">
          {rankings.slice(3).map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (index + 4) * 0.1 }}
            >
              <Card className="bg-card border-border hover:bg-accent transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <Badge 
                    className={`${getRankBadgeColor(player.rank)} text-white min-w-[2rem] justify-center`}
                  >
                    #{player.rank}
                  </Badge>
                  
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={player.avatar} />
                    <AvatarFallback className="bg-room-primary text-white">
                      {player.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {player.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {player.charms} charms
                    </p>
                  </div>
                  
                  {getRankIcon(player.rank)}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Your Rank Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="px-6 mt-8"
        >
          <Card className="bg-room-primary/10 border-room-primary">
            <CardContent className="p-4 flex items-center gap-4">
              <Badge className="bg-room-primary text-white min-w-[2rem] justify-center">
                #-
              </Badge>
              
              <Avatar className="w-12 h-12">
                <AvatarImage src="" />
                <AvatarFallback className="bg-room-primary text-white">
                  Y
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">You</p>
                <p className="text-sm text-muted-foreground">
                  0 charms
                </p>
              </div>
              
              <Trophy className="w-6 h-6 text-room-primary" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <BottomNavigation />
    </div>
  );
}