import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StoryBuilder from './StoryBuilder';
import BranchingPlayer from './BranchingPlayer';
import { createStory, publishStory } from '../services/storyGraphApi';
import type { StoryGraph } from '../types/story.types';
import { toast } from 'sonner';
import { loadDemoStory } from '../data/demoStory';

type StudioView = 'home' | 'builder' | 'player' | 'my-stories';

export default function ConteVivantStudio() {
  const [view, setView] = useState<StudioView>('home');
  const [playingGraph, setPlayingGraph] = useState<StoryGraph | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['conte-vivant-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime_scene_library')
        .select('consistency_score, asset_type');
      if (error) throw error;
      const total = data?.length || 0;
      const avgConsistency = total > 0
        ? data.reduce((sum, item) => sum + (Number(item.consistency_score) || 0), 0) / total
        : 0;
      const videos = data?.filter(item => item.asset_type === 'video').length || 0;
      return { total, avgConsistency, videos, photos: total - videos };
    },
    staleTime: 60_000,
  });

  // Fetch user stories
  const { data: myStories } = useQuery({
    queryKey: ['my-conte-vivant-stories'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from('conte_vivant_stories')
        .select('id, title, status, total_segments, total_endings, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const handlePublish = async (graph: StoryGraph, title: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Connecte-toi pour publier'); return; }
      const totalSegments = Object.keys(graph.segments).length;
      const totalEndings = Object.values(graph.segments).filter(s => s.is_ending).length;
      const story = await createStory({
        creator_id: user.id, title: title || 'Conte sans titre', description, graph,
        total_segments: totalSegments, total_endings: totalEndings,
      });
      await publishStory(story.id);
      toast.success('🎪 Conte publié avec succès !');
      setView('home');
    } catch (err: any) {
      toast.error('Erreur : ' + (err.message || 'Publication échouée'));
    }
  };

  const handlePlayDemo = async () => {
    setLoadingDemo(true);
    try {
      const story = await loadDemoStory();
      setPlayingGraph(story);
      setView('player');
    } catch { toast.error('Erreur chargement démo'); }
    finally { setLoadingDemo(false); }
  };

  const handlePlayStory = async (storyId: string) => {
    try {
      const { data } = await supabase.from('conte_vivant_stories').select('graph').eq('id', storyId).single();
      if (data?.graph) {
        setPlayingGraph(data.graph as unknown as StoryGraph);
        setView('player');
      }
    } catch { toast.error('Erreur chargement du conte'); }
  };

  return (
    <div className="w-full h-[100dvh] flex flex-col" style={{ backgroundColor: '#08080c' }}>
      <AnimatePresence mode="wait">
        {/* HOME */}
        {view === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto flex flex-col items-center p-6 gap-6 pt-12">
            {/* Logo */}
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #F5A623, #FF8C00)', boxShadow: '0 10px 40px #F5A62340' }}>
              <span className="text-5xl">🎪</span>
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Conte Vivant</h1>
              <p className="text-sm text-white/70 mt-1">Storytelling interactif à embranchements</p>
            </div>

            {/* Stats dashboard */}
            {stats && stats.total > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-xs">
                <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>
                  <p className="text-lg font-bold text-white">{stats.total}</p>
                  <p className="text-xs text-white/70">Assets</p>
                </div>
                <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-lg font-bold text-white">{Math.round(stats.avgConsistency * 100)}%</p>
                  <p className="text-xs text-white/70">Cohérence</p>
                </div>
                <div className="text-center p-3 rounded-xl col-span-2 sm:col-span-1" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <p className="text-lg font-bold text-white">{stats.videos}</p>
                  <p className="text-xs text-white/70">Vidéos</p>
                </div>
              </div>
            )}

            {/* Main actions */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {[
                { icon: '✏️', label: 'Créer un conte', sub: 'Nouveau conte interactif avec IA', onClick: () => setView('builder') },
                { icon: loadingDemo ? '⚙️' : '▶️', label: loadingDemo ? 'Chargement...' : 'Démo interactive', sub: loadingDemo ? 'Préparation...' : 'Essayer le conte démo', onClick: handlePlayDemo, disabled: loadingDemo },
                { icon: '📚', label: 'Mes contes', sub: `${myStories?.length || 0} conte(s) sauvegardé(s)`, onClick: () => setView('my-stories') },
              ].map((action, i) => (
                <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={action.onClick} disabled={action.disabled}
                  className="group relative p-5 rounded-2xl border-2 transition-all text-left min-h-[44px]"
                  style={{ background: '#1a1a2a', borderColor: '#444' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{action.icon}</span>
                    <div>
                      <p className="font-bold text-white">{action.label}</p>
                      <p className="text-xs text-white/60">{action.sub}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* MY STORIES */}
        {view === 'my-stories' && (
          <motion.div key="my-stories" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">📚 Mes contes</h2>
              <Button variant="ghost" size="sm" onClick={() => setView('home')} className="text-white/70">← Retour</Button>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {(!myStories || myStories.length === 0) ? (
                <div className="text-center py-12">
                  <p className="text-white/60 text-sm">Aucun conte créé pour l'instant</p>
                  <Button className="mt-4" onClick={() => setView('builder')}>✏️ Créer mon premier conte</Button>
                </div>
              ) : (
                myStories.map(story => (
                  <div key={story.id} className="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{story.title}</p>
                      <p className="text-xs text-white/60">{story.total_segments} segments · {story.total_endings} fins · {story.status}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handlePlayStory(story.id)}
                      className="gap-1.5 min-h-[44px] text-white border-white/20">
                      ▶️ Jouer
                    </Button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* BUILDER */}
        {view === 'builder' && (
          <motion.div key="builder" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col min-h-0">
            <StoryBuilder onPublish={handlePublish} onCancel={() => setView('home')} />
          </motion.div>
        )}

        {/* PLAYER */}
        {view === 'player' && playingGraph && (
          <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 relative">
            <BranchingPlayer graph={playingGraph} onClose={() => { setView('home'); setPlayingGraph(null); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
