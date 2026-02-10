// src/components/tamtam/creator/MagicDrawer.tsx
// Complete Magic & AI module: Inspiring, Shot Tips, Challenges, AR Effects

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, X, Eye, Sparkles, Flame, Camera, Check, Users,
  Lightbulb, Target, Trophy, Zap
} from 'lucide-react';
import { 
  INSPIRING_IDEAS, 
  SHOT_TIPS, 
  CHALLENGES, 
  AR_EFFECTS,
  formatParticipants,
  InspiringIdea,
  ShotTip,
  Challenge,
  AREffect
} from './CreatorEffectsData';
import { cn } from '@/lib/utils';

type MagicTab = 'inspiring' | 'shot_tips' | 'challenges' | 'ar_effects';

interface MagicDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Shot tips
  selectedShotTip?: string;
  onSelectShotTip: (id: string | undefined) => void;
  // Challenges
  selectedChallenge?: string;
  onSelectChallenge: (id: string | undefined) => void;
  // AR Effects
  activeAREffects: string[];
  onToggleAREffect: (id: string) => void;
  // Inspiring callback
  onSelectIdea?: (idea: InspiringIdea) => void;
}

export const MagicDrawer: React.FC<MagicDrawerProps> = ({
  isOpen,
  onClose,
  selectedShotTip,
  onSelectShotTip,
  selectedChallenge,
  onSelectChallenge,
  activeAREffects,
  onToggleAREffect,
  onSelectIdea,
}) => {
  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [activeTab, setActiveTab] = useState<MagicTab>('ar_effects');

  const tabs = [
    { id: 'ar_effects' as const, label: 'Effets', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'challenges' as const, label: 'Défis', icon: <Flame className="w-4 h-4" /> },
    { id: 'shot_tips' as const, label: 'Cadrage', icon: <Target className="w-4 h-4" /> },
    { id: 'inspiring' as const, label: 'Idées', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  // EARLY RETURN AFTER ALL HOOKS
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[120] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="absolute left-0 right-0 bottom-0 rounded-t-[28px] bg-[#0b0b0e] border-t border-white/10 p-4 max-h-[70vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold flex items-center gap-2">
              <Wand2 className="h-5 w-5" /> Magic & AI
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/80 hover:bg-white/15'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[400px] pb-4">
            {/* AR Effects */}
            {activeTab === 'ar_effects' && (
              <div className="space-y-4">
                {/* Face filters */}
                <div>
                  <div className="text-xs text-white/60 mb-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Filtres visage
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {AR_EFFECTS.filter(e => e.type === 'face').map(effect => {
                      const isActive = activeAREffects.includes(effect.id);
                      return (
                        <button
                          key={effect.id}
                          onClick={() => onToggleAREffect(effect.id)}
                          className={cn(
                            'w-14 h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all',
                            isActive
                              ? 'border-white bg-white/20'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          )}
                        >
                          <span className="text-lg">{effect.emoji}</span>
                          <span className="text-[8px] text-white/60 leading-tight">{effect.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Overlay effects */}
                <div>
                  <div className="text-xs text-white/60 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Animations
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {AR_EFFECTS.filter(e => e.type === 'overlay').map(effect => {
                      const isActive = activeAREffects.includes(effect.id);
                      return (
                        <button
                          key={effect.id}
                          onClick={() => onToggleAREffect(effect.id)}
                          className={cn(
                            'w-14 h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all',
                            isActive
                              ? 'border-white bg-white/20'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          )}
                        >
                          <span className="text-lg">{effect.emoji}</span>
                          <span className="text-[8px] text-white/60 leading-tight">{effect.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fun stickers */}
                <div>
                  <div className="text-xs text-white/60 mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Stickers fun
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {AR_EFFECTS.filter(e => e.type === 'sticker').map(effect => {
                      const isActive = activeAREffects.includes(effect.id);
                      return (
                        <button
                          key={effect.id}
                          onClick={() => onToggleAREffect(effect.id)}
                          className={cn(
                            'w-14 h-14 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all',
                            isActive
                              ? 'border-white bg-white/20'
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          )}
                        >
                          <span className="text-lg">{effect.emoji}</span>
                          <span className="text-[8px] text-white/60 leading-tight">{effect.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Challenges */}
            {activeTab === 'challenges' && (
              <div className="space-y-2">
                {CHALLENGES.map(challenge => {
                  const isSelected = selectedChallenge === challenge.id;
                  return (
                    <button
                      key={challenge.id}
                      onClick={() => onSelectChallenge(isSelected ? undefined : challenge.id)}
                      className={cn(
                        'w-full p-3 rounded-2xl border flex items-center gap-3 transition-all',
                        isSelected
                          ? 'border-white bg-white/15'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center text-2xl">
                        {challenge.emoji}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white">{challenge.label}</div>
                        <div className="text-xs text-white/60 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {formatParticipants(challenge.participants)} participants
                        </div>
                      </div>
                      <div className="text-sm text-white/60">{challenge.hashtag}</div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <Check className="w-4 h-4 text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Shot Tips */}
            {activeTab === 'shot_tips' && (
              <div className="grid grid-cols-2 gap-3">
                {/* None option */}
                <button
                  onClick={() => onSelectShotTip(undefined)}
                  className={cn(
                    'aspect-[4/3] rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all',
                    !selectedShotTip
                      ? 'border-white bg-white/15'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  )}
                >
                  <X className="w-8 h-8 text-white/60" />
                  <span className="text-sm text-white/80">Aucun</span>
                </button>

                {SHOT_TIPS.map(tip => {
                  const isSelected = selectedShotTip === tip.id;
                  return (
                    <button
                      key={tip.id}
                      onClick={() => onSelectShotTip(isSelected ? undefined : tip.id)}
                      className={cn(
                        'aspect-[4/3] rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden',
                        isSelected
                          ? 'border-white bg-white/15'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      )}
                    >
                      {/* Preview of the overlay */}
                      <div className="absolute inset-0 opacity-30">
                        {tip.overlayType === 'grid' && (
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                            {Array.from({ length: 9 }).map((_, i) => (
                              <div key={i} className="border border-white/50" />
                            ))}
                          </div>
                        )}
                        {tip.overlayType === 'center' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full border-2 border-white/50" />
                          </div>
                        )}
                        {tip.overlayType === 'diagonal' && (
                          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <line x1="0" y1="0" x2="100%" y2="100%" stroke="white" strokeWidth="1" />
                            <line x1="100%" y1="0" x2="0" y2="100%" stroke="white" strokeWidth="1" />
                          </svg>
                        )}
                      </div>
                      <span className="text-3xl z-10">{tip.emoji}</span>
                      <span className="text-sm text-white/80 z-10">{tip.label}</span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inspiring Ideas */}
            {activeTab === 'inspiring' && (
              <div className="space-y-3">
                {INSPIRING_IDEAS.map(idea => (
                  <button
                    key={idea.id}
                    onClick={() => onSelectIdea?.(idea)}
                    className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{idea.emoji}</span>
                      <div>
                        <div className="font-medium text-white">{idea.label}</div>
                        <div className="text-xs text-white/60">{idea.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {idea.prompts.map((prompt, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full bg-white/10 text-xs text-white/80"
                        >
                          {prompt}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MagicDrawer;
