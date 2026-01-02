import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Home, Search, MessageCircle, Users, Zap, 
  Heart, Share2, Bookmark, Volume2, VolumeX, Bell,
  Play, Pause, ChevronRight, Settings, Globe, ShoppingBag,
  User, Star, Music, MapPin, MoreHorizontal, Send, Mic,
  Video, Radio, Headphones, TrendingUp, Plus
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts, TamTamComment } from '@/hooks/useTamTamPosts';
import { useTamTamPolls } from '@/hooks/useTamTamPolls';
import { useRadioFeed } from '@/hooks/useRadioFeed';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { EnhancedPost } from '@/components/tamtam/TamTamEnhancedFeedCard';
import { TamTamStories } from '@/components/tamtam/TamTamStories';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamVocalPoll } from '@/components/tamtam/TamTamVocalPoll';
import { TamTamStoryCreator } from '@/components/tamtam/TamTamStoryCreator';
import { TamTamUserSearch } from '@/components/tamtam/TamTamUserSearch';
import { TamTamFriendSuggestions } from '@/components/tamtam/TamTamFriendSuggestions';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import { TamTamVideoFeed } from '@/components/tamtam/TamTamVideoFeed';
import { TamTamAudioFeed } from '@/components/tamtam/TamTamAudioFeed';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 TAM-TAM SOCIAL - KUAISHOU/TIKTOK IMMERSIVE DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
// Structure exacte des captures:
// - Header transparent flottant avec tabs (🎬 📻 🎤)
// - Menu hamburger avec TOUTES les fonctionnalités
// - Feed plein écran style Kuaishou
// - Bottom nav style TikTok (Fil, Chat, +, Groupes, Direct)
// ═══════════════════════════════════════════════════════════════════════════════

type FeedMode = 'creation' | 'radio' | 'mavoix';
type BottomTab = 'fil' | 'chat' | 'groupes' | 'direct';

// ═══════════════════════════════════════════════════════════════════════════════
// MENU LATÉRAL COMPLET (Hamburger)
// ═══════════════════════════════════════════════════════════════════════════════

const SideMenu: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  onNavigate: (path: string) => void;
  activeBottomTab: BottomTab;
  onBottomTabChange: (tab: BottomTab) => void;
}> = ({ isOpen, onClose, currentLang, onNavigate, activeBottomTab, onBottomTabChange }) => {
  
  // Menu principal (navigation pages)
  const mainMenuItems = [
    { icon: '🏠', label: 'Accueil', labelBa: 'Ilé', path: '/tamtam', gradient: 'from-blue-500 to-cyan-400' },
    { icon: '💬', label: 'Social', labelBa: 'Àwùjọ', path: '/tamtam/social', gradient: 'from-emerald-500 to-teal-400', active: true },
    { icon: '🛒', label: 'Marché', labelBa: 'Ọjà', path: '/tamtam/market', gradient: 'from-orange-500 to-amber-400' },
    { icon: '👤', label: 'Profil', labelBa: 'Profaili', path: '/tamtam/profile', gradient: 'from-purple-500 to-pink-400' },
  ];

  // Sous-menu social (onglets internes)
  const socialTabs = [
    { id: 'fil' as BottomTab, icon: Home, label: 'Fil', labelBa: 'Ìtàn', color: 'text-blue-400' },
    { id: 'chat' as BottomTab, icon: MessageCircle, label: 'Chat', labelBa: 'Ọ̀rọ̀', color: 'text-pink-400' },
    { id: 'groupes' as BottomTab, icon: Users, label: 'Groupes', labelBa: 'Ẹgbẹ́', color: 'text-amber-400' },
    { id: 'direct' as BottomTab, icon: Zap, label: 'Direct', labelBa: 'Tààrà', color: 'text-red-400' },
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[300px] z-50 overflow-y-auto"
            style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #12121f 50%, #0a0a12 100%)' }}
          >
            {/* Header */}
            <div className="sticky top-0 p-5 border-b border-white/10 bg-black/50 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                  >
                    <span className="text-2xl">🥁</span>
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-black text-white">TAM-TAM</h2>
                    <p className="text-[10px] text-white/40">Social Audio</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Navigation Principale */}
            <div className="p-4">
              <p className="text-white/40 text-xs font-medium mb-3 px-2">NAVIGATION</p>
              <div className="space-y-1">
                {mainMenuItems.map((item, index) => (
                  <motion.button
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { onNavigate(item.path); onClose(); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      item.active ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}>
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <span className="text-white font-medium flex-1 text-left">
                      {currentLang === 'ba' ? item.labelBa : item.label}
                    </span>
                    {item.active && (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">
                        ACTIF
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-white/30" />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Sections Social */}
            <div className="p-4 border-t border-white/10">
              <p className="text-white/40 text-xs font-medium mb-3 px-2">SECTIONS SOCIAL</p>
              <div className="grid grid-cols-2 gap-2">
                {socialTabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeBottomTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { onBottomTabChange(tab.id); onClose(); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-white/10 border border-white/20' 
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isActive ? tab.color : 'text-white/50'}`} />
                      <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                        {currentLang === 'ba' ? tab.labelBa : tab.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Paramètres */}
            <div className="p-4 border-t border-white/10">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('/tamtam/settings')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10"
              >
                <Settings className="w-5 h-5 text-white/50" />
                <span className="text-white/50 text-sm">{currentLang === 'ba' ? 'Ètò' : 'Paramètres'}</span>
              </motion.button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-center gap-2">
                <Globe className="w-4 h-4 text-white/30" />
                <span className="text-white/30 text-xs">{currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HEADER FLOTTANT TRANSPARENT (Style TikTok exact)
// ═══════════════════════════════════════════════════════════════════════════════

const FloatingHeader: React.FC<{
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  onMenuOpen: () => void;
  onSearch: () => void;
  currentLang: string;
  liveCount?: number;
}> = ({ currentMode, onModeChange, onMenuOpen, onSearch, currentLang, liveCount = 0 }) => {
  
  const feedModes = [
    { id: 'creation' as FeedMode, label: '🎬 Création', labelBa: '🎬 Ṣíṣẹ̀dá' },
    { id: 'radio' as FeedMode, label: '📻 Radio', labelBa: '📻 Rédíò' },
    { id: 'mavoix' as FeedMode, label: '🎤 Ma Voix', labelBa: '🎤 Ohùn Mi' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-area-top">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-transparent pointer-events-none" />
      
      <div className="relative px-4 py-3 flex items-center justify-between">
        {/* Menu Hamburger */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onMenuOpen}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10"
        >
          <Menu className="w-5 h-5 text-white" />
        </motion.button>

        {/* Feed Mode Tabs */}
        <div className="flex items-center gap-0">
          {/* Live badge */}
          {liveCount > 0 && (
            <motion.div 
              className="flex items-center gap-1.5 px-2.5 py-1 mr-2 rounded-full border border-red-500/30"
              style={{ background: 'rgba(239, 68, 68, 0.15)' }}
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-[10px] font-bold">LIVE</span>
            </motion.div>
          )}
          
          {feedModes.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onModeChange(mode.id)}
                className="relative px-3 py-2"
              >
                <span className={`text-[13px] font-semibold whitespace-nowrap transition-all ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}>
                  {currentLang === 'ba' ? mode.labelBa : mode.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="headerActiveTab"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-white"
                    transition={{ type: 'spring', bounce: 0.25 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Search */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onSearch}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center border border-white/10"
        >
          <Search className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// BOTTOM NAVIGATION (Style TikTok exact)
// ═══════════════════════════════════════════════════════════════════════════════

const BottomNavigation: React.FC<{
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  onCreatePress: () => void;
  currentLang: string;
  unreadMessages?: number;
}> = ({ activeTab, onTabChange, onCreatePress, currentLang, unreadMessages = 0 }) => {
  
  const tabs = [
    { id: 'fil' as BottomTab, icon: Home, label: 'Fil', labelBa: 'Ilé' },
    { id: 'chat' as BottomTab, icon: MessageCircle, label: 'Chat', labelBa: 'Ọ̀rọ̀' },
    { id: 'groupes' as BottomTab, icon: Users, label: 'Groupes', labelBa: 'Ẹgbẹ́' },
    { id: 'direct' as BottomTab, icon: Zap, label: 'Direct', labelBa: 'Tààrà' },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-40 safe-area-bottom"
      style={{ 
        background: 'rgba(0, 0, 0, 0.97)', 
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}
    >
      <div className="flex items-center justify-around py-1.5">
        {/* Fil & Chat */}
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 px-5 py-1.5 relative min-w-[60px]"
            >
              <Icon 
                className={`w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-white/40'}`} 
                strokeWidth={isActive ? 2.5 : 1.5} 
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/40'}`}>
                {currentLang === 'ba' ? tab.labelBa : tab.label}
              </span>
              {tab.id === 'chat' && unreadMessages > 0 && (
                <span className="absolute top-0 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Bouton Create - Style TikTok */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onCreatePress}
          className="relative -mt-4"
        >
          <div className="relative w-[52px] h-8 rounded-lg overflow-hidden shadow-xl">
            {/* Gradient cyan gauche */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500" />
            {/* Gradient rose droite */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-rose-500 to-red-500" 
              style={{ clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 20% 100%)' }} 
            />
            {/* Plus central */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
          </div>
        </motion.button>

        {/* Groupes & Direct */}
        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 px-5 py-1.5 relative min-w-[60px]"
            >
              {tab.id === 'direct' && (
                <motion.span
                  className="absolute top-0 right-3 w-2 h-2 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
              <Icon 
                className={`w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-white/40'}`} 
                strokeWidth={isActive ? 2.5 : 1.5} 
              />
              <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/40'}`}>
                {currentLang === 'ba' ? tab.labelBa : tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEED CARD (Style Kuaishou)
// ═══════════════════════════════════════════════════════════════════════════════

const FeedCard: React.FC<{
  post: any;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  currentLang: string;
}> = ({ post, onLike, onComment, onShare, onSave, currentLang }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black flex items-center justify-center">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, 
            hsl(${(post.id?.charCodeAt(0) || 0) * 10 % 360}, 60%, 20%) 0%, 
            hsl(${(post.id?.charCodeAt(1) || 0) * 10 % 360}, 50%, 15%) 100%)`
        }}
      />

      {/* Contenu central */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 text-center px-12 max-w-lg"
      >
        <span className="text-7xl mb-6 block">{post.feeling_emoji || '🎵'}</span>
        <p className="text-white text-lg font-medium leading-relaxed line-clamp-4">
          {post.transcript_fr || post.transcript || 'Contenu TAM-TAM'}
        </p>
      </motion.div>

      {/* Actions droite - Style Kuaishou */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-20">
        {/* Avatar + Follow */}
        <motion.div whileTap={{ scale: 0.9 }} className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center border-2 border-white overflow-hidden">
            {post.profile?.avatar_url ? (
              <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-black">
            <Plus className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        </motion.div>

        {/* Like */}
        <motion.button 
          whileTap={{ scale: 0.8 }} 
          onClick={() => { setIsLiked(!isLiked); onLike(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
            isLiked ? 'bg-red-500' : 'bg-black/40 backdrop-blur-sm border border-white/10'
          }`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[11px] font-semibold">{post.reactions_count || 0}</span>
        </motion.button>

        {/* Comment */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={onComment} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[11px] font-semibold">{post.comments_count || 0}</span>
        </motion.button>

        {/* Favoris */}
        <motion.button 
          whileTap={{ scale: 0.8 }} 
          onClick={() => { setIsSaved(!isSaved); onSave(); }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${
            isSaved ? 'bg-amber-500' : 'bg-black/40 backdrop-blur-sm border border-white/10'
          }`}>
            <Star className={`w-6 h-6 ${isSaved ? 'text-white fill-white' : 'text-white'}`} />
          </div>
          <span className="text-white text-[11px] font-semibold">{isSaved ? 1 : 0}</span>
        </motion.button>

        {/* Share */}
        <motion.button whileTap={{ scale: 0.8 }} onClick={onShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[11px] font-semibold">0</span>
        </motion.button>
      </div>

      {/* Info bas gauche - Style TikTok */}
      <div className="absolute left-4 bottom-24 max-w-[65%] z-20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-sm">@{post.profile?.username || 'tamtam_user'}</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-bold"
          >
            + {currentLang === 'ba' ? 'Tẹ̀lé' : 'Suivre'}
          </motion.button>
        </div>
        <p className="text-white/90 text-[13px] line-clamp-2 leading-relaxed">
          {post.transcript_fr?.slice(0, 80) || 'Contenu audio TAM-TAM'} #Culture #Bénin
        </p>
        
        {/* Musique */}
        <div className="flex items-center gap-2 mt-2 overflow-hidden">
          <Music className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <motion.span 
            className="text-white/70 text-[11px] whitespace-nowrap"
            animate={{ x: [0, -100, 0] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          >
            🎵 Son original - TAM-TAM Radio
          </motion.span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const SearchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
}> = ({ isOpen, onClose, currentLang }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50"
      >
        <div className="p-4 pt-safe">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder={currentLang === 'ba' ? 'Wá...' : 'Rechercher...'}
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
            />
            <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-5 h-5 text-white/40" />
            </motion.button>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-pink-400" />
              <span className="text-white/80 text-sm font-medium">{currentLang === 'ba' ? 'Gbajúmọ̀' : 'Tendances'}</span>
            </div>
            <div className="space-y-1">
              {['🎵 Musique', '📖 Contes', '🌾 Agriculture', '🩺 Santé', '🎭 Culture'].map((item, i) => (
                <motion.button
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-white/80 flex items-center gap-3"
                >
                  <span className="text-xl">{item.split(' ')[0]}</span>
                  <span className="text-sm">{item.split(' ').slice(1).join(' ')}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function TamTamSocial() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLang } = useTamTamLanguage();
  const { announceScreen } = useAudioDescription();
  const { toast } = useToast();
  
  const { posts, stories, isLoading, createPost, addReaction, fetchComments, addComment, fetchPosts } = useTamTamPosts();
  const { polls } = useTamTamPolls();
  const { rankPosts } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  // États
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [unreadMessages] = useState(3);
  const [liveCount] = useState(2);

  const [commentsModal, setCommentsModal] = useState<{
    isOpen: boolean;
    postId: string | null;
    comments: TamTamComment[];
    isLoading: boolean;
  }>({ isOpen: false, postId: null, comments: [], isLoading: false });

  // Gestion navigation depuis autres pages
  useEffect(() => {
    const state = location.state as any;
    if (state?.tab) {
      setActiveTab(state.tab === 'messages' ? 'chat' : state.tab === 'communities' ? 'groupes' : state.tab === 'live' ? 'direct' : 'fil');
    }
    if (state?.openCreator) setShowCreator(true);
  }, [location.state]);

  useEffect(() => { announceScreen('social'); }, [announceScreen]);

  const handleNavigate = useCallback((path: string) => {
    triggerFeedback('click');
    navigate(path);
  }, [navigate]);

  const handleOpenComments = useCallback(async (postId: string) => {
    setCommentsModal({ isOpen: true, postId, comments: [], isLoading: true });
    const comments = await fetchComments(postId);
    setCommentsModal(prev => ({ ...prev, comments, isLoading: false }));
  }, [fetchComments]);

  const handleShare = useCallback((postId: string) => {
    triggerFeedback('send');
    if (navigator.share) {
      navigator.share({ title: 'TAM-TAM', text: 'Découvrez ce contenu !', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "🔗 Lien copié !" });
    }
  }, [toast]);

  // Posts transformés
  const rankedPosts = useMemo(() => {
    const enhanced = posts.map(post => ({
      ...post,
      media_type: (post as any).media_type || 'audio',
      transcript_fr: (post as any).transcript_fr || (post as any).transcript || null,
      feeling_emoji: (post as any).feeling_emoji || null,
    }));
    return rankPosts(enhanced as EnhancedPost[]);
  }, [posts, rankPosts]);

  return (
    <div className="min-h-screen bg-black">
      {/* Menu Latéral */}
      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentLang={currentLang}
        onNavigate={handleNavigate}
        activeBottomTab={activeTab}
        onBottomTabChange={setActiveTab}
      />

      {/* Header Flottant */}
      <FloatingHeader
        currentMode={feedMode}
        onModeChange={setFeedMode}
        onMenuOpen={() => setIsMenuOpen(true)}
        onSearch={() => setShowSearch(true)}
        currentLang={currentLang}
        liveCount={liveCount}
      />

      {/* Contenu principal */}
      <AnimatePresence mode="wait">
        {activeTab === 'fil' && (
          <motion.div
            key="fil"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          >
            {isLoading ? (
              <div className="h-screen flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-10 h-10 border-3 border-white border-t-transparent rounded-full" />
              </div>
            ) : rankedPosts.length > 0 ? (
              rankedPosts.map((post) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  onLike={() => addReaction(post.id, 'like')}
                  onComment={() => handleOpenComments(post.id)}
                  onShare={() => handleShare(post.id)}
                  onSave={() => triggerFeedback('success')}
                  currentLang={currentLang}
                />
              ))
            ) : (
              <div className="h-screen flex flex-col items-center justify-center px-8">
                <span className="text-6xl mb-4">🥁</span>
                <p className="text-white/50 text-center mb-6">{currentLang === 'ba' ? 'Kò sí àkóónú' : 'Aucun contenu'}</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreator(true)} className="px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-bold">
                  {currentLang === 'ba' ? 'Ṣẹ̀dá' : 'Créer'}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16 pb-16 min-h-screen bg-gray-950">
            <TamTamMessagesHub isOpen={true} onClose={() => setActiveTab('fil')} />
          </motion.div>
        )}

        {activeTab === 'groupes' && (
          <motion.div key="groupes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16 pb-16 min-h-screen bg-gray-950">
            <TamTamCommunities />
          </motion.div>
        )}

        {activeTab === 'direct' && (
          <motion.div key="direct" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16 pb-16 min-h-screen bg-gray-950">
            <TamTamLiveList />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreatePress={() => setShowCreator(true)}
        currentLang={currentLang}
        unreadMessages={unreadMessages}
      />

      {/* Modals */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} currentLang={currentLang} />

      <TamTamCommentsModal
        isOpen={commentsModal.isOpen}
        onClose={() => setCommentsModal(prev => ({ ...prev, isOpen: false }))}
        comments={commentsModal.comments}
        onAddComment={async () => {}}
        isLoading={commentsModal.isLoading}
      />

      <TamTamCreatePost
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSubmit={async (data) => { await createPost(data); triggerFeedback('success'); toast({ title: "✅ Publié !" }); }}
        onOpenPoll={() => setShowCreatePoll(true)}
      />

      <TamTamVocalPoll isOpen={showCreatePoll} onClose={() => setShowCreatePoll(false)} />
      <TamTamStoryCreator isOpen={showStoryCreator} onClose={() => setShowStoryCreator(false)} onStoryCreated={() => fetchPosts()} />
      <TamTamUserSearch isOpen={showUserSearch} onClose={() => setShowUserSearch(false)} onMessage={() => setActiveTab('chat')} />

      <FullscreenCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        onComplete={async (data) => {
          await createPost({
            audio_url: data.audio_url,
            media_type: data.media_type,
            media_url: data.media_url,
            transcript_fr: data.transcript_fr || '',
            transcript_ba: data.transcript_ba || '',
            topic: data.topic,
            template_id: data.template_id,
            duration_seconds: data.duration_seconds,
          });
          toast({ title: "✅ Publié !" });
          triggerFeedback('success');
          fetchPosts();
          setShowCreator(false);
        }}
      />
    </div>
  );
}

export { TamTamSocial };
