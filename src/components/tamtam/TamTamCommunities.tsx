import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Mic, Search, Music, Theater, Briefcase, Heart, 
  Gamepad2, BookOpen, Utensils, Sparkles, Volume2, Check, Crown,
  MessageCircle, Settings
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useTamTamCommunities, TamTamGroup } from '@/hooks/useTamTamCommunities';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import TamTamCommunityChat from './TamTamCommunityChat';

const CATEGORIES = [
  { id: 'all', icon: Sparkles, label: 'Tout', color: 'from-gray-400 to-gray-600' },
  { id: 'culture', icon: Theater, label: 'Culture', color: 'from-purple-400 to-purple-600' },
  { id: 'music', icon: Music, label: 'Musique', color: 'from-pink-400 to-pink-600' },
  { id: 'business', icon: Briefcase, label: 'Business', color: 'from-blue-400 to-blue-600' },
  { id: 'health', icon: Heart, label: 'Santé', color: 'from-red-400 to-red-600' },
  { id: 'gaming', icon: Gamepad2, label: 'Jeux', color: 'from-green-400 to-green-600' },
  { id: 'education', icon: BookOpen, label: 'Éducation', color: 'from-yellow-400 to-yellow-600' },
  { id: 'food', icon: Utensils, label: 'Cuisine', color: 'from-orange-400 to-orange-600' },
];

export function TamTamCommunities() {
  const { 
    groups, myGroups, loading, createGroup, joinGroup, leaveGroup, isMember 
  } = useTamTamCommunities();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<TamTamGroup | null>(null);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityCategory, setNewCommunityCategory] = useState('culture');
  const [isRecordingDescription, setIsRecordingDescription] = useState(false);

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateCommunity = async (descriptionAudio?: string) => {
    if (!newCommunityName.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }

    triggerFeedback('success');
    const { error } = await createGroup(
      newCommunityName,
      undefined,
      newCommunityCategory,
      true
    );

    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    } else {
      toast({ title: "✅ Communauté créée !" });
      setShowCreateModal(false);
      setNewCommunityName('');
    }
  };

  const handleJoinLeave = async (community: TamTamGroup) => {
    triggerFeedback('notification');
    if (isMember(community.id)) {
      await leaveGroup(community.id);
      toast({ title: "Communauté quittée" });
    } else {
      await joinGroup(community.id);
      toast({ title: "✅ Vous avez rejoint la communauté !" });
    }
  };

  const handleOpenChat = (community: TamTamGroup) => {
    triggerFeedback('notification');
    setSelectedCommunity(community);
  };

  if (selectedCommunity) {
    return (
      <TamTamCommunityChat
        community={selectedCommunity}
        onClose={() => setSelectedCommunity(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* Header */}
      <div className="p-4 bg-white border-b">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher une communauté..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-gray-200"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{cat.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* My Communities */}
      {myGroups.length > 0 && (
        <div className="p-4 bg-white border-b">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">MES COMMUNAUTÉS</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {myGroups.map((community) => (
              <motion.button
                key={community.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleOpenChat(community)}
                className="flex flex-col items-center gap-2 min-w-[80px]"
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 ring-2 ring-blue-500">
                    <AvatarImage src={community.cover_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                      {community.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <span className="text-xs text-gray-600 truncate max-w-[80px]">{community.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Community List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune communauté trouvée</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium"
            >
              Créer une communauté
            </motion.button>
          </div>
        ) : (
          filteredGroups.map((community) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={community.cover_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-xl">
                    {community.name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-800 truncate">{community.name}</h4>
                    {community.is_public === false && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{community.description || 'Communauté vocale'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {community.members_count} membres
                    </span>
                    {community.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {community.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {isMember(community.id) ? (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleOpenChat(community)}
                        className="p-2 bg-blue-500 text-white rounded-xl"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleJoinLeave(community)}
                        className="p-2 bg-gray-100 rounded-xl"
                      >
                        <Settings className="w-5 h-5 text-gray-600" />
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleJoinLeave(community)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium"
                    >
                      Rejoindre
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Créer une communauté</h3>

              <Input
                placeholder="Nom de la communauté"
                value={newCommunityName}
                onChange={(e) => setNewCommunityName(e.target.value)}
                className="mb-4 rounded-xl"
              />

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600 mb-2 block">Catégorie</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.slice(1).map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewCommunityCategory(cat.id)}
                        className={`p-3 rounded-xl flex flex-col items-center gap-1 ${
                          newCommunityCategory === cat.id
                            ? `bg-gradient-to-r ${cat.color} text-white`
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{cat.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600 mb-2 block">Description vocale (optionnel)</label>
              <div className="bg-gray-50 rounded-xl p-4">
                <SmartVoiceRecorder
                  onRecordingComplete={(audio) => {
                    setIsRecordingDescription(false);
                  }}
                />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCreateCommunity()}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold"
              >
                Créer la communauté
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TamTamCommunities;
