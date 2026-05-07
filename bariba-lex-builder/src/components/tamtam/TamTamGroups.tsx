import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Crown, Settings, UserPlus, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTamTamGroups, TamTamGroup } from '@/hooks/useTamTamGroups';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const GROUP_CATEGORIES = [
  { id: 'general', label: '💬 Général', color: 'bg-blue-500' },
  { id: 'culture', label: '🎭 Culture', color: 'bg-purple-500' },
  { id: 'sport', label: '⚽ Sport', color: 'bg-green-500' },
  { id: 'music', label: '🎵 Musique', color: 'bg-pink-500' },
  { id: 'tech', label: '💻 Tech', color: 'bg-cyan-500' },
  { id: 'business', label: '💼 Business', color: 'bg-amber-500' },
];

interface TamTamGroupsProps {
  onSelectGroup?: (group: TamTamGroup) => void;
}

export default function TamTamGroups({ onSelectGroup }: TamTamGroupsProps) {
  const { user } = useAuth();
  const { groups, myGroups, loading, createGroup, joinGroup, leaveGroup } = useTamTamGroups();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'my'>('discover');
  
  // Create form state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('general');
  const [isCreating, setIsCreating] = useState(false);

  const filteredGroups = (activeTab === 'discover' ? groups : myGroups).filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({ title: "Erreur", description: "Le nom du groupe est requis", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    const { error } = await createGroup(newGroupName, newGroupDesc, newGroupCategory);
    setIsCreating(false);

    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    } else {
      toast({ title: "Groupe créé !", description: `${newGroupName} est prêt` });
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupCategory('general');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    const { error } = await joinGroup(groupId);
    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    } else {
      toast({ title: "Bienvenue !", description: "Vous avez rejoint le groupe" });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    const { error } = await leaveGroup(groupId);
    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    } else {
      toast({ title: "Groupe quitté", description: "Vous avez quitté le groupe" });
    }
  };

  const getCategoryInfo = (categoryId: string | null) => {
    return GROUP_CATEGORIES.find(c => c.id === categoryId) || GROUP_CATEGORIES[0];
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Groupes
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'discover' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('discover')}
          >
            🔍 Découvrir
          </Button>
          <Button
            variant={activeTab === 'my' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('my')}
          >
            👥 Mes groupes ({myGroups.length})
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un groupe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Groups List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{activeTab === 'discover' ? 'Aucun groupe trouvé' : 'Vous n\'avez pas encore de groupe'}</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const category = getCategoryInfo(group.category);
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl p-4 border shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-14 h-14 rounded-xl">
                      <AvatarImage src={group.cover_url || undefined} />
                      <AvatarFallback className={`${category.color} text-white text-xl rounded-xl`}>
                        {group.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{group.name}</h3>
                        {group.owner_id === user?.id && (
                          <Crown className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.description || 'Pas de description'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {category.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.members_count} membre{(group.members_count || 0) > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {group.is_member ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSelectGroup?.(group)}
                          >
                            Ouvrir
                          </Button>
                          {group.owner_id !== user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => handleLeaveGroup(group.id)}
                            >
                              <LogOut className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleJoinGroup(group.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Rejoindre
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-card rounded-3xl w-full max-w-md p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Créer un groupe</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <Input
                placeholder="Nom du groupe"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />

              <Textarea
                placeholder="Description (optionnel)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                rows={3}
              />

              <div>
                <label className="text-sm font-medium mb-2 block">Catégorie</label>
                <div className="flex flex-wrap gap-2">
                  {GROUP_CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      type="button"
                      variant={newGroupCategory === cat.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewGroupCategory(cat.id)}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateGroup}
                  disabled={isCreating || !newGroupName.trim()}
                >
                  {isCreating ? 'Création...' : 'Créer'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
