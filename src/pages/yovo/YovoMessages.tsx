import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Edit, Play, Pause, Check, CheckCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const conversations = [
  {
    id: '1',
    user: { name: 'Aminata Koné', avatar: '', online: true },
    lastMessage: { duration: 15, isRead: false, isSent: false },
    time: '2min',
    unread: 3,
  },
  {
    id: '2',
    user: { name: 'Ibrahim Diallo', avatar: '', online: false },
    lastMessage: { duration: 45, isRead: true, isSent: true },
    time: '1h',
    unread: 0,
  },
  {
    id: '3',
    user: { name: 'Groupe Agritech', avatar: '', online: true, isGroup: true },
    lastMessage: { duration: 30, isRead: true, isSent: false },
    time: '3h',
    unread: 12,
  },
  {
    id: '4',
    user: { name: 'Dr. Fatou', avatar: '', online: false },
    lastMessage: { duration: 60, isRead: true, isSent: true },
    time: 'Hier',
    unread: 0,
  },
];

export default function YovoMessages() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Rechercher une conversation..."
            className="pl-12 bg-slate-900/50 border-white/10 h-12 rounded-xl text-white placeholder:text-slate-500"
          />
        </div>
        <Button size="icon" className="w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-xl">
          <Edit className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Conversations */}
      <div className="space-y-2">
        {conversations.map((conv, i) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
          >
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-14 h-14">
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-pink-500 text-white text-lg">
                  {conv.user.name[0]}
                </AvatarFallback>
              </Avatar>
              {conv.user.online && (
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white truncate">{conv.user.name}</span>
                <span className="text-xs text-slate-500">{conv.time}</span>
              </div>
              
              {/* Audio preview */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlayingId(playingId === conv.id ? null : conv.id);
                  }}
                  className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"
                >
                  {playingId === conv.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                
                {/* Mini waveform */}
                <div className="flex items-center gap-0.5 flex-1">
                  {[...Array(20)].map((_, j) => (
                    <div
                      key={j}
                      className="w-1 bg-slate-600 rounded-full"
                      style={{ height: `${8 + Math.sin(j * 0.8) * 6}px` }}
                    />
                  ))}
                </div>
                
                <span className="text-xs text-slate-500">
                  0:{conv.lastMessage.duration.toString().padStart(2, '0')}
                </span>
                
                {conv.lastMessage.isSent && (
                  conv.lastMessage.isRead ? (
                    <CheckCheck className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Check className="w-4 h-4 text-slate-500" />
                  )
                )}
              </div>
            </div>

            {/* Unread badge */}
            {conv.unread > 0 && (
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                {conv.unread}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
