import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StoryBuilder from './StoryBuilder';
import BranchingPlayer from './BranchingPlayer';
import { createStory, publishStory } from '../services/storyGraphApi';
import type { StoryGraph } from '../types/story.types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type StudioView = 'home' | 'builder' | 'player';

export default function ConteVivantStudio() {
  const [view, setView] = useState<StudioView>('home');
  const [playingGraph, setPlayingGraph] = useState<StoryGraph | null>(null);
  const [playingStoryId, setPlayingStoryId] = useState<string>('');

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

  const handlePlayDemo = () => {
    // Demo graph for testing
    const demoGraph: StoryGraph = {
      entry_segment: 'intro',
      segments: {
        intro: {
          id: 'intro',
          title: 'Le village endormi',
          text_content: 'Le village est plongé dans un sommeil magique. Un bruit étrange vient de la forêt...',
          duration: 10,
          is_choice_point: true,
          choices: [
            { id: 'go_forest', label: 'Aller dans la forêt', icon: '🌳', next_segment: 'forest', is_default: true },
            { id: 'stay_village', label: 'Rester au village', icon: '🏘️', next_segment: 'village', is_default: false },
          ],
          is_ending: false,
        },
        forest: {
          id: 'forest',
          title: 'La forêt enchantée',
          text_content: 'Tu découvres une créature magique qui garde un trésor ancien...',
          duration: 10,
          is_choice_point: false,
          choices: [],
          is_ending: true,
          ending_badge: '🌟',
          ending_title: 'L\'Explorateur',
        },
        village: {
          id: 'village',
          title: 'Le secret du village',
          text_content: 'En cherchant dans le village, tu trouves une carte ancienne cachée sous la fontaine...',
          duration: 10,
          is_choice_point: false,
          choices: [],
          is_ending: true,
          ending_badge: '🗺️',
          ending_title: 'Le Sage',
        },
      },
    };
    setPlayingGraph(demoGraph);
    setPlayingStoryId('demo');
    setView('player');
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
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
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30"
            >
              <span className="text-5xl">🎪</span>
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Conte Vivant</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Storytelling interactif à embranchements
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                onClick={() => setView('builder')}
                size="lg"
                className="w-full gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer un conte
              </Button>

              <Button
                onClick={handlePlayDemo}
                variant="outline"
                size="lg"
                className="w-full gap-2"
              >
                <Play className="w-5 h-5" />
                Démo interactive
              </Button>

              <Button
                variant="ghost"
                size="lg"
                className="w-full gap-2"
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
              storyId={playingStoryId}
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
