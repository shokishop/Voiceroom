import { useState, useEffect, useRef } from "react";
import { Send, Search, Plus, ArrowLeft, MoreVertical, Users, UserPlus, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from "@/components/rooms/BottomNavigation";
import { useToast } from "@/hooks/use-toast";
import { db, auth, OperationType, handleFirestoreError } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  or, 
  and, 
  orderBy,
  limit
} from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  messageType: string;
  readAt?: any;
}

interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  level: number;
  charms: number;
}

interface Contact {
  id: string;
  userId: string;
  friendId: string;
  status: string;
  profile?: UserProfile;
}

export default function DirectMessages() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchContacts();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedContact && currentUser) {
      const q = query(
        collection(db, "direct_messages"),
        or(
          and(where("senderId", "==", currentUser.uid), where("receiverId", "==", selectedContact.friendId)),
          and(where("senderId", "==", selectedContact.friendId), where("receiverId", "==", currentUser.uid))
        ),
        orderBy("createdAt", "asc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgs);
        
        const sentByMe = msgs.filter(m => m.senderId === currentUser.uid).length;
        setMessageCount(sentByMe);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, "direct_messages");
      });

      return () => unsubscribe();
    }
  }, [selectedContact, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchContacts = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "user_connections"),
        or(where("userId", "==", currentUser.uid), where("friendId", "==", currentUser.uid))
      );

      const querySnapshot = await getDocs(q);
      const connectionsList: any[] = [];
      querySnapshot.forEach((doc) => {
        connectionsList.push({ id: doc.id, ...doc.data() });
      });

      const contactsWithProfiles = await Promise.all(
        connectionsList.map(async (conn) => {
          const friendId = conn.userId === currentUser.uid ? conn.friendId : conn.userId;
          
          const profileSnap = await getDoc(doc(db, 'profiles', friendId));
          const profile = profileSnap.data();

          return {
            ...conn,
            friendId: friendId,
            profile: {
              userId: friendId,
              username: profile?.username || 'user',
              displayName: profile?.displayName || profile?.username || 'user',
              avatarUrl: profile?.avatarUrl || '',
              level: profile?.level || 1,
              charms: profile?.charms || 0
            } as UserProfile
          };
        })
      );

      setContacts(contactsWithProfiles.filter(c => c.profile));
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const searchUserByUsername = async () => {
    if (!searchUsername.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive"
      });
      return;
    }

    setSearchLoading(true);
    try {
      const q = query(collection(db, 'profiles'), where('username', '==', searchUsername.toLowerCase()), limit(1));
      const querySnapshot = await getDocs(q);
      
      setSearchLoading(false);

      if (querySnapshot.empty) {
        toast({
          title: "Not Found",
          description: "No user found with that username",
          variant: "destructive"
        });
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const profile: UserProfile = {
        userId: querySnapshot.docs[0].id,
        username: userData.username || '',
        displayName: userData.displayName || userData.username || '',
        avatarUrl: userData.avatarUrl || '',
        level: userData.level || 1,
        charms: userData.charms || 0
      };

      setSearchedUser(profile);
      setShowAddContact(false);
      setShowUserProfile(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchLoading(false);
    }
  };

  const startChat = async (friendId: string) => {
    if (!currentUser || !searchedUser) return;

    try {
      // Check if connection exists
      const q = query(
        collection(db, 'user_connections'),
        or(
          and(where('user_id', '==', currentUser.uid), where('friend_id', '==', friendId)),
          and(where('user_id', '==', friendId), where('friend_id', '==', currentUser.uid))
        ),
        limit(1)
      );
      const existingRef = await getDocs(q);
      
      let connectionId = '';
      let status = 'pending';

      if (existingRef.empty) {
        // Create connection
        const newConnRef = await addDoc(collection(db, 'user_connections'), {
          userId: currentUser.uid,
          friendId: friendId,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        connectionId = newConnRef.id;
      } else {
        connectionId = existingRef.docs[0].id;
        status = existingRef.docs[0].data().status;
      }

      const newContact: Contact = {
        id: connectionId,
        userId: currentUser.uid,
        friendId: friendId,
        status: status,
        profile: searchedUser
      };

      setShowUserProfile(false);
      setSearchUsername("");
      setSearchedUser(null);
      setSelectedContact(newContact);
      await fetchContacts();

      toast({
        title: "Chat opened",
        description: status === 'accepted' 
          ? "You can now chat freely"
          : "Send a message to start the conversation"
      });
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'user_connections'),
        or(
          and(where('user_id', '==', currentUser.uid), where('friend_id', '==', friendId)),
          and(where('user_id', '==', friendId), where('friend_id', '==', currentUser.uid))
        ),
        limit(1)
      );
      const existingRef = await getDocs(q);

      if (!existingRef.empty) {
        const status = existingRef.docs[0].data().status;
        if (status === 'pending') {
          toast({ title: "Request Pending" });
        } else if (status === 'accepted') {
          toast({ title: "Already Friends" });
        }
        return;
      }

      await addDoc(collection(db, 'user_connections'), {
        userId: currentUser.uid,
        friendId: friendId,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Friend Request Sent",
        description: "They will be notified of your request"
      });
      
      await fetchContacts();
      setShowUserProfile(false);
      setSearchUsername("");
    } catch (error) {
      console.error('Error sending request:', error);
    }
  };

  const acceptFriendRequest = async (connectionId: string) => {
    try {
      await updateDoc(doc(db, 'user_connections', connectionId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      toast({ title: "Friend Request Accepted" });
      fetchContacts();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const rejectFriendRequest = async (connectionId: string) => {
    try {
      await updateDoc(doc(db, 'user_connections', connectionId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      toast({ title: "Friend Request Rejected" });
      fetchContacts();
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !currentUser) return;

    if (selectedContact.status === 'pending' && messageCount >= 1) {
      toast({
        title: "Message Limit Reached",
        description: "Wait for friend request to be accepted",
        variant: "destructive"
      });
      return;
    }

    try {
      await addDoc(collection(db, 'direct_messages'), {
        senderId: currentUser.uid,
        receiverId: selectedContact.friendId,
        content: newMessage,
        messageType: 'text',
        createdAt: serverTimestamp()
      });

      setNewMessage("");
      toast({
        title: "Message sent"
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "direct_messages");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Contacts Sidebar */}
        <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-border bg-card flex-col`}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Messages</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowAddContact(true)}
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {contacts.length > 0 ? (
              <div>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`p-4 cursor-pointer border-b border-border ${
                      selectedContact?.id === contact.id 
                        ? "bg-accent" 
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={contact.profile?.avatarUrl} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {contact.profile?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">
                            {contact.profile?.username || 'Unknown User'}
                          </p>
                          {contact.status === 'pending' && (
                            <Badge variant="secondary" className="text-xs">
                              {contact.userId === currentUser?.uid ? 'Sent' : 'Request'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.status === 'pending' && contact.friendId === currentUser?.uid 
                            ? 'Tap to accept/reject' 
                            : 'Online'}
                        </p>
                      </div>
                      {contact.status === 'pending' && contact.friendId === currentUser?.uid && (
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => acceptFriendRequest(contact.id)}
                            className="h-8 w-8 p-0"
                          >
                            <UserCheck className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => rejectFriendRequest(contact.id)}
                            className="h-8 w-8 p-0"
                          >
                            <UserX className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No contacts yet</h3>
                <p className="text-muted-foreground text-sm">
                  Tap the search icon to find users and start chatting
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${selectedContact ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="md:hidden"
                      onClick={() => setSelectedContact(null)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedContact.profile?.avatarUrl} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {selectedContact.profile?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {selectedContact.profile?.username}
                      </h3>
                      <p className="text-sm text-muted-foreground">Online</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUser?.uid ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === currentUser?.uid
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-foreground"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === currentUser?.uid 
                          ? "opacity-70" 
                          : "text-muted-foreground"
                      }`}>
                        {message.createdAt?.toDate ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={selectedContact.status === 'pending' && messageCount >= 1}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || (selectedContact.status === 'pending' && messageCount >= 1)}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Conversation Selected</h2>
              <p className="text-muted-foreground max-w-md">
                Select a contact to start chatting
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search User</DialogTitle>
            <DialogDescription>Enter a username to find users</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter username..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
            />
            <Button
              onClick={searchUserByUsername}
              disabled={searchLoading || !searchUsername.trim()}
              className="w-full"
            >
              {searchLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {searchedUser && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={searchedUser.avatarUrl} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {searchedUser.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{searchedUser.username}</h3>
                  <p className="text-sm text-muted-foreground">Level {searchedUser.level}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => startChat(searchedUser.userId)} className="flex-1">
                  <Send className="w-4 h-4 mr-2" /> Message
                </Button>
                <Button onClick={() => sendFriendRequest(searchedUser.userId)} className="flex-1" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" /> Add Friend
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}

