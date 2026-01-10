import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, BookOpen, Languages, User, Plus } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  id: string;
  icon: React.ElementType;
  labelFr: string;
  labelBa: string;
  path: string;
  isCreate?: boolean;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, labelFr: 'Accueil', labelBa: 'Ilé', path: '/tamtam/social' },
  { id: 'dictionary', icon: BookOpen, labelFr: 'Dico', labelBa: 'Ìwé', path: '/tamtam/dictionary' },
  { id: 'create', icon: Plus, labelFr: 'Créer', labelBa: 'Ṣẹ̀dá', path: '/tamtam/creator', isCreate: true },
  { id: 'translator', icon: Languages, labelFr: 'Traduire', labelBa: 'Ìtumọ̀', path: '/tamtam/translator' },
  { id: 'profile', icon: User, labelFr: 'Profil', labelBa: 'Èmi', path: '/tamtam/profile' },
];

export const KuaishouBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang } = useTamTamLanguage();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { count } = await supabase
        .from('tamtam_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };

    fetchUnread();

    // Subscribe to new messages
    const channel = supabase
      .channel('nav-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tamtam_messages'
      }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isActive = (path: string) => {
    if (path === '/tamtam/social') {
      return location.pathname === '/tamtam' || 
             location.pathname === '/tamtam/' || 
             location.pathname === '/tamtam/social';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavPress = (item: NavItem) => {
    triggerFeedback('click');
    navigate(item.path);
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 kuaishou-bottom-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const label = currentLang === 'ba' ? item.labelBa : item.labelFr;

          // Create button (center)
          if (item.isCreate) {
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleNavPress(item)}
                className="relative -mt-4"
              >
                <motion.div
                  className="absolute inset-0 rounded-xl blur-lg"
                  style={{ background: 'linear-gradient(45deg, #FF7A00, #FF5500)' }}
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                <div className="relative w-14 h-10 rounded-xl overflow-hidden shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500" />
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] to-red-500"
                    style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 10% 100%)' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Plus className="w-7 h-7 text-white" strokeWidth={3} />
                  </div>
                </div>
              </motion.button>
            );
          }

          // Regular nav item
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNavPress(item)}
              className="relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-[56px]"
            >
              <div className="relative">
                <Icon 
                  className={`w-6 h-6 transition-colors ${
                    active ? 'text-white' : 'text-white/50'
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {/* Badge for messages */}
                {item.id === 'home' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                active ? 'text-white' : 'text-white/50'
              }`}>
                {label}
              </span>
              
              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="navIndicator"
                  className="absolute -bottom-0.5 w-5 h-1 rounded-full bg-[#FF7A00]"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default KuaishouBottomNav;
