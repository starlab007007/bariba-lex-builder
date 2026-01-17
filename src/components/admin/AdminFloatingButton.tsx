import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LayoutDashboard, Package, ChevronUp, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const AdminFloatingButton: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Ne pas afficher si pas admin ou en chargement
  if (loading || !isAdmin) return null;

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Tableau de bord',
      labelBa: 'Kíláàsì àkọ́kọ́',
      path: '/admin',
      gradient: 'from-purple-500 to-indigo-500',
    },
    {
      icon: Package,
      label: 'Gestion des Assets',
      labelBa: 'Ìṣàkóso àwọn ohun',
      path: '/assets',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-16 right-0 w-56 p-2 rounded-2xl border border-white/10"
            style={{
              background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(15, 15, 20, 0.99) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 122, 0, 0.1)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 mb-1 border-b border-white/10">
              <Shield className="w-4 h-4 text-[#FF7A00]" />
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider">Admin</span>
            </div>

            {/* Menu Items */}
            <div className="space-y-1">
              {menuItems.map((item) => (
                <motion.button
                  key={item.path}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavigate(item.path)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium group-hover:text-[#FF7A00] transition-colors">
                      {item.label}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #FF7A00 0%, #FF5500 100%)',
          boxShadow: '0 4px 20px rgba(255, 122, 0, 0.4), 0 0 30px rgba(255, 122, 0, 0.2)',
        }}
      >
        {/* Pulse Animation */}
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-[#FF7A00]"
        />

        {/* Icon */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6 text-white relative z-10" />
            </motion.div>
          ) : (
            <motion.div
              key="shield"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <Shield className="w-6 h-6 text-white relative z-10" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-lg"
        >
          <span className="text-[#FF7A00] text-[10px] font-black">A</span>
        </motion.div>
      </motion.button>
    </div>
  );
};

export default AdminFloatingButton;
