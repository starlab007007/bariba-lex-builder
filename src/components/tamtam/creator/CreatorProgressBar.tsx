/**
 * CreatorProgressBar.tsx
 * Barre de progression persistante pour le workflow de création
 * Visible sur toutes les phases avec transitions fluides
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type CreatorPhaseType = 
  | 'discover' 
  | 'preparing' 
  | 'capturing' 
  | 'reviewing' 
  | 'refining' 
  | 'finalizing' 
  | 'publishing' 
  | 'success';

interface CreatorProgressBarProps {
  phase: CreatorPhaseType;
  progress?: number;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  canProceed?: boolean;
  canGoBack?: boolean;
  draftStatus?: 'saving' | 'saved' | null;
  lastSaved?: string | null;
  nextLabel?: string;
  backLabel?: string;
  showDraftButton?: boolean;
  hideOnPhases?: CreatorPhaseType[];
  className?: string;
}

const phaseOrder: CreatorPhaseType[] = [
  'discover', 
  'capturing', 
  'reviewing', 
  'finalizing'
];

const phaseLabels: Record<CreatorPhaseType, { fr: string; ba: string; emoji: string }> = {
  discover: { fr: 'Choisir', ba: 'Sɔ́rá', emoji: '🎨' },
  preparing: { fr: 'Préparation', ba: 'Sìɛ̀kà', emoji: '⏳' },
  capturing: { fr: 'Capturer', ba: 'Kɛ́', emoji: '📹' },
  reviewing: { fr: 'Vérifier', ba: 'Kpárá', emoji: '👁️' },
  refining: { fr: 'Affiner', ba: 'Dɛ̀rɛ́', emoji: '✨' },
  finalizing: { fr: 'Publier', ba: 'Tɔ́', emoji: '🚀' },
  publishing: { fr: 'En cours...', ba: 'À kɛ̀...', emoji: '⏳' },
  success: { fr: 'Terminé !', ba: 'À bàn !', emoji: '🎉' }
};

export const CreatorProgressBar: React.FC<CreatorProgressBarProps> = ({
  phase,
  progress = 0,
  onBack,
  onNext,
  onSaveDraft,
  canProceed = true,
  canGoBack = true,
  draftStatus = null,
  lastSaved = null,
  nextLabel,
  backLabel,
  showDraftButton = true,
  hideOnPhases = ['publishing', 'success'],
  className
}) => {
  if (hideOnPhases.includes(phase)) return null;

  const currentPhaseIndex = phaseOrder.indexOf(phase as any);
  const isValidPhase = currentPhaseIndex >= 0;

  const getDefaultNextLabel = () => {
    switch (phase) {
      case 'reviewing': return 'Continuer';
      case 'finalizing': return 'Publier';
      default: return 'Suivant';
    }
  };

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className={cn(
        "fixed bottom-0 inset-x-0 z-50 pb-safe",
        className
      )}
    >
      {/* Glass background */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10">
        {/* Progress dots */}
        {isValidPhase && (
          <div className="flex justify-center gap-2 pt-3 pb-2">
            {phaseOrder.map((p, i) => {
              const isActive = p === phase;
              const isCompleted = i < currentPhaseIndex;
              const label = phaseLabels[p];
              
              return (
                <motion.div
                  key={p}
                  className="flex flex-col items-center"
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    opacity: isActive ? 1 : isCompleted ? 0.8 : 0.4
                  }}
                >
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all duration-300",
                      isActive && "w-8 bg-gradient-to-r from-primary to-cyan-400 shadow-lg shadow-primary/30",
                      isCompleted && "bg-green-500",
                      !isActive && !isCompleted && "bg-white/20"
                    )}
                  />
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-white/70 mt-1 whitespace-nowrap"
                    >
                      {label.emoji} {label.fr}
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Progress bar for current phase */}
        {progress > 0 && progress < 100 && (
          <div className="px-4 pb-2">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-cyan-400 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 100 }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
          {/* Draft button */}
          {showDraftButton && onSaveDraft ? (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onSaveDraft}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {draftStatus === 'saving' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              <span className="hidden sm:inline">Brouillon</span>
              {draftStatus === 'saved' && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-1 text-green-400"
                >
                  ✓
                </motion.span>
              )}
            </Button>
          ) : (
            <div className="w-20" />
          )}

          {/* Back button */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            disabled={!canGoBack}
            className="text-white hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Center: last saved indicator */}
          <div className="flex-1 flex justify-center">
            <AnimatePresence mode="wait">
              {lastSaved && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-white/40"
                >
                  Sauvegardé {lastSaved}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Next button */}
          <Button 
            onClick={onNext}
            disabled={!canProceed}
            className={cn(
              "min-w-[100px] transition-all",
              phase === 'finalizing' 
                ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" 
                : "bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
            )}
          >
            <span>{nextLabel || getDefaultNextLabel()}</span>
            {phase !== 'finalizing' && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CreatorProgressBar;
