import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Users, Mic, Plus, Crown, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useYovoLiveRooms } from '@/hooks/useYovoRealtime';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function YovoLive() {
  const { user } = useAuth();
  const { rooms, loading, createRoom, joinRoom, endRoom } = useYovoLiveRooms();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateRoom = async () => {
    if (!newRoomTitle.trim()) {
      toast({ title: 'Erreur', description: 'Le titre est requis', variant: 'destructive' });
      return;
    }
    
    setCreating(true);
    const result = await createRoom(newRoomTitle, newRoomDescription, newRoomCategory);
    setCreating(false);
    
    if (result.error) {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Room créée!', description: 'Votre room audio est en direct' });
      setIsCreateDialogOpen(false);
      setNewRoomTitle('');
      setNewRoomDescription('');
      setNewRoomCategory('');
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    const result = await joinRoom(roomId);
    if (result.error) {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Bienvenue!', description: 'Vous avez rejoint la room' });
    }
  };

  const handleEndRoom = async (roomId: string) => {
    const result = await endRoom(roomId);
    if (result.error) {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Room terminée', description: 'Votre room audio est fermée' });
    }
  };

  if (!user) {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <Radio className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connexion requise</h2>
        <p className="text-slate-400 mb-4">Connectez-vous pour créer ou rejoindre des rooms</p>
        <Link to="/yovo/auth">
          <Button className="bg-gradient-to-r from-orange-500 to-pink-500">
            Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Create Room Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-14 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-2xl text-lg font-semibold gap-2">
              <Plus className="w-5 h-5" />
              Créer une Room Audio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Nouvelle Room Audio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Titre de la room..."
                value={newRoomTitle}
                onChange={(e) => setNewRoomTitle(e.target.value)}
                className="bg-slate-800 border-white/10 text-white"
              />
              <Textarea
                placeholder="Description (optionnel)..."
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                className="bg-slate-800 border-white/10 text-white"
              />
              <Input
                placeholder="Catégorie (ex: Santé, Business...)"
                value={newRoomCategory}
                onChange={(e) => setNewRoomCategory(e.target.value)}
                className="bg-slate-800 border-white/10 text-white"
              />
              <Button
                onClick={handleCreateRoom}
                disabled={creating}
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Démarrer la Room'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Live Now */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500 animate-pulse" />
          En Direct
        </h3>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-white/5">
            <Radio className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Aucune room en direct</p>
            <p className="text-slate-500 text-sm">Soyez le premier à en créer une!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl border border-white/10 cursor-pointer hover:border-orange-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    LIVE
                  </Badge>
                  {room.category && (
                    <Badge variant="outline" className="text-slate-400 border-slate-600">
                      {room.category}
                    </Badge>
                  )}
                </div>
                
                <h4 className="text-white font-semibold text-lg mb-2">{room.title}</h4>
                {room.description && (
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{room.description}</p>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                    <Crown className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-slate-400 text-sm">Host</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {room.participants_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mic className="w-4 h-4" />
                      En direct
                    </span>
                  </div>
                  
                  {room.host_id === user.id ? (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleEndRoom(room.id)}
                      className="gap-1"
                    >
                      <X className="w-4 h-4" />
                      Terminer
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      className="bg-orange-500 hover:bg-orange-600 rounded-full"
                      onClick={() => handleJoinRoom(room.id)}
                    >
                      Rejoindre
                    </Button>
                  )}
                </div>

                {/* Participants avatars */}
                <div className="flex items-center mt-4 -space-x-2">
                  {[...Array(Math.min(5, room.participants_count))].map((_, j) => (
                    <div
                      key={j}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-slate-900 flex items-center justify-center text-xs text-white font-medium"
                    >
                      {String.fromCharCode(65 + j)}
                    </div>
                  ))}
                  {room.participants_count > 5 && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-400">
                      +{room.participants_count - 5}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
