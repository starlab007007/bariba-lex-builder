import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen kuaishou-bg flex flex-col items-center justify-center px-6">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'linear-gradient(135deg, #FF7A00, #FF5722)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'linear-gradient(135deg, #00BCD4, #536DFE)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center"
      >
        {/* 404 Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="mb-6"
        >
          <div className="w-24 h-24 mx-auto rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
            <Search className="w-12 h-12 text-white/60" />
          </div>
        </motion.div>

        {/* 404 Text */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-7xl font-black kuaishou-gradient-text mb-4"
        >
          404
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-medium text-white mb-2"
        >
          Page introuvable
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white/50 mb-8 max-w-sm"
        >
          La page que vous cherchez n'existe pas ou a été déplacée.
        </motion.p>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/tamtam')}
            className="px-6 py-3 kuaishou-btn-primary flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="px-6 py-3 kuaishou-btn-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Page précédente</span>
          </motion.button>
        </motion.div>

        {/* TAM-TAM branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex items-center justify-center gap-2"
        >
          <span className="text-2xl">🥁</span>
          <span className="text-white/30 font-bold">TAM-TAM</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
