import { motion } from 'framer-motion';
import { Search, TrendingUp, Users, Mic, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const trendingTopics = [
  { tag: '#AgricultureDurable', posts: '2.5K posts', trend: '+45%' },
  { tag: '#SantéLocale', posts: '1.8K posts', trend: '+32%' },
  { tag: '#EmploiJeunes', posts: '3.2K posts', trend: '+67%' },
  { tag: '#TechAfrique', posts: '980 posts', trend: '+28%' },
];

const suggestedUsers = [
  { name: 'Dr. Konaté', role: 'Médecin généraliste', followers: '12K', verified: true },
  { name: 'Agri Solutions', role: 'Conseil agricole', followers: '8.5K', verified: true },
  { name: 'Job Connect', role: 'Recrutement', followers: '15K', verified: true },
];

const categories = [
  { name: 'Santé', icon: '🏥', color: 'from-red-500/20 to-pink-500/20', count: 156 },
  { name: 'Agriculture', icon: '🌾', color: 'from-green-500/20 to-emerald-500/20', count: 234 },
  { name: 'Business', icon: '💼', color: 'from-blue-500/20 to-cyan-500/20', count: 89 },
  { name: 'Éducation', icon: '📚', color: 'from-purple-500/20 to-violet-500/20', count: 178 },
  { name: 'Finance', icon: '💰', color: 'from-yellow-500/20 to-orange-500/20', count: 67 },
  { name: 'Culture', icon: '🎭', color: 'from-pink-500/20 to-rose-500/20', count: 123 },
];

export default function YovoDiscover() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <Input
          placeholder="Rechercher des contenus vocaux..."
          className="pl-12 bg-slate-900/50 border-white/10 h-12 rounded-xl text-white placeholder:text-slate-500"
        />
        <Mic className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 cursor-pointer hover:text-orange-300" />
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          Catégories
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-gradient-to-br ${cat.color} p-4 rounded-xl border border-white/10 cursor-pointer hover:scale-105 transition-transform`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <p className="text-white font-medium mt-2">{cat.name}</p>
              <p className="text-xs text-slate-400">{cat.count} posts</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Trending */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          Tendances
        </h3>
        <div className="space-y-3">
          {trendingTopics.map((topic, i) => (
            <motion.div
              key={topic.tag}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <p className="font-medium text-white">{topic.tag}</p>
                <p className="text-sm text-slate-500">{topic.posts}</p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {topic.trend}
              </Badge>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Suggested Users */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-400" />
          Suggestions
        </h3>
        <div className="space-y-3">
          {suggestedUsers.map((user, i) => (
            <motion.div
              key={user.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {user.name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-medium text-white">{user.name}</p>
                    {user.verified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{user.role}</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-sm font-medium transition-colors">
                Suivre
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
