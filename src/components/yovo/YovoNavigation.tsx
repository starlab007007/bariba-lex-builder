import { Home, Compass, Radio, MessageCircle, User, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { YovoSidebar } from './YovoSidebar';

const navItems = [
  { icon: Home, label: 'Accueil', path: '/yovo/feed' },
  { icon: Compass, label: 'Découvrir', path: '/yovo/discover' },
  { icon: Radio, label: 'Live', path: '/yovo/live' },
  { icon: MessageCircle, label: 'Messages', path: '/yovo/messages' },
  { icon: User, label: 'Profil', path: '/yovo/profile' },
];

export function YovoNavigation() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-white/10"
      >
        <div className="flex items-center justify-around h-20 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center gap-1 p-2"
              >
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -top-1 w-12 h-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`p-2 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </motion.div>
                <span className={`text-xs ${isActive ? 'text-orange-400' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 p-2 text-slate-500 hover:text-slate-300"
          >
            <div className="p-2 rounded-xl">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-xs">Plus</span>
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {sidebarOpen && (
          <YovoSidebar onClose={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
