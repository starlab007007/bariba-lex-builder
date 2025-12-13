import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Play, Pause, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const mockPosts = [
  {
    id: '1',
    user: { name: 'Aminata Koné', username: '@aminata', avatar: '', verified: true },
    duration: 45,
    transcript: 'Bonjour à tous ! Aujourd\'hui je partage mon expérience sur le marché local...',
    likes: 234,
    comments: 45,
    shares: 12,
    time: '2h',
  },
  {
    id: '2',
    user: { name: 'Ibrahim Diallo', username: '@ibrahim_d', avatar: '', verified: false },
    duration: 120,
    transcript: 'Discussion sur les opportunités d\'emploi dans le secteur agricole...',
    likes: 156,
    comments: 28,
    shares: 8,
    time: '4h',
  },
  {
    id: '3',
    user: { name: 'Fatou Sow', username: '@fatou_sow', avatar: '', verified: true },
    duration: 60,
    transcript: 'Conseils santé : Comment prévenir le paludisme pendant la saison des pluies...',
    likes: 567,
    comments: 89,
    shares: 45,
    time: '6h',
  },
];

export default function YovoFeed() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Create post button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-2xl p-4 border border-orange-500/20"
      >
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12 ring-2 ring-orange-500/50">
            <AvatarFallback className="bg-slate-800 text-orange-400">U</AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            className="flex-1 justify-start text-slate-400 bg-slate-800/50 hover:bg-slate-800 rounded-xl h-12"
          >
            <Mic className="w-5 h-5 mr-2 text-orange-400" />
            Enregistrer un message vocal...
          </Button>
        </div>
      </motion.div>

      {/* Posts */}
      {mockPosts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.user.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-500 text-white">
                  {post.user.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-white">{post.user.name}</span>
                  {post.user.verified && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-slate-500">{post.user.username} · {post.time}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-slate-400">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>

          {/* Audio player */}
          <div className="px-4 pb-4">
            <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <Button
                  size="icon"
                  onClick={() => setPlayingId(playingId === post.id ? null : post.id)}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                >
                  {playingId === post.id ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </Button>
                <div className="flex-1">
                  {/* Waveform visualization */}
                  <div className="flex items-center gap-0.5 h-8">
                    {[...Array(40)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-gradient-to-t from-orange-500 to-pink-500 rounded-full"
                        animate={{
                          height: playingId === post.id
                            ? `${Math.random() * 100}%`
                            : `${30 + Math.sin(i * 0.5) * 20}%`,
                        }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>0:00</span>
                    <span>{Math.floor(post.duration / 60)}:{(post.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-400 line-clamp-2">{post.transcript}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 flex items-center justify-between">
            <Button variant="ghost" className="text-slate-400 hover:text-red-400 gap-2">
              <Heart className="w-5 h-5" />
              <span>{post.likes}</span>
            </Button>
            <Button variant="ghost" className="text-slate-400 hover:text-blue-400 gap-2">
              <MessageCircle className="w-5 h-5" />
              <span>{post.comments}</span>
            </Button>
            <Button variant="ghost" className="text-slate-400 hover:text-green-400 gap-2">
              <Share2 className="w-5 h-5" />
              <span>{post.shares}</span>
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
