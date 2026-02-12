import { motion } from 'framer-motion';
import { RotateCcw, Share2, Play } from 'lucide-react';
import GoldenParticles from './GoldenParticles';

interface Badge { icon: string; name: string; }

interface EndingCardProps {
  badge: Badge;
  totalEndings: number;
  discoveredEndings: Badge[];
  onReplay: () => void;
  onShare: () => void;
  onNext: () => void;
}

export default function EndingCard({ badge, totalEndings, discoveredEndings, onReplay, onShare, onNext }: EndingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8"
      style={{ background: 'radial-gradient(ellipse at center, #161622 0%, #08080c 70%)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Badge with particles */}
      <div className="relative mb-6">
        <GoldenParticles show={true} />
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: [-10, 5, -2, 0] }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F5A623, #FF8C00)' }}
        >
          <span className="text-6xl">{badge.icon}</span>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-white text-2xl font-bold mb-8"
      >
        {badge.name}
      </motion.p>

      {/* Endings discovered */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex gap-3 mb-10"
      >
        {Array.from({ length: totalEndings }).map((_, i) => {
          const discovered = discoveredEndings[i];
          return (
            <div
              key={i}
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{
                backgroundColor: discovered ? '#F5A62330' : '#ffffff10',
                border: discovered ? '2px solid #F5A623' : '2px solid #ffffff20',
              }}
            >
              {discovered ? discovered.icon : '?'}
            </div>
          );
        })}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex gap-6"
      >
        {[
          { fn: onReplay, icon: <RotateCcw className="w-6 h-6 text-white" />, bg: '#F5A623' },
          { fn: onShare, icon: <Share2 className="w-6 h-6 text-white" />, bg: '#3B82F6' },
          { fn: onNext, icon: <Play className="w-6 h-6 text-white" />, bg: '#22C55E' },
        ].map(({ fn, icon, bg }, i) => (
          <motion.button
            key={i}
            onClick={fn}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: bg }}
          >
            {icon}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
