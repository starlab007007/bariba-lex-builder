import { motion } from 'framer-motion';
import { Settings, Edit, Play, Grid, Mic, Heart, Users, MapPin, Calendar, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';

const stats = [
  { label: 'Posts', value: '156' },
  { label: 'Abonnés', value: '2.4K' },
  { label: 'Abonnements', value: '892' },
];

const posts = [
  { id: '1', duration: 45, likes: 234, plays: 1200 },
  { id: '2', duration: 120, likes: 156, plays: 890 },
  { id: '3', duration: 60, likes: 567, plays: 2300 },
  { id: '4', duration: 30, likes: 89, plays: 450 },
  { id: '5', duration: 90, likes: 345, plays: 1500 },
  { id: '6', duration: 45, likes: 123, plays: 670 },
];

const badges = [
  { icon: '🎤', name: 'Créateur Vocal', color: 'from-orange-500 to-pink-500' },
  { icon: '⭐', name: 'Top Contributeur', color: 'from-yellow-500 to-orange-500' },
  { icon: '💎', name: 'Premium', color: 'from-blue-500 to-purple-500' },
];

export default function YovoProfile() {
  return (
    <div className="pb-6">
      {/* Cover & Avatar */}
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-orange-500/30 via-pink-500/30 to-purple-500/30" />
        <div className="absolute -bottom-12 left-4 right-4 flex items-end justify-between">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 p-1">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-3xl text-white font-bold">
              U
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <Link to="/yovo/settings">
              <Button size="icon" variant="outline" className="border-white/20 bg-slate-950/50 backdrop-blur-sm">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="icon" className="bg-orange-500 hover:bg-orange-600">
              <Edit className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-16 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Utilisateur YOVO</h2>
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          </div>
          <p className="text-slate-500">@user_yovo</p>
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
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Cotonou, Bénin
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" /> Membre depuis Jan 2024
          </span>
        </div>

        {/* Badges */}
        <div className="flex gap-2">
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
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

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
            <div className="grid grid-cols-3 gap-2">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  whileHover={{ scale: 1.05 }}
                  className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/5 flex flex-col items-center justify-center cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center mb-2">
                    <Play className="w-5 h-5 text-orange-400 ml-0.5" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {Math.floor(post.duration / 60)}:{(post.duration % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    ❤️ {post.likes}
                  </p>
                </motion.div>
              ))}
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
