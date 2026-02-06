/**
 * SceneEditor — Interactive scene-by-scene script editor
 * Inspired by MovieFlow's scripted project approach
 * 
 * Each sentence = one scene. Users can:
 * - Edit scene text
 * - Pick emotion per scene
 * - Reorder scenes (move up/down)
 * - Add/delete/merge scenes
 * - Mobile-optimized with large touch targets
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, ChevronUp, ChevronDown, Merge, Sparkles,
  Smile, Cloud, Zap, Eye, Moon, Flame, Heart
} from 'lucide-react';

export interface EditableScene {
  id: string;
  text: string;
  emotion: string;
  sceneType?: string;
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

  const updateScene = useCallback((id: string, updates: Partial<EditableScene>) => {
    onScenesChange(scenes.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [scenes, onScenesChange]);

  const deleteScene = useCallback((id: string) => {
    if (scenes.length <= 1) return; // Keep at least 1 scene
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
    const updated = scenes.filter((_, i) => i !== index + 1);
    updated[index] = merged;
    onScenesChange(updated);
  }, [scenes, onScenesChange]);

  const getEmotionInfo = (emotionValue: string) => {
    return EMOTIONS.find(e => e.value === emotionValue) || EMOTIONS[0];
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
          {scenes.length} scène{scenes.length > 1 ? 's' : ''} • Modifie, réorganise, choisis les émotions
        </p>
      </div>

      {/* Scene Cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {scenes.map((scene, index) => {
            const emotionInfo = getEmotionInfo(scene.emotion);
            const isEmotionOpen = expandedEmotion === scene.id;

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
                {/* Scene number + emotion badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-300">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => setExpandedEmotion(isEmotionOpen ? null : scene.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        'border border-amber-500/20 hover:border-amber-500/40 active:scale-95',
                        isEmotionOpen ? 'bg-amber-500/20' : 'bg-amber-950/40'
                      )}
                    >
                      <span>{emotionInfo.emoji}</span>
                      <span className={emotionInfo.color}>{emotionInfo.label}</span>
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveScene(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-amber-200/40 hover:text-amber-200 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveScene(index, 'down')}
                      disabled={index === scenes.length - 1}
                      className="p-1.5 text-amber-200/40 hover:text-amber-200 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {index < scenes.length - 1 && (
                      <button
                        onClick={() => mergeWithNext(index)}
                        className="p-1.5 text-amber-200/40 hover:text-blue-400 transition-colors"
                        title="Fusionner avec la suivante"
                      >
                        <Merge className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteScene(scene.id)}
                      disabled={scenes.length <= 1}
                      className="p-1.5 text-amber-200/40 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Emotion picker (expandable) */}
                <AnimatePresence>
                  {isEmotionOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-2 py-2">
                        {EMOTIONS.map(em => (
                          <button
                            key={em.value}
                            onClick={() => {
                              updateScene(scene.id, { emotion: em.value });
                              setExpandedEmotion(null);
                            }}
                            className={cn(
                              'flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all active:scale-95',
                              scene.emotion === em.value
                                ? 'bg-amber-500/30 border border-amber-400/50'
                                : 'bg-amber-950/60 border border-amber-500/10 hover:border-amber-500/30'
                            )}
                          >
                            <span>{em.emoji}</span>
                            <span className={em.color}>{em.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Scene text (editable) */}
                <textarea
                  value={scene.text}
                  onChange={(e) => updateScene(scene.id, { text: e.target.value })}
                  placeholder="Écris le texte de cette scène..."
                  className={cn(
                    'w-full bg-black/30 border border-amber-500/10 rounded-lg px-3 py-2.5',
                    'text-amber-100 text-sm leading-relaxed placeholder:text-amber-200/30',
                    'focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20',
                    'resize-none min-h-[60px]'
                  )}
                  rows={Math.max(2, Math.ceil(scene.text.length / 50))}
                />

                {/* Add scene button (between scenes) */}
                <div className="flex justify-center">
                  <button
                    onClick={() => addScene(index)}
                    className="flex items-center gap-1 text-xs text-amber-200/40 hover:text-amber-300 transition-colors px-3 py-1"
                  >
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
