import { motion } from 'framer-motion';
import { BookOpen, Play, Pause, Headphones, Heart, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const categories = ['Tout', 'Contes', 'Histoire', 'Éducation', 'Langues', 'Religion'];

const content = [
  {
    id: '1',
    title: 'Contes du Bénin',
    author: 'Traditions Orales',
    duration: '45 min',
    category: 'Contes',
    plays: '12.5K',
    image: '📚',
  },
  {
    id: '2',
    title: 'Histoire du Dahomey',
    author: 'Prof. Adandé',
    duration: '1h 30',
    category: 'Histoire',
    plays: '8.2K',
    image: '🏛️',
  },
  {
    id: '3',
    title: 'Apprendre le Bariba',
    author: 'Linguiste Expert',
    duration: '2h',
    category: 'Langues',
    plays: '25K',
    image: '🗣️',
  },
  {
    id: '4',
    title: 'Proverbes Yoruba',
    author: 'Sagesse Ancestrale',
    duration: '35 min',
    category: 'Contes',
    plays: '6.8K',
    image: '✨',
  },
];

export default function YovoLibrary() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Bibliothèque</h2>
        <p className="text-slate-400">Audiobooks et traditions orales</p>
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      >
        {categories.map((cat, i) => (
          <button
            key={cat}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              i === 0
                ? 'bg-purple-500 text-white'
                : 'bg-slate-900/50 text-slate-400 border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </motion.div>

      {/* Featured */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl p-4 border border-purple-500/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center text-3xl">
            📖
          </div>
          <div className="flex-1">
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 mb-2">
              En vedette
            </Badge>
            <p className="text-white font-semibold">Mythes et Légendes du Bénin</p>
            <p className="text-sm text-slate-400">Collection complète • 3h 45min</p>
          </div>
          <Button size="icon" className="w-12 h-12 rounded-full bg-purple-500">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </Button>
        </div>
      </motion.div>

      {/* Content list */}
      <div className="space-y-3">
        {content.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg flex items-center justify-center text-2xl">
              {item.image}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{item.title}</p>
              <p className="text-sm text-slate-500">{item.author}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.duration}
                </span>
                <span className="flex items-center gap-1">
                  <Headphones className="w-3 h-3" />
                  {item.plays}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="text-slate-400">
                <Heart className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                onClick={() => setPlayingId(playingId === item.id ? null : item.id)}
                className="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-600"
              >
                {playingId === item.id ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
