import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StoryBuilder from './StoryBuilder';
import BranchingPlayer from './BranchingPlayer';
import { createStory, publishStory } from '../services/storyGraphApi';
import type { StoryGraph } from '../types/story.types';
import { toast } from 'sonner';
import { loadDemoStory } from '../data/demoStory';

type StudioView = 'home' | 'builder' | 'player';

export default function ConteVivantStudio() {
  const [view, setView] = useState<StudioView>('home');
  const [playingGraph, setPlayingGraph] = useState<StoryGraph | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Stats dashboard
  const { data: stats } = useQuery({
    queryKey: ['conte-vivant-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('anime_scene_library')
        .select('consistency_score, asset_type, generation_metadata');
      const total = data?.length || 0;
      const avgConsistency = total > 0
        ? (data?.reduce((sum, item) => sum + (Number((item as any).consistency_score) || 0), 0) || 0) / total
        : 0;
      const videos = data?.filter(item => item.asset_type === 'video').length || 0;
      return { total, avgConsistency, videos, photos: total - videos };
    },
    staleTime: 60_000,
  });

  const handlePublish = async (graph: StoryGraph, title: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Connecte-toi pour publier un conte');
        return;
      }

      const totalSegments = Object.keys(graph.segments).length;
      const totalEndings = Object.values(graph.segments).filter(s => s.is_ending).length;

      const story = await createStory({
        creator_id: user.id,
        title: title || 'Conte sans titre',
        description,
        graph,
        total_segments: totalSegments,
        total_endings: totalEndings,
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
    } catch (err) {
      toast.error('Erreur chargement démo');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#08080c' }}>
      <AnimatePresence mode="wait">
        {/* HOME */}
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 gap-6"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #F5A623, #FF8C00)', boxShadow: '0 10px 40px #F5A62340' }}
            >
              <span className="text-5xl">🎪</span>
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Conte Vivant</h1>
              <p className="text-sm text-white/50 mt-1">
                Storytelling interactif à embranchements
              </p>
            </div>

            {/* Stats dashboard */}
            {stats && stats.total > 0 && (
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)' }}>
                  <p className="text-lg font-bold text-white">{stats.total}</p>
                  <p className="text-[10px] text-white/40">Assets</p>
                </div>
                <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <p className="text-lg font-bold text-white">{Math.round(stats.avgConsistency * 100)}%</p>
                  <p className="text-[10px] text-white/40">Cohérence</p>
                </div>
                <div className="text-center p-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                  <p className="text-lg font-bold text-white">{stats.videos}</p>
                  <p className="text-[10px] text-white/40">Vidéos</p>
                </div>
              </div>
            )}

            {/* Main actions */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setView('builder')}
                className="group relative p-5 rounded-2xl border-2 transition-all text-left"
                style={{ background: '#1a1a2a', borderColor: '#333' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#F5A623')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✏️</span>
                  <div>
                    <p className="font-bold text-white">Créer un conte</p>
                    <p className="text-xs text-white/40">Nouveau conte interactif avec IA</p>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
                  style={{ boxShadow: '0 0 30px rgba(245,166,35,0.15)' }}
                />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePlayDemo}
                disabled={loadingDemo}
                className="group relative p-5 rounded-2xl border-2 transition-all text-left"
                style={{ background: '#1a1a2a', borderColor: '#333' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#F5A623')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{loadingDemo ? '⚙️' : '▶️'}</span>
                  <div>
                    <p className="font-bold text-white">{loadingDemo ? 'Chargement...' : 'Démo interactive'}</p>
                    <p className="text-xs text-white/40">
                      {loadingDemo ? 'Préparation des segments...' : 'Essayer le conte démo'}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
                  style={{ boxShadow: '0 0 30px rgba(245,166,35,0.15)' }}
                />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group relative p-5 rounded-2xl border-2 transition-all text-left"
                style={{ background: '#1a1a2a', borderColor: '#333' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#F5A623')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📚</span>
                  <div>
                    <p className="font-bold text-white">Mes contes</p>
                    <p className="text-xs text-white/40">Contes sauvegardés</p>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none"
                  style={{ boxShadow: '0 0 30px rgba(245,166,35,0.15)' }}
                />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* BUILDER */}
        {view === 'builder' && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1"
          >
            <StoryBuilder
              onPublish={handlePublish}
              onCancel={() => setView('home')}
            />
          </motion.div>
        )}

        {/* PLAYER */}
        {view === 'player' && playingGraph && (
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 relative"
          >
            <BranchingPlayer
              graph={playingGraph}
              onClose={() => {
                setView('home');
                setPlayingGraph(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
