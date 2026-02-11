import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Share2, ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EndingCardProps {
  badge?: string;
  endingTitle?: string;
  endingsUnlocked: number;
  totalEndings: number;
  onReplay: () => void;
  onShare?: () => void;
  onBack: () => void;
}

export default function EndingCard({
  badge,
  endingTitle,
  endingsUnlocked,
  totalEndings,
  onReplay,
  onShare,
  onBack,
}: EndingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-6"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 15, delay: 0.2 }}
        className="w-full max-w-sm bg-card/90 backdrop-blur-xl rounded-3xl border border-border/50 p-8 text-center space-y-6"
      >
        {/* Badge */}
        {badge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.5 }}
            className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
          >
            <span className="text-5xl">{badge}</span>
          </motion.div>
        )}

        {!badge && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.5 }}
            className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
          >
            <Trophy className="w-12 h-12 text-primary-foreground" />
          </motion.div>
        )}

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {endingTitle ?? 'Fin atteinte !'}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Fin {endingsUnlocked}/{totalEndings} — Explore les autres chemins !
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(endingsUnlocked / Math.max(totalEndings, 1)) * 100}%` }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button onClick={onReplay} className="w-full gap-2">
            <RotateCcw className="w-4 h-4" />
            Rejouer
          </Button>
          {onShare && (
            <Button variant="outline" onClick={onShare} className="w-full gap-2">
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
          )}
          <Button variant="ghost" onClick={onBack} className="w-full gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
