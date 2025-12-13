import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  X, Languages, Heart, Briefcase, ShoppingBag, Leaf, BookOpen,
  TrendingUp, Wallet, FileText, AlertTriangle, Settings, Mic
} from 'lucide-react';

const menuItems = [
  { icon: Languages, label: 'Traducteur Vocal', path: '/yovo/translator', color: 'text-blue-400' },
  { icon: Heart, label: 'IA Santé Locale', path: '/yovo/health', color: 'text-red-400' },
  { icon: Briefcase, label: 'Emploi Audio Jobs', path: '/yovo/jobs', color: 'text-green-400' },
  { icon: ShoppingBag, label: 'Marketplace', path: '/yovo/marketplace', color: 'text-yellow-400' },
  { icon: Leaf, label: 'Conseil Agritech', path: '/yovo/agritech', color: 'text-emerald-400' },
  { icon: BookOpen, label: 'Bibliothèque', path: '/yovo/library', color: 'text-purple-400' },
  { icon: TrendingUp, label: 'IA Business', path: '/yovo/business', color: 'text-orange-400' },
  { icon: Wallet, label: 'IA Finance Mobile', path: '/yovo/finance', color: 'text-cyan-400' },
  { icon: FileText, label: 'Documents Officiels', path: '/yovo/documents', color: 'text-slate-400' },
  { icon: AlertTriangle, label: 'SOS Urgences', path: '/yovo/sos', color: 'text-red-500' },
  { icon: Mic, label: 'Enregistrement', path: '/yovo/record', color: 'text-pink-400' },
  { icon: Settings, label: 'Paramètres', path: '/yovo/settings', color: 'text-slate-400' },
];

interface YovoSidebarProps {
  onClose: () => void;
}

export function YovoSidebar({ onClose }: YovoSidebarProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="fixed right-0 top-0 bottom-0 w-80 bg-slate-950 border-l border-white/10 z-50 overflow-y-auto"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Services YOVO</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className={`p-2 rounded-lg bg-white/5 ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-slate-300 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-2xl border border-orange-500/20">
            <p className="text-sm text-slate-300">
              <span className="text-orange-400 font-semibold">YOVO Premium</span>
              <br />
              Débloquez toutes les fonctionnalités IA
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
