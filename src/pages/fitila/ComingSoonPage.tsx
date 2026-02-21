import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const ComingSoonPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-amber-100">Bientôt disponible</h1>
        <p className="text-sm text-amber-200/50 max-w-xs">
          Cette fonctionnalité est en cours de développement. Revenez bientôt !
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 text-sm hover:bg-amber-500/20 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </motion.div>
    </div>
  );
};

export default ComingSoonPage;
