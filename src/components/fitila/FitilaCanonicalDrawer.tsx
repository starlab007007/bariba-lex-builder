import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import FitilaNavPanel from './FitilaNavPanel';

/** Tiroir mobile : même panneau que le menu latéral du bureau, en thème Premium Clair. */
export default function FitilaCanonicalDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-[#241F2E]/40"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-[101] w-[80vw] max-w-[304px] overflow-hidden rounded-r-[28px] shadow-2xl"
            role="dialog"
            aria-label="Navigation FITILA"
          >
            <FitilaNavPanel onNavigate={(p) => { onClose(); setTimeout(() => nav(p), 100); }} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
