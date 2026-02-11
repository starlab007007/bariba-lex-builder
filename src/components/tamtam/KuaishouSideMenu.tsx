import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Home, User, Clock, Cloud, Settings, Wallet, FileText, 
  Headphones, Users, FileBarChart, Eye, ListOrdered, BarChart3,
  Gamepad2, Tv, Bell, QrCode, ShoppingBag, ChevronRight,
  BookOpen, Languages
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface MenuGridItem {
  icon: React.ReactNode;
  label: string;
  labelBa?: string;
  path?: string;
  onClick?: () => void;
}

interface MenuSection {
  title: string;
  titleBa?: string;
  items: MenuGridItem[];
}

interface KuaishouSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  } | null;
}

export const KuaishouSideMenu: React.FC<KuaishouSideMenuProps> = ({
  isOpen,
  onClose,
  profile,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLang, setLanguage } = useTamTamLanguage();
  const { isAdmin } = useAuth();

  const handleNavigate = (path: string) => {
    triggerFeedback('click');
    onClose();
    setTimeout(() => navigate(path), 150);
  };

  // Quick actions at top
  const quickActions: MenuGridItem[] = [
    { icon: <QrCode className="w-5 h-5" />, label: 'Scanner', path: '/fitila/scan' },
    { icon: <ShoppingBag className="w-5 h-5" />, label: 'Boutique', path: '/fitila/shop' },
  ];

  // Menu sections (Kuaishou-style)
  const sections: MenuSection[] = [
    {
      title: 'Common function',
      titleBa: 'Iṣẹ́ pàtàkì',
      items: [
        { icon: <Clock className="w-5 h-5" />, label: 'Historique', labelBa: 'Ìtàn', path: '/fitila/history' },
        { icon: <Cloud className="w-5 h-5" />, label: 'Hors ligne', labelBa: 'Láìsí nẹ́tì', path: '/fitila/offline' },
        { icon: <Settings className="w-5 h-5" />, label: 'Paramètres', labelBa: 'Ètò', path: '/fitila/settings' },
        { icon: <Wallet className="w-5 h-5" />, label: 'Portefeuille', labelBa: 'Àpamọ́wọ́', path: '/fitila/wallet' },
        { icon: <FileText className="w-5 h-5" />, label: 'Brouillons', labelBa: 'Àkọsílẹ̀', path: '/fitila/drafts' },
      ],
    },
    {
      title: 'Tool service',
      titleBa: 'Irinṣẹ́ iṣẹ́',
      items: [
        { icon: <BookOpen className="w-5 h-5" />, label: 'Dictionnaire', labelBa: 'Ìwé ọ̀rọ̀', path: '/fitila/dictionary' },
        { icon: <Languages className="w-5 h-5" />, label: 'Traducteur', labelBa: 'Ìtumọ̀', path: '/fitila/translator' },
        { icon: <Headphones className="w-5 h-5" />, label: 'Assistance', labelBa: 'Ìrànlọ́wọ́', path: '/fitila/support' },
        { icon: <Users className="w-5 h-5" />, label: 'Protection', labelBa: 'Ìdáàbòbò', path: '/fitila/safety' },
        { icon: <Eye className="w-5 h-5" />, label: 'Voir plus tard', labelBa: 'Wo lẹ́yìn', path: '/fitila/watch-later' },
        { icon: <ListOrdered className="w-5 h-5" />, label: 'Abonnements', labelBa: 'Ìforúkọsílẹ̀', path: '/fitila/subscriptions' },
        { icon: <BarChart3 className="w-5 h-5" />, label: 'Rapport', labelBa: 'Ìròyìn', path: '/fitila/report' },
      ],
    },
    {
      title: 'Entertainment',
      titleBa: 'Ìdárayá',
      items: [
        { icon: <Gamepad2 className="w-5 h-5" />, label: 'Jeux', labelBa: 'Eré', path: '/fitila/games' },
        { icon: <Tv className="w-5 h-5" />, label: 'TV Shows', labelBa: 'Ìwòran TV', path: '/fitila/tv' },
      ],
    },
  ];

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
            className="fixed inset-0 z-[100] bg-black/60"
          />

          {/* Menu panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] z-[101] bg-[hsl(var(--kuaishou-white))] overflow-y-auto"
          >
            {/* Header with avatar */}
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--kuaishou-border))]">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-[hsl(var(--kuaishou-orange))]">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-[hsl(var(--kuaishou-orange))] text-white font-bold">
                    {profile?.display_name?.[0] || profile?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-[hsl(var(--kuaishou-text))]">
                    {profile?.display_name || profile?.username || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-[hsl(var(--kuaishou-text-muted))]">FITILA ID</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[hsl(var(--kuaishou-gray-light))] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[hsl(var(--kuaishou-text))]" />
              </motion.button>
            </div>

            {/* Quick actions */}
            <div className="flex gap-3 p-4 border-b border-[hsl(var(--kuaishou-border))]">
              {quickActions.map((action, index) => (
                <motion.button
                  key={index}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => action.path && handleNavigate(action.path)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(var(--kuaishou-gray-light))] hover:bg-[hsl(var(--kuaishou-border))] transition-colors"
                >
                  {action.icon}
                  <span className="text-sm font-medium text-[hsl(var(--kuaishou-text))]">
                    {currentLang === 'ba' && action.labelBa ? action.labelBa : action.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* System message notification */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNavigate('/fitila/notifications')}
              className="w-full flex items-center justify-between p-4 border-b border-[hsl(var(--kuaishou-border))] hover:bg-[hsl(var(--kuaishou-gray-light))] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[hsl(var(--kuaishou-text-muted))]" />
                <span className="text-sm font-medium text-[hsl(var(--kuaishou-text))]">
                  {currentLang === 'ba' ? 'Ìròyìn ètò' : 'Message système'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[hsl(var(--kuaishou-text-muted))]" />
            </motion.button>

            {/* Menu sections */}
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="p-4 border-b border-[hsl(var(--kuaishou-border))]">
                <p className="text-xs font-semibold text-[hsl(var(--kuaishou-text-muted))] uppercase tracking-wider mb-3">
                  {currentLang === 'ba' && section.titleBa ? section.titleBa : section.title}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {section.items.map((item, itemIndex) => (
                    <motion.button
                      key={itemIndex}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => item.path && handleNavigate(item.path)}
                      className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-[hsl(var(--kuaishou-gray-light))] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-[hsl(var(--kuaishou-gray-light))] flex items-center justify-center text-[hsl(var(--kuaishou-text))]">
                        {item.icon}
                      </div>
                      <span className="text-[11px] text-[hsl(var(--kuaishou-text))] text-center leading-tight">
                        {currentLang === 'ba' && item.labelBa ? item.labelBa : item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}

            {/* Language toggle */}
            <div className="p-4 border-b border-[hsl(var(--kuaishou-border))]">
              <p className="text-xs font-semibold text-[hsl(var(--kuaishou-text-muted))] uppercase tracking-wider mb-3">
                {currentLang === 'ba' ? 'Èdè' : 'Langue'}
              </p>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLanguage('fr')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentLang === 'fr'
                      ? 'bg-[hsl(var(--kuaishou-orange))] text-white'
                      : 'bg-[hsl(var(--kuaishou-gray-light))] text-[hsl(var(--kuaishou-text))]'
                  }`}
                >
                  🇫🇷 Français
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLanguage('ba')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currentLang === 'ba'
                      ? 'bg-[hsl(var(--kuaishou-orange))] text-white'
                      : 'bg-[hsl(var(--kuaishou-gray-light))] text-[hsl(var(--kuaishou-text))]'
                  }`}
                >
                  🇧🇯 Bariba
                </motion.button>
              </div>
            </div>

            {/* Admin section */}
            {isAdmin && (
              <div className="p-4">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">
                  🔒 Administration
                </p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavigate('/admin')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-purple-700">Tableau de bord</span>
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KuaishouSideMenu;
