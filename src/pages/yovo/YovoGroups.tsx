import { motion } from 'framer-motion';
import { Users, Plus, Lock, Globe, Mic, Crown, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const groups = [
  {
    id: '1',
    name: 'Entrepreneurs Bénin',
    members: 1250,
    isPublic: true,
    category: 'Business',
    lastActive: '5 min',
    hasNewMessages: true,
  },
  {
    id: '2',
    name: 'Agriculteurs du Nord',
    members: 890,
    isPublic: true,
    category: 'Agriculture',
    lastActive: '15 min',
    hasNewMessages: false,
  },
  {
    id: '3',
    name: 'Santé Communautaire',
    members: 456,
    isPublic: false,
    category: 'Santé',
    lastActive: '1h',
    hasNewMessages: true,
  },
  {
    id: '4',
    name: 'Tech & Innovation',
    members: 678,
    isPublic: true,
    category: 'Tech',
    lastActive: '30 min',
    hasNewMessages: false,
  },
];

const myGroups = groups.slice(0, 2);
const suggestedGroups = groups.slice(2);

export default function YovoGroups() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Groupes Vocaux</h2>
        <p className="text-slate-400">Communautés thématiques vocales</p>
      </motion.div>

      {/* Search & Create */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Rechercher un groupe..."
            className="pl-12 bg-slate-900/50 border-white/10 h-12 rounded-xl text-white"
          />
        </div>
        <Button size="icon" className="w-12 h-12 bg-indigo-500 hover:bg-indigo-600">
          <Plus className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* My Groups */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">Mes Groupes</h3>
        <div className="space-y-3">
          {myGroups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center gap-4"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-2xl text-white font-bold">
                {group.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium truncate">{group.name}</p>
                  {group.isPublic ? (
                    <Globe className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {group.members.toLocaleString()} membres • Actif {group.lastActive}
                </p>
              </div>
              {group.hasNewMessages && (
                <div className="w-3 h-3 bg-indigo-500 rounded-full" />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Suggested Groups */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">Suggestions</h3>
        <div className="space-y-3">
          {suggestedGroups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl flex items-center justify-center text-2xl text-white font-bold">
                  {group.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium truncate">{group.name}</p>
                    {group.isPublic ? (
                      <Globe className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {group.members.toLocaleString()} membres
                  </p>
                </div>
                <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                  Rejoindre
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Create group CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl p-4 border border-indigo-500/20"
      >
        <p className="text-center text-slate-300 mb-3">
          Créez votre propre communauté vocale
        </p>
        <Button className="w-full bg-indigo-500 hover:bg-indigo-600 gap-2">
          <Plus className="w-5 h-5" />
          Créer un Groupe
        </Button>
      </motion.div>
    </div>
  );
}
