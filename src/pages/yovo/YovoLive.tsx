import { motion } from 'framer-motion';
import { Radio, Users, Mic, Plus, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const liveRooms = [
  {
    id: '1',
    title: 'Discussion Santé : Prévention Paludisme',
    host: 'Dr. Aminata',
    participants: 156,
    speakers: 4,
    category: 'Santé',
    isLive: true,
  },
  {
    id: '2',
    title: 'Opportunités Business 2024',
    host: 'Ibrahim Entrepreneur',
    participants: 89,
    speakers: 3,
    category: 'Business',
    isLive: true,
  },
  {
    id: '3',
    title: 'Agriculture : Saison des pluies',
    host: 'Agri Expert',
    participants: 234,
    speakers: 5,
    category: 'Agriculture',
    isLive: true,
  },
];

const upcomingRooms = [
  {
    id: '4',
    title: 'Conseils Finance Mobile',
    host: 'FinanceGuru',
    scheduledFor: '14:00',
    interested: 45,
  },
  {
    id: '5',
    title: 'Traditions Orales du Bénin',
    host: 'Culture Heritage',
    scheduledFor: '16:30',
    interested: 78,
  },
];

export default function YovoLive() {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* Create Room Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button className="w-full h-14 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-2xl text-lg font-semibold gap-2">
          <Plus className="w-5 h-5" />
          Créer une Room Audio
        </Button>
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
        <div className="space-y-4">
          {liveRooms.map((room, i) => (
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
                <Badge variant="outline" className="text-slate-400 border-slate-600">
                  {room.category}
                </Badge>
              </div>
              
              <h4 className="text-white font-semibold text-lg mb-2">{room.title}</h4>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Crown className="w-3 h-3 text-white" />
                </div>
                <span className="text-slate-400 text-sm">{room.host}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {room.participants}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mic className="w-4 h-4" />
                    {room.speakers} speakers
                  </span>
                </div>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 rounded-full">
                  Rejoindre
                </Button>
              </div>

              {/* Participants avatars */}
              <div className="flex items-center mt-4 -space-x-2">
                {[...Array(5)].map((_, j) => (
                  <div
                    key={j}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-slate-900 flex items-center justify-center text-xs text-white font-medium"
                  >
                    {String.fromCharCode(65 + j)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-400">
                  +{room.participants - 5}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Upcoming */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Programmé</h3>
        <div className="space-y-3">
          {upcomingRooms.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-white">{room.title}</p>
                <p className="text-sm text-slate-500">
                  {room.host} · Aujourd'hui à {room.scheduledFor}
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10">
                Rappel
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
