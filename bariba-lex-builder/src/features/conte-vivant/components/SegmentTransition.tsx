import { motion, AnimatePresence } from 'framer-motion';

interface SegmentTransitionProps {
  show: boolean;
  onMidpoint: () => void;
}

export default function SegmentTransition({ show, onMidpoint }: SegmentTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-[45] bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onAnimationComplete={() => onMidpoint()}
        />
      )}
    </AnimatePresence>
  );
}
