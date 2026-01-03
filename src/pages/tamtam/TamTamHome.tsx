import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, PlusCircle, ShoppingBag, User } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// NAVIGATION BASSE - STYLE KUAISHOU/TIKTOK
// ═══════════════════════════════════════════════════════════════
// Fond noir opaque, bouton + central qui dépasse
// ═══════════════════════════════════════════════════════════════

type TabId = 'home' | 'social' | 'create' | 'market' | 'profile';

interface Tab {
  id: TabId;
  icon: React.ComponentType<any>;
  label: string;
  emoji?: string;
}

const tabs: Tab[] = [
  { id: 'home', icon: Home, label: 'Home', emoji: '🏠' },
  { id: 'social', icon: Users, label: 'Social', emoji: '👥' },
  { id: 'create', icon: PlusCircle, label: 'CREATE', emoji: '➕' },
  { id: 'market', icon: ShoppingBag, label: 'Market', emoji: '🛒' },
  { id: 'profile', icon: User, label: 'Moi', emoji: '👤' },
];

export default function TamTamHome() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <FeedContent />;
      case 'social':
        return <SocialContent />;
      case 'market':
        return <MarketContent />;
      case 'profile':
        return <ProfileContent />;
      default:
        return <FeedContent />;
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B0B0B]">
      {/* Content Area */}
      <div className="absolute inset-0 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* BOTTOM NAVIGATION - FOND NOIR OPAQUE */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
        style={{
          backgroundColor: '#0B0B0B',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-end justify-around px-2 pt-2 pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isCreateButton = tab.id === 'create';

            if (isCreateButton) {
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateMenu(true)}
                  className="relative -mt-6"
                >
                  {/* Bouton CREATE qui DÉPASSE */}
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-[#FF7A00] blur-xl opacity-50 rounded-full" />
                    
                    {/* Main button */}
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-2xl">
                      <PlusCircle className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  
                  {/* Label */}
                  <span className="block text-[10px] font-bold text-white mt-1 text-center">
                    {tab.label}
                  </span>
                </motion.button>
              );
            }

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center gap-1 py-2 px-3 min-w-[60px]"
              >
                <Icon 
                  className={`w-6 h-6 transition-colors ${
                    isActive ? 'text-[#FF7A00]' : 'text-[#999999]'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[#FF7A00]' : 'text-[#999999]'
                }`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* Create Menu Modal */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateMenu(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] rounded-3xl p-6 w-[90vw] max-w-sm"
            >
              <h3 className="text-white text-lg font-bold mb-4 text-center">
                Créer du contenu
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <CreateOption
                  emoji="🎥"
                  label="Vidéo 15s"
                  color="from-blue-500 to-purple-500"
                  onClick={() => {}}
                />
                <CreateOption
                  emoji="🎥"
                  label="Vidéo 60s"
                  color="from-purple-500 to-pink-500"
                  onClick={() => {}}
                />
                <CreateOption
                  emoji="🎙️"
                  label="Audio"
                  color="from-orange-500 to-red-500"
                  onClick={() => {}}
                />
                <CreateOption
                  emoji="📸"
                  label="Photo"
                  color="from-teal-500 to-cyan-500"
                  onClick={() => {}}
                />
                <CreateOption
                  emoji="📖"
                  label="Story"
                  color="from-pink-500 to-rose-500"
                  onClick={() => {}}
                />
                <CreateOption
                  emoji="📊"
                  label="Sondage"
                  color="from-green-500 to-emerald-500"
                  onClick={() => {}}
                />
              </div>

              <button
                onClick={() => setShowCreateMenu(false)}
                className="mt-4 w-full py-3 rounded-xl bg-white/10 text-white font-medium"
              >
                Annuler
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANTS HELPERS
// ═══════════════════════════════════════════════════════════════

interface CreateOptionProps {
  emoji: string;
  label: string;
  color: string;
  onClick: () => void;
}

const CreateOption = ({ emoji, label, color, onClick }: CreateOptionProps) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex flex-col items-center gap-2"
  >
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl shadow-lg`}>
      {emoji}
    </div>
    <span className="text-white text-xs font-medium text-center leading-tight">
      {label}
    </span>
  </motion.button>
);

// Content placeholders
const FeedContent = () => (
  <div className="h-full bg-[#0B0B0B] text-white flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">📰</div>
      <p className="text-xl font-bold">Feed Principal</p>
      <p className="text-sm text-[#999999] mt-2">Swipe vertical pour naviguer</p>
    </div>
  </div>
);

const SocialContent = () => (
  <div className="h-full bg-[#0B0B0B] text-white flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">👥</div>
      <p className="text-xl font-bold">Social</p>
      <p className="text-sm text-[#999999] mt-2">Vos amis et communauté</p>
    </div>
  </div>
);

const MarketContent = () => (
  <div className="h-full bg-[#0B0B0B] text-white flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">🛒</div>
      <p className="text-xl font-bold">Market</p>
      <p className="text-sm text-[#999999] mt-2">Acheter et vendre</p>
    </div>
  </div>
);

const ProfileContent = () => (
  <div className="h-full bg-[#0B0B0B] text-white flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">👤</div>
      <p className="text-xl font-bold">Mon Profil</p>
      <p className="text-sm text-[#999999] mt-2">Vos contenus et statistiques</p>
    </div>
  </div>
);
