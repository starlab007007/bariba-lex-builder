import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StoryBuilder from './StoryBuilder';
import BranchingPlayer from './BranchingPlayer';
import { createStory, publishStory } from '../services/storyGraphApi';
import type { StoryGraph } from '../types/story.types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { loadDemoStory } from '../data/demoStory';

type StudioView = 'home' | 'builder' | 'player';

export default function ConteVivantStudio() {
  const [view, setView] = useState<StudioView>('home');
  const [playingGraph, setPlayingGraph] = useState<StoryGraph | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

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

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                onClick={() => setView('builder')}
                size="lg"
                className="w-full gap-2"
                style={{ backgroundColor: '#F5A623', color: '#08080c' }}
              >
                <Plus className="w-5 h-5" />
                Créer un conte
              </Button>

              <Button
                onClick={handlePlayDemo}
                variant="outline"
                size="lg"
                className="w-full gap-2 border-white/20 text-white hover:bg-white/10"
                disabled={loadingDemo}
              >
                <Play className="w-5 h-5" />
                {loadingDemo ? '⏳ Chargement...' : '🎭 Démo interactive'}
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className="w-full gap-2 text-white/60 hover:text-white hover:bg-white/5"
              >
                <BookOpen className="w-5 h-5" />
                Mes contes
              </Button>
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
