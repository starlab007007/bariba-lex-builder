import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Phone, Users, Plus, Radio, 
  Volume2, Crown, X, Loader2, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useVoiceRooms, VoiceRoom } from '@/hooks/useVoiceRooms';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TamTamVoiceRoomsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROOM_CATEGORIES = [
  { id: 'discussion', label: '💬 Discussion', color: 'from-blue-500 to-blue-600' },
  { id: 'music', label: '🎵 Musique', color: 'from-purple-500 to-purple-600' },
  { id: 'learning', label: '📚 Apprentissage', color: 'from-green-500 to-green-600' },
  { id: 'culture', label: '🎭 Culture', color: 'from-orange-500 to-orange-600' },
  { id: 'news', label: '📰 Actualités', color: 'from-red-500 to-red-600' },
];

export function TamTamVoiceRooms({ isOpen, onClose }: TamTamVoiceRoomsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { rooms, loading, currentRoom, createRoom, joinRoom, leaveRoom } = useVoiceRooms();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('discussion');
  const [isMuted, setIsMuted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    const room = await createRoom(newRoomTitle, undefined, newRoomCategory);
    setIsCreating(false);
    
    if (room) {
      toast({ title: "🎙️ Salon créé !", description: newRoomTitle });
      setShowCreateModal(false);
      setNewRoomTitle('');
    }
  };

  const handleJoinRoom = async (room: VoiceRoom) => {
    const success = await joinRoom(room.id);
    if (success) {
      toast({ title: `🎧 Vous avez rejoint "${room.title}"` });
    }
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    toast({ title: "👋 Vous avez quitté le salon" });
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#FAFAFA]"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-500" />
            Salons Vocaux
          </h1>
          <p className="text-sm text-gray-500">{rooms.length} salons actifs</p>
        </div>
        <Button
          size="sm"
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Créer
        </Button>
      </div>

      {/* Current Room (if joined) */}
      <AnimatePresence>
        {currentRoom && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-4 shadow-xl rounded-t-3xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Radio className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold">{currentRoom.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Users className="h-3 w-3" />
                    {currentRoom.participants_count} participants
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  size="icon"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={handleLeaveRoom}
                >
                  <Phone className="h-5 w-5 rotate-135" />
                </Button>
              </div>
            </div>

            {/* Participants avatars */}
            <div className="flex -space-x-2">
              {[...Array(Math.min(currentRoom.participants_count, 8))].map((_, i) => (
                <Avatar key={i} className="border-2 border-purple-600 w-8 h-8">
                  <AvatarFallback className="bg-white/20 text-white text-xs">
                    {String.fromCharCode(65 + i)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {currentRoom.participants_count > 8 && (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  +{currentRoom.participants_count - 8}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rooms List */}
      <ScrollArea className={cn("flex-1 p-4", currentRoom && "pb-40")}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun salon actif</p>
            <p className="text-sm text-gray-400 mt-1">
              Créez le premier salon vocal !
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => {
              const category = ROOM_CATEGORIES.find(c => c.id === room.category) || ROOM_CATEGORIES[0];
              const isHost = room.host_id === user?.id;
              
              return (
                <motion.div
                  key={room.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !currentRoom && handleJoinRoom(room)}
                  className={cn(
                    "p-4 rounded-2xl bg-white shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow",
                    currentRoom?.id === room.id && "ring-2 ring-purple-500"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                      category.color
                    )}>
                      <Radio className="h-5 w-5 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{room.title}</h3>
                        {isHost && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {category.label}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {room.participants_count}
                        </span>
                      </div>
                      
                      {room.host && (
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={room.host.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {room.host.display_name?.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-500">
                            Hôte: {room.host.display_name}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Live indicator */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-3 h-3 rounded-full bg-red-500"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl"
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Radio className="h-5 w-5 text-purple-500" />
                Créer un Salon
              </h2>
              
              <Input
                placeholder="Nom du salon..."
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                className="mb-4"
              />
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                {ROOM_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setNewRoomCategory(cat.id)}
                    className={cn(
                      "p-3 rounded-xl text-sm font-medium transition-all",
                      newRoomCategory === cat.id
                        ? `bg-gradient-to-r ${cat.color} text-white`
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Radio className="h-4 w-4 mr-2" />
                  )}
                  Démarrer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
