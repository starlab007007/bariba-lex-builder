/**
 * SceneEditor — Interactive scene-by-scene script editor
 * Each sentence = one scene. Users can edit text, pick emotion/voice,
 * generate TTS narration per scene, and reorder scenes.
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Merge, Sparkles,
  Smile, Cloud, Zap, Eye, Moon, Flame, Heart,
  Mic, Play, Pause, Loader2, VolumeX
} from 'lucide-react';
import type { NarratorVoice } from '@/features/conte-vivant/types/story.types';

export interface EditableScene {
  id: string;
  text: string;
  emotion: string;
  sceneType?: string;
  voice?: NarratorVoice;
  audioBase64?: string;
  audioUrl?: string;
  isGeneratingAudio?: boolean;
}

const EMOTIONS = [
  { value: 'joy', label: 'Joie', emoji: '😊', icon: Smile, color: 'text-yellow-400' },
  { value: 'sadness', label: 'Tristesse', emoji: '😢', icon: Cloud, color: 'text-blue-400' },
  { value: 'wonder', label: 'Mystère', emoji: '✨', icon: Eye, color: 'text-purple-400' },
  { value: 'excitement', label: 'Action', emoji: '⚡', icon: Zap, color: 'text-orange-400' },
  { value: 'peace', label: 'Sagesse', emoji: '🕊️', icon: Moon, color: 'text-green-400' },
  { value: 'tension', label: 'Tension', emoji: '🔥', icon: Flame, color: 'text-red-400' },
  { value: 'fear', label: 'Peur', emoji: '😰', icon: Moon, color: 'text-gray-400' },
  { value: 'love', label: 'Amour', emoji: '❤️', icon: Heart, color: 'text-pink-400' },
] as const;

const VOICE_OPTIONS: { value: NarratorVoice | ''; label: string; emoji: string }[] = [
  { value: '', label: 'Sans voix', emoji: '🔇' },
  { value: 'narrator', label: 'Timothy', emoji: '🎙️' },
  { value: 'announcer', label: 'Mark', emoji: '📢' },
  { value: 'female', label: 'Sarah', emoji: '👩' },
  { value: 'alloy', label: 'Alex', emoji: '🗣️' },
];

interface SceneEditorProps {
  scenes: EditableScene[];
  onScenesChange: (scenes: EditableScene[]) => void;
  onValidate: () => void;
  isGenerating?: boolean;
}

let nextSceneId = 1000;
function generateSceneId(): string {
  return `scene_${Date.now()}_${nextSceneId++}`;
}

export function SceneEditor({ scenes, onScenesChange, onValidate, isGenerating }: SceneEditorProps) {
  const [expandedEmotion, setExpandedEmotion] = useState<string | null>(null);
  const [expandedVoice, setExpandedVoice] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const updateScene = useCallback((id: string, updates: Partial<EditableScene>) => {
    onScenesChange(scenes.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [scenes, onScenesChange]);

  const deleteScene = useCallback((id: string) => {
    if (scenes.length <= 1) return;
    // Clean up audio blob URL
    const scene = scenes.find(s => s.id === id);
    if (scene?.audioUrl) URL.revokeObjectURL(scene.audioUrl);
    onScenesChange(scenes.filter(s => s.id !== id));
  }, [scenes, onScenesChange]);

  const addScene = useCallback((afterIndex: number) => {
    const newScene: EditableScene = {
      id: generateSceneId(),
      text: '',
      emotion: 'wonder',
    };
    const updated = [...scenes];
    updated.splice(afterIndex + 1, 0, newScene);
    onScenesChange(updated);
  }, [scenes, onScenesChange]);

  const moveScene = useCallback((index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= scenes.length) return;
    const updated = [...scenes];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    onScenesChange(updated);
  }, [scenes, onScenesChange]);

  const mergeWithNext = useCallback((index: number) => {
    if (index >= scenes.length - 1) return;
    const merged: EditableScene = {
      ...scenes[index],
      text: `${scenes[index].text} ${scenes[index + 1].text}`.trim(),
    };
    if (scenes[index + 1].audioUrl) URL.revokeObjectURL(scenes[index + 1].audioUrl);
    const updated = scenes.filter((_, i) => i !== index + 1);
    updated[index] = { ...merged, audioBase64: undefined, audioUrl: undefined };
    onScenesChange(updated);
  }, [scenes, onScenesChange]);

  const generateAudio = useCallback(async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !scene.voice || !scene.text.trim()) return;

    updateScene(sceneId, { isGeneratingAudio: true });

    try {
      const { data, error } = await supabase.functions.invoke('french-tts', {
        body: { text: scene.text, voice: scene.voice, returnAudio: true }
      });

      if (error || !data?.success || !data?.audioBase64) {
        throw new Error(error?.message || 'Échec de la génération audio');
      }

      // Revoke old blob URL
      if (scene.audioUrl) URL.revokeObjectURL(scene.audioUrl);

      const byteChars = atob(data.audioBase64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArray], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(blob);

      updateScene(sceneId, {
        audioBase64: data.audioBase64,
        audioUrl,
        isGeneratingAudio: false,
      });
    } catch (err) {
      console.error('[SceneEditor] TTS error:', err);
      updateScene(sceneId, { isGeneratingAudio: false });
    }
  }, [scenes, updateScene]);

  const togglePlay = useCallback((sceneId: string, audioUrl: string) => {
    if (playingAudio === sceneId) {
      audioRefs.current[sceneId]?.pause();
      setPlayingAudio(null);
      return;
    }
    // Stop any other playing
    if (playingAudio && audioRefs.current[playingAudio]) {
      audioRefs.current[playingAudio].pause();
    }
    if (!audioRefs.current[sceneId]) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudio(null);
      audioRefs.current[sceneId] = audio;
    }
    audioRefs.current[sceneId].play();
    setPlayingAudio(sceneId);
  }, [playingAudio]);

  const handleVoiceChange = useCallback((sceneId: string, voice: NarratorVoice | '') => {
    const scene = scenes.find(s => s.id === sceneId);
    if (scene?.audioUrl) URL.revokeObjectURL(scene.audioUrl);
    updateScene(sceneId, {
      voice: voice || undefined,
      audioBase64: undefined,
      audioUrl: undefined,
    });
    setExpandedVoice(null);
  }, [scenes, updateScene]);

  const getEmotionInfo = (emotionValue: string) => {
    return EMOTIONS.find(e => e.value === emotionValue) || EMOTIONS[0];
  };

  const getVoiceInfo = (voice?: NarratorVoice) => {
    return VOICE_OPTIONS.find(v => v.value === (voice || '')) || VOICE_OPTIONS[0];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-amber-100 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Éditeur de Scènes
        </h2>
        <p className="text-sm text-amber-200/60">
          {scenes.length} scène{scenes.length > 1 ? 's' : ''} • Modifie, réorganise, choisis les émotions et voix
        </p>
      </div>

      {/* Scene Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {scenes.map((scene, index) => {
            const emotionInfo = getEmotionInfo(scene.emotion);
            const voiceInfo = getVoiceInfo(scene.voice);
            const isEmotionOpen = expandedEmotion === scene.id;
            const isVoiceOpen = expandedVoice === scene.id;

            return (
              <motion.div
                key={scene.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.2 }}
                className="bg-amber-950/40 border border-amber-500/20 rounded-xl p-4 space-y-3"
              >
                {/* Scene number + emotion + voice badges */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-300">
                      {index + 1}
                    </span>
                    {/* Emotion badge */}
                    <button
                      onClick={() => {
                        setExpandedEmotion(isEmotionOpen ? null : scene.id);
                        setExpandedVoice(null);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        'border border-amber-500/20 hover:border-amber-500/40 active:scale-95',
                        isEmotionOpen ? 'bg-amber-500/20' : 'bg-amber-950/40'
                      )}
                    >
                      <span>{emotionInfo.emoji}</span>
                      <span className={emotionInfo.color}>{emotionInfo.label}</span>
                    </button>
                    {/* Voice badge */}
                    <button
                      onClick={() => {
                        setExpandedVoice(isVoiceOpen ? null : scene.id);
                        setExpandedEmotion(null);
                      }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        'border border-amber-500/20 hover:border-amber-500/40 active:scale-95',
                        isVoiceOpen ? 'bg-purple-500/20' : 'bg-amber-950/40',
                        scene.voice ? 'text-purple-300' : 'text-amber-200/50'
                      )}
                    >
                      <span>{voiceInfo.emoji}</span>
                      <span>{voiceInfo.label}</span>
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveScene(index, 'up')} disabled={index === 0}
                      className="p-1.5 text-amber-200/40 hover:text-amber-200 disabled:opacity-30 transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveScene(index, 'down')} disabled={index === scenes.length - 1}
                      className="p-1.5 text-amber-200/40 hover:text-amber-200 disabled:opacity-30 transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {index < scenes.length - 1 && (
                      <button onClick={() => mergeWithNext(index)}
                        className="p-1.5 text-amber-200/40 hover:text-blue-400 transition-colors" title="Fusionner avec la suivante">
                        <Merge className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteScene(scene.id)} disabled={scenes.length <= 1}
                      className="p-1.5 text-amber-200/40 hover:text-red-400 disabled:opacity-30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Emotion picker */}
                <AnimatePresence>
                  {isEmotionOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-2 py-2">
                        {EMOTIONS.map(em => (
                          <button key={em.value}
                            onClick={() => { updateScene(scene.id, { emotion: em.value }); setExpandedEmotion(null); }}
                            className={cn(
                              'flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all active:scale-95',
                              scene.emotion === em.value ? 'bg-amber-500/30 border border-amber-400/50' : 'bg-amber-950/60 border border-amber-500/10 hover:border-amber-500/30'
                            )}>
                            <span>{em.emoji}</span>
                            <span className={em.color}>{em.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Voice picker */}
                <AnimatePresence>
                  {isVoiceOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex flex-wrap gap-2 py-2">
                        {VOICE_OPTIONS.map(vo => (
                          <button key={vo.value}
                            onClick={() => handleVoiceChange(scene.id, vo.value)}
                            className={cn(
                              'flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all active:scale-95',
                              (scene.voice || '') === vo.value ? 'bg-purple-500/30 border border-purple-400/50' : 'bg-amber-950/60 border border-amber-500/10 hover:border-purple-500/30'
                            )}>
                            <span>{vo.emoji}</span>
                            <span className={vo.value ? 'text-purple-300' : 'text-amber-200/50'}>{vo.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Scene text */}
                <textarea
                  value={scene.text}
                  onChange={(e) => {
                    // Clear audio if text changes
                    const updates: Partial<EditableScene> = { text: e.target.value };
                    if (scene.audioBase64) {
                      if (scene.audioUrl) URL.revokeObjectURL(scene.audioUrl);
                      updates.audioBase64 = undefined;
                      updates.audioUrl = undefined;
                    }
                    updateScene(scene.id, updates);
                  }}
                  placeholder="Écris le texte de cette scène..."
                  className={cn(
                    'w-full bg-black/30 border border-amber-500/10 rounded-lg px-3 py-2.5',
                    'text-amber-100 text-sm leading-relaxed placeholder:text-amber-200/30',
                    'focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20',
                    'resize-none min-h-[60px]'
                  )}
                  rows={Math.max(2, Math.ceil(scene.text.length / 50))}
                />

                {/* TTS controls */}
                {scene.voice && scene.text.trim() && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => generateAudio(scene.id)}
                      disabled={scene.isGeneratingAudio}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95',
                        'bg-purple-500/20 border border-purple-500/30 hover:border-purple-400/50',
                        'text-purple-200 disabled:opacity-50'
                      )}
                    >
                      {scene.isGeneratingAudio ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération...</>
                      ) : (
                        <><Mic className="w-3.5 h-3.5" /> {scene.audioBase64 ? 'Regénérer' : 'Générer la voix'}</>
                      )}
                    </button>

                    {scene.audioUrl && !scene.isGeneratingAudio && (
                      <button
                        onClick={() => togglePlay(scene.id, scene.audioUrl!)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-500/20 border border-green-500/30 hover:border-green-400/50 text-green-200 transition-all active:scale-95"
                      >
                        {playingAudio === scene.id ? (
                          <><Pause className="w-3.5 h-3.5" /> Pause</>
                        ) : (
                          <><Play className="w-3.5 h-3.5" /> Écouter</>
                        )}
                      </button>
                    )}

                    {scene.audioBase64 && (
                      <span className="text-xs text-green-400/60">✓ Audio prêt</span>
                    )}
                  </div>
                )}

                {/* Add scene button */}
                <div className="flex justify-center">
                  <button onClick={() => addScene(index)}
                    className="flex items-center gap-1 text-xs text-amber-200/40 hover:text-amber-300 transition-colors px-3 py-1">
                    <Plus className="w-3 h-3" />
                    <span>Ajouter une scène</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Validate button */}
      <div className="pt-4 space-y-3">
        <Button
          size="lg"
          onClick={onValidate}
          disabled={isGenerating || scenes.length === 0 || scenes.every(s => !s.text.trim())}
          className={cn(
            'w-full py-6 text-lg font-semibold rounded-2xl',
            'bg-gradient-to-r from-amber-500 to-orange-500',
            'hover:from-amber-400 hover:to-orange-400',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Sparkles className="w-5 h-5 mr-2" />
          🎨 Illustrer mes scènes ({scenes.length})
        </Button>

        <p className="text-xs text-center text-amber-200/40">
          Les illustrations seront matchées depuis la bibliothèque Griot
        </p>
      </div>
    </div>
  );
}
