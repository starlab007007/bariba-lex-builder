import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, MessageCircle, Users, Send, Menu, X, Search,
  Video, Radio, Mic, ShoppingBag, User, Sparkles,
  Bell, Plus, TrendingUp, MapPin, Loader2
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type FeedTab = 'pour_toi' | 'suivis' | 'explorer' | 'autour';
type BottomTab = 'fil' | 'chat' | 'groupes' | 'direct';

interface MenuItem {
  icon: string;
  labelFr: string;
  labelBa: string;
  path: string;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════

const menuItems: MenuItem[] = [
  { icon: '🏠', labelFr: 'Accueil', labelBa: 'Ilé', path: '/home', color: 'from-blue-500 to-indigo-600' },
  { icon: '💬', labelFr: 'Social', labelBa: 'Àwùjọ', path: '/social', color: 'from-emerald-500 to-teal-600' },
  { icon: '🛒', labelFr: 'Marché', labelBa: 'Ọjà', path: '/market', color: 'from-orange-500 to-red-600' },
  { icon: '👤', labelFr: 'Profil', labelBa: 'Àkọsílẹ̀', path: '/profile', color: 'from-purple-500 to-pink-600' },
  { icon: '🆘', labelFr: 'SOS', labelBa: 'Ìrànwọ́', path: '/sos', color: 'from-red-600 to-rose-700' },
  { icon: '📖', labelFr: 'Dictionnaire', labelBa: 'Ìwé-ìtumọ̀', path: '/dictionary', color: 'from-indigo-500 to-violet-600' },
];

const mockPosts = [
  {
    id: '1',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400',
    author: 'Aïcha Kora',
    avatar: '👩🏾',
    title: 'Danse traditionnelle Bariba 💃',
    likes: '2.8k',
    comments: '124',
    isNew: true
  },
  {
    id: '2',
    type: 'audio',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    author: 'Mamadou Beat',
    avatar: '👨🏿',
    title: 'Conte: Le Lion et la Gazelle 🦁',
    likes: '1.2k',
    comments: '89',
    isNew: false
  },
  {
    id: '3',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?w=400',
    author: 'Kofi Agri',
    avatar: '🧑🏿',
    title: 'Technique de culture du mil 🌾',
    likes: '892',
    comments: '45',
    isNew: true
  },
  {
    id: '4',
    type: 'video',
    thumbnail: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
    author: 'Fatou Style',
    avatar: '👩🏾',
    title: 'Marché de Parakou 🛍️',
    likes: '3.1k',
    comments: '201',
    isNew: false
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: MENU LATÉRAL
// ═══════════════════════════════════════════════════════════════════════════

const SideMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: 'fr' | 'ba';
}> = ({ isOpen, onClose, currentLang }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">TamTam</h2>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* User profile summary */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <p className="text-white font-semibold">Utilisateur</p>
                  <p className="text-white/60 text-sm">@tam_tam_user</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.path}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    console.log('Navigate to:', item.path);
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">
                      {currentLang === 'ba' ? item.labelBa : item.labelFr}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/50">
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all">
                🌐 {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT: CARTE DE POST
// ═══════════════════════════════════════════════════════════════════════════

const PostCard: React.FC<{ post: typeof mockPosts[0] }> = ({ post }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative rounded-2xl overflow-hidden shadow-lg cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="aspect-[3/4] relative">
        <img
          src={post.thumbnail}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Badge NEW */}
        {post.isNew && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            NEW
          </div>
        )}
        
        {/* Type badge */}
        <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
          {post.type === 'video' ? (
            <Video className="w-5 h-5 text-white" />
          ) : (
            <Radio className="w-5 h-5 text-white" />
          )}
        </div>
        
        {/* Content info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Author */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg">
              {post.avatar}
            </div>
            <span className="text-white text-sm font-medium">{post.author}</span>
          </div>
          
          {/* Title */}
          <p className="text-white font-semibold text-sm line-clamp-2 mb-2">
            {post.title}
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-white/80 text-xs">
            <span className="flex items-center gap-1">
              ❤️ {post.likes}
            </span>
            <span className="flex items-center gap-1">
              💬 {post.comments}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function TamTamHome() {
  const [currentLang, setCurrentLang] = useState<'fr' | 'ba'>('fr');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [feedTab, setFeedTab] = useState<FeedTab>('pour_toi');
  const [bottomTab, setBottomTab] = useState<BottomTab>('fil');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const feedTabs: { id: FeedTab; labelFr: string; labelBa: string }[] = [
    { id: 'pour_toi', labelFr: 'Pour toi', labelBa: 'Fún ọ' },
    { id: 'suivis', labelFr: 'Suivis', labelBa: 'Tẹ̀lé' },
    { id: 'explorer', labelFr: 'Explorer', labelBa: 'Ṣàwárí' },
    { id: 'autour', labelFr: 'Autour', labelBa: 'Àyíká' },
  ];

  const bottomTabs: { id: BottomTab; icon: any; labelFr: string; labelBa: string }[] = [
    { id: 'fil', icon: Home, labelFr: 'Fil', labelBa: 'Ilé' },
    { id: 'chat', icon: MessageCircle, labelFr: 'Chat', labelBa: 'Ìbánisọ̀rọ̀' },
    { id: 'groupes', icon: Users, labelFr: 'Groupes', labelBa: 'Àwọn ẹgbẹ́' },
    { id: 'direct', icon: Send, labelFr: 'Direct', labelBa: 'Táàrá' },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col">
      
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TOP BAR - Transparent avec boutons création */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 via-black/60 to-transparent pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          
          {/* Menu hamburger */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Menu className="w-5 h-5 text-white" />
          </motion.button>

          {/* Boutons création au centre */}
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => console.log('Création Vidéo')}
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">
                🎬 {currentLang === 'ba' ? 'Fídíò' : 'Vidéos'}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => console.log('Radio Patrimoine')}
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Radio className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">
                📻 {currentLang === 'ba' ? 'Rédíò' : 'Radio'}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => console.log('Ma Voix')}
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Mic className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">
                🎤 {currentLang === 'ba' ? 'Ohùn mi' : 'Ma Voix'}
              </span>
            </motion.button>
          </div>

          {/* Recherche */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Search className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Barre de recherche expandable */}
        <AnimatePresence>
          {isSearchVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-3 overflow-hidden"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={currentLang === 'ba' ? 'Wá...' : 'Rechercher...'}
                  className="w-full pl-12 pr-4 py-3 rounded-full bg-white/10 backdrop-blur-md text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Onglets de feed */}
        <div className="flex justify-center gap-6 px-4 py-2">
          {feedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFeedTab(tab.id)}
              className="relative py-2 px-1"
            >
              <span className={`text-sm font-semibold transition-colors ${
                feedTab === tab.id ? 'text-white' : 'text-white/60'
              }`}>
                {currentLang === 'ba' ? tab.labelBa : tab.labelFr}
              </span>
              {feedTab === tab.id && (
                <motion.div
                  layoutId="feedTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTENU PRINCIPAL - Grille de posts */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto pt-40 pb-24 px-3">
        <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
          {mockPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOTTOM NAVIGATION BAR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 pb-safe z-20">
        <div className="flex items-center justify-around px-2 py-3">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = bottomTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => setBottomTab(tab.id)}
                className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors"
              >
                <div className={`relative ${isActive ? 'text-white' : 'text-white/60'}`}>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  {tab.id === 'chat' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">3</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isActive ? 'text-white' : 'text-white/60'
                }`}>
                  {currentLang === 'ba' ? tab.labelBa : tab.labelFr}
                </span>
              </motion.button>
            );
          })}

          {/* Bouton création central */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => console.log('Créer')}
            className="relative -mt-6"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <Plus className="w-7 h-7 text-white" strokeWidth={3} />
            </div>
            {/* Pulse animation */}
            <motion.div
              className="absolute inset-0 rounded-full bg-purple-400/30"
              animate={{
                scale: [1, 1.3, 1.3],
                opacity: [0.5, 0, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
          </motion.button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MENU LATÉRAL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentLang={currentLang}
      />
    </div>
  );
}
