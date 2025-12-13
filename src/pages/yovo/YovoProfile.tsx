import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Edit, Play, Grid, Mic, Heart, Users, MapPin, Calendar, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useYovoProfile } from '@/hooks/useYovoProfile';
import { useToast } from '@/hooks/use-toast';

const badges = [
  { icon: '🎤', name: 'Créateur Vocal', color: 'from-orange-500 to-pink-500' },
  { icon: '⭐', name: 'Top Contributeur', color: 'from-yellow-500 to-orange-500' },
  { icon: '💎', name: 'Premium', color: 'from-blue-500 to-purple-500' },
];

export default function YovoProfile() {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useYovoProfile();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    location: ''
  });

  const handleStartEdit = () => {
    setEditForm({
      display_name: profile?.display_name || '',
      location: profile?.location || ''
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const result = await updateProfile(editForm);
    if (result.error) {
      toast({ title: 'Erreur', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Profil mis à jour!' });
      setIsEditing(false);
    }
  };

  if (!user) {
    return (
      <div className="px-4 py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
          <Users className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Créez votre profil</h2>
        <p className="text-slate-400 mb-4">Rejoignez la communauté YOVO</p>
        <Link to="/yovo/auth">
          <Button className="bg-gradient-to-r from-orange-500 to-pink-500">
            S'inscrire / Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Cover & Avatar */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-orange-500/30 via-pink-500/30 to-purple-500/30" />
        <div className="absolute -bottom-12 left-4 right-4 flex items-end justify-between">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 p-1">
              <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-3xl text-white font-bold">
                {profile?.display_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
            <Button 
              size="icon" 
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 border border-white/20"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 mb-2">
            <Link to="/yovo/settings">
              <Button size="icon" variant="outline" className="border-white/20 bg-slate-950/50 backdrop-blur-sm">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button 
              size="icon" 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={isEditing ? handleSaveProfile : handleStartEdit}
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-16 space-y-4">
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <Input
              placeholder="Nom d'affichage"
              value={editForm.display_name}
              onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
              className="bg-slate-900/50 border-white/10 text-white"
            />
            <Input
              placeholder="Localisation"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              className="bg-slate-900/50 border-white/10 text-white"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} className="flex-1 bg-green-500 hover:bg-green-600">
                Enregistrer
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1 border-slate-600">
                Annuler
              </Button>
            </div>
          </motion.div>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">
                  {profile?.display_name || profile?.username || 'Utilisateur YOVO'}
                </h2>
                {profile?.is_verified && (
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <p className="text-slate-500">@{profile?.username || 'user'}</p>
            </div>

            {/* Bio audio */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/50 rounded-xl p-4 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <Button size="icon" className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500">
                  <Play className="w-4 h-4 text-white ml-0.5" />
                </Button>
                <div className="flex-1">
                  <p className="text-sm text-slate-400">Bio vocale</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-orange-500 to-pink-500 rounded-full"
                        style={{ height: `${4 + Math.sin(i * 0.5) * 8}px` }}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-slate-500">0:15</span>
              </div>
            </motion.div>

            {/* Details */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              {profile?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Membre depuis {new Date(profile?.created_at || '').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              {badges.map((badge) => (
                <div
                  key={badge.name}
                  className={`bg-gradient-to-r ${badge.color} p-0.5 rounded-lg`}
                >
                  <div className="bg-slate-950 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                    <span>{badge.icon}</span>
                    <span className="text-xs text-white">{badge.name}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="flex justify-around py-4 bg-slate-900/50 rounded-xl border border-white/5">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{profile?.posts_count || 0}</p>
                <p className="text-sm text-slate-500">Posts</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{profile?.followers_count || 0}</p>
                <p className="text-sm text-slate-500">Abonnés</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{profile?.following_count || 0}</p>
                <p className="text-sm text-slate-500">Abonnements</p>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full bg-slate-900/50 border border-white/5 rounded-xl p-1">
            <TabsTrigger value="posts" className="flex-1 gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <Grid className="w-4 h-4" /> Posts
            </TabsTrigger>
            <TabsTrigger value="recordings" className="flex-1 gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <Mic className="w-4 h-4" /> Vocaux
            </TabsTrigger>
            <TabsTrigger value="likes" className="flex-1 gap-2 data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <Heart className="w-4 h-4" /> Likes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            <div className="text-center py-8 text-slate-500">
              Aucun post pour le moment
            </div>
          </TabsContent>

          <TabsContent value="recordings" className="mt-4">
            <div className="text-center py-8 text-slate-500">
              Aucun enregistrement sauvegardé
            </div>
          </TabsContent>

          <TabsContent value="likes" className="mt-4">
            <div className="text-center py-8 text-slate-500">
              Aucun like pour le moment
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
