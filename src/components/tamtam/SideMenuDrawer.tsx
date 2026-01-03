import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  X, Home, MessageCircle, ShoppingBag, User, Settings, 
  LogOut, Globe, Volume2, HelpCircle, Shield, Moon
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
    followers_count?: number;
    following_count?: number;
  };
}

const menuItems = [
  { icon: Home, label: 'Accueil', labelBa: 'Ile', path: '/tamtam', color: '#F59E0B' },
  { icon: MessageCircle, label: 'Social', labelBa: 'Ẹgbẹ́', path: '/tamtam/social', color: '#10B981' },
  { icon: ShoppingBag, label: 'Marché', labelBa: 'Ọjà', path: '/tamtam/market', color: '#F97316' },
  { icon: User, label: 'Profil', labelBa: 'Àkọsílẹ̀', path: '/tamtam/profile', color: '#6366F1' },
];

const secondaryItems = [
  { icon: Settings, label: 'Paramètres', labelBa: 'Ètò', path: '/tamtam/settings' },
  { icon: HelpCircle, label: 'Aide', labelBa: 'Ìrànlọ́wọ́', path: '/tamtam/help' },
  { icon: Shield, label: 'Confidentialité', labelBa: 'Àṣírí', path: '/tamtam/privacy' },
];

export const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({
  isOpen,
  onClose,
  userProfile
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang, setLanguage, t } = useTamTamLanguage();

  const handleNavigate = (path: string) => {
    triggerFeedback('click');
    navigate(path);
    onClose();
  };

  const toggleLanguage = () => {
    triggerFeedback('success');
    setLanguage(currentLang === 'fr' ? 'ba' : 'fr');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-[101] w-[280px] bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col safe-area-inset-left"
            style={{
              borderTopRightRadius: 24,
              borderBottomRightRadius: 24,
            }}
          >
            {/* Header */}
            <div className="p-4 pt-safe flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                  <span className="text-xl">🥁</span>
                </div>
                <div>
                  <h2 className="text-lg font-black bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                    TAM-TAM
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium">Menu</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </motion.button>
            </div>

            {/* User Profile Section */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Avatar className="w-14 h-14 ring-2 ring-amber-200">
                  <AvatarImage src={userProfile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-lg font-bold">
                    {userProfile?.display_name?.[0] || userProfile?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {userProfile?.display_name || userProfile?.username || 'Utilisateur'}
                  </p>
                  <p className="text-sm text-gray-500">
                    @{userProfile?.username || 'user'}
                  </p>
                  <div className="flex gap-4 mt-1">
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-600">{userProfile?.followers_count || 0}</strong> abonnés
                    </span>
                    <span className="text-xs text-gray-400">
                      <strong className="text-gray-600">{userProfile?.following_count || 0}</strong> abonnements
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-3 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <motion.button
                      key={item.path}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-amber-50 to-orange-50' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isActive ? 'shadow-md' : ''
                        }`}
                        style={{ 
                          background: isActive 
                            ? `linear-gradient(135deg, ${item.color}20, ${item.color}40)` 
                            : 'rgba(0,0,0,0.04)'
                        }}
                      >
                        <Icon 
                          className="w-5 h-5" 
                          style={{ color: isActive ? item.color : '#6B7280' }}
                        />
                      </div>
                      <span className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-600'}`}>
                        {currentLang === 'ba' ? item.labelBa : item.label}
                      </span>
                      {isActive && (
                        <div 
                          className="ml-auto w-2 h-2 rounded-full"
                          style={{ background: item.color }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Separator */}
              <div className="my-4 mx-4 h-px bg-gray-100" />

              {/* Secondary Navigation */}
              <div className="px-3 space-y-1">
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.path}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavigate(item.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
                    >
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {currentLang === 'ba' ? item.labelBa : item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Footer - Language Toggle */}
            <div className="p-4 border-t border-gray-100 space-y-3">
              {/* Language Switcher */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={toggleLanguage}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">Langue</p>
                    <p className="text-xs text-gray-500">
                      {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-white text-xs font-medium text-blue-600 shadow-sm">
                  {currentLang.toUpperCase()}
                </div>
              </motion.button>

              {/* Logout */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-500">
                  {currentLang === 'ba' ? 'Jáde' : 'Déconnexion'}
                </span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SideMenuDrawer;
