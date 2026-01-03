import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Search, MessageCircle, Users, Zap, Heart, Share2, Star, Music, Plus, Bell, Mic, ChevronRight, Settings, Globe, ShoppingBag, User, Video, Camera, Radio, Headphones, FileText, BarChart3, Sparkles, Volume2, Download, Flag, MoreHorizontal, TrendingUp, PlusCircle, Play, Pause } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts, TamTamComment } from '@/hooks/useTamTamPosts';
import { useTamTamPolls } from '@/hooks/useTamTamPolls';
import { useFeedAlgorithm } from '@/hooks/useFeedAlgorithm';
import { EnhancedPost } from '@/components/tamtam/TamTamEnhancedFeedCard';
import { TamTamCommentsModal } from '@/components/tamtam/TamTamCommentsModal';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost';
import { TamTamVocalPoll } from '@/components/tamtam/TamTamVocalPoll';
import { TamTamStoryCreator } from '@/components/tamtam/TamTamStoryCreator';
import { TamTamUserSearch } from '@/components/tamtam/TamTamUserSearch';
import { TamTamCommunities } from '@/components/tamtam/TamTamCommunities';
import { TamTamLiveList } from '@/components/tamtam/TamTamLiveList';
import { TamTamMessagesHub } from '@/components/tamtam/TamTamMessagesHub';
import FullscreenCreator from '@/components/tamtam/FullscreenCreator';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

type FeedMode = 'creation' | 'radio' | 'mavoix';
type BottomTab = 'fil' | 'chat' | 'groupes' | 'direct';

const createOptions = [
  { id: 'patrimoine', emoji: '📻', label: 'Patrimoine Audio', labelBa: 'Ohun Àṣà', description: 'Partagez la culture', gradient: 'from-amber-500 to-orange-600', category: 'publication' },
  { id: 'mavoix', emoji: '🎤', label: 'Ma Voix', labelBa: 'Ohùn Mi', description: 'Message vocal', gradient: 'from-emerald-500 to-teal-600', category: 'publication' },
  { id: 'story', emoji: '📖', label: 'Story', labelBa: 'Ìtàn', description: 'Histoire 24h', gradient: 'from-pink-500 to-rose-600', category: 'publication' },
  { id: 'video15', emoji: '🎥', label: 'Vidéo 15s', labelBa: 'Fídíò 15s', description: 'Clip court', gradient: 'from-blue-500 to-indigo-600', category: 'content' },
  { id: 'video60', emoji: '🎬', label: 'Vidéo 60s', labelBa: 'Fídíò 60s', description: 'Vidéo longue', gradient: 'from-purple-500 to-violet-600', category: 'content' },
  { id: 'photo', emoji: '📸', label: 'Photo', labelBa: 'Fọ́tò', description: 'Image/Carrousel', gradient: 'from-cyan-500 to-blue-600', category: 'content' },
  { id: 'poll', emoji: '📊', label: 'Sondage Vocal', labelBa: 'Ìdìbò', description: 'Question audio', gradient: 'from-green-500 to-emerald-600', category: 'special' },
  { id: 'live', emoji: '🔴', label: 'Live', labelBa: 'Tààrà', description: 'Diffusion direct', gradient: 'from-red-500 to-rose-600', category: 'special' },
];

const CreateMenu: React.FC<{ isOpen: boolean; onClose: () => void; onSelect: (id: string) => void; currentLang: string }> = ({ isOpen, onClose, onSelect, currentLang }) => {
  const pub = createOptions.filter(o => o.category === 'publication');
  const cnt = createOptions.filter(o => o.category === 'content');
  const spc = createOptions.filter(o => o.category === 'special');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl" style={{ background: '#1A1A1A', maxHeight: '85vh' }}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-12 h-1.5 rounded-full bg-white/20" /></div>
            <div className="px-6 pb-4 flex items-center justify-between">
              <div><h2 className="text-white text-xl font-bold">{currentLang === 'ba' ? 'Ṣẹ̀dá' : 'Créer'}</h2><p className="text-[#999] text-sm">Choisissez votre contenu</p></div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><X className="w-5 h-5 text-white" /></motion.button>
            </div>
            <div className="px-4 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 100px)' }}>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-2"><Radio className="w-4 h-4 text-[#FF7A00]" /><span className="text-[#FF7A00] text-xs font-bold uppercase">Publications</span></div>
                <div className="grid grid-cols-3 gap-3">{pub.map((o, i) => (<motion.button key={o.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={() => onSelect(o.id)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5"><div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${o.gradient} flex items-center justify-center text-3xl`}>{o.emoji}</div><span className="text-white text-xs font-medium">{currentLang === 'ba' ? o.labelBa : o.label}</span></motion.button>))}</div>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 px-2"><Video className="w-4 h-4 text-blue-400" /><span className="text-blue-400 text-xs font-bold uppercase">Contenu</span></div>
                <div className="grid grid-cols-3 gap-3">{cnt.map((o, i) => (<motion.button key={o.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={() => onSelect(o.id)} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5"><div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${o.gradient} flex items-center justify-center text-3xl`}>{o.emoji}</div><span className="text-white text-xs font-medium">{currentLang === 'ba' ? o.labelBa : o.label}</span></motion.button>))}</div>
              </div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3 px-2"><Sparkles className="w-4 h-4 text-purple-400" /><span className="text-purple-400 text-xs font-bold uppercase">Spécial</span></div>
                <div className="grid grid-cols-2 gap-3">{spc.map((o, i) => (<motion.button key={o.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={() => onSelect(o.id)} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${o.gradient} flex items-center justify-center text-2xl`}>{o.emoji}</div><div className="text-left"><span className="text-white text-sm font-medium block">{currentLang === 'ba' ? o.labelBa : o.label}</span><span className="text-[#999] text-xs">{o.description}</span></div></motion.button>))}</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FloatingHeader: React.FC<{ currentMode: FeedMode; onModeChange: (m: FeedMode) => void; onMenuOpen: () => void; onSearch: () => void; currentLang: string; liveCount?: number }> = ({ currentMode, onModeChange, onMenuOpen, onSearch, currentLang, liveCount = 0 }) => {
  const modes = [{ id: 'creation' as FeedMode, label: '🎬 Création' }, { id: 'radio' as FeedMode, label: '📻 Radio' }, { id: 'mavoix' as FeedMode, label: '🎤 Ma Voix' }];
  return (
    <div className="fixed top-0 left-0 right-0 z-40 safe-area-top">
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none" />
      <div className="relative px-4 py-3 flex items-center justify-between">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onMenuOpen} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}><Menu className="w-5 h-5 text-white" /></motion.button>
        <div className="flex items-center gap-0">
          {liveCount > 0 && <motion.div className="flex items-center gap-1 px-2 py-1 mr-2 rounded-full" style={{ background: 'rgba(239,68,68,0.2)' }} animate={{ opacity: [1, 0.7, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><span className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-red-400 text-[10px] font-bold">LIVE</span></motion.div>}
          {modes.map((m) => (<motion.button key={m.id} whileTap={{ scale: 0.95 }} onClick={() => onModeChange(m.id)} className="relative px-3 py-2"><span className={`text-[13px] font-semibold ${currentMode === m.id ? 'text-white' : 'text-[#999]'}`}>{m.label}</span>{currentMode === m.id && <motion.div layoutId="headerTab" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-[#FF7A00]" />}</motion.button>))}
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onSearch} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}><Search className="w-5 h-5 text-white" /></motion.button>
      </div>
    </div>
  );
};

const BottomNavigation: React.FC<{ activeTab: BottomTab; onTabChange: (t: BottomTab) => void; onCreatePress: () => void; currentLang: string; unreadMessages?: number }> = ({ activeTab, onTabChange, onCreatePress, currentLang, unreadMessages = 0 }) => {
  const tabs: { id: BottomTab; icon: typeof Home; label: string }[] = [{ id: 'fil', icon: Home, label: 'Fil' }, { id: 'chat', icon: MessageCircle, label: 'Chat' }, { id: 'groupes', icon: Users, label: 'Groupes' }, { id: 'direct', icon: Zap, label: 'Direct' }];
  return (
    <motion.nav initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 z-40 border-t" style={{ backgroundColor: '#0B0B0B', borderColor: 'rgba(255,255,255,0.1)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-end justify-around px-2 pt-2 pb-1">
        {tabs.slice(0, 2).map((t) => { const I = t.icon; const a = activeTab === t.id; return (<motion.button key={t.id} whileTap={{ scale: 0.9 }} onClick={() => onTabChange(t.id)} className="flex flex-col items-center gap-0.5 px-4 py-1.5 relative min-w-[55px]"><I className={`w-6 h-6 ${a ? 'text-white' : 'text-[#999]'}`} /><span className={`text-[10px] font-medium ${a ? 'text-white' : 'text-[#999]'}`}>{t.label}</span>{t.id === 'chat' && unreadMessages > 0 && <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{unreadMessages}</span>}</motion.button>); })}
        <motion.button whileTap={{ scale: 0.9 }} onClick={onCreatePress} className="relative -mt-5"><div className="relative w-14 h-10 rounded-lg overflow-hidden shadow-xl"><div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500" /><div className="absolute inset-0 bg-gradient-to-r from-[#FF7A00] to-red-500" style={{ clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 15% 100%)' }} /><div className="absolute inset-0 flex items-center justify-center"><Plus className="w-6 h-6 text-white" strokeWidth={3} /></div></div></motion.button>
        {tabs.slice(2).map((t) => { const I = t.icon; const a = activeTab === t.id; return (<motion.button key={t.id} whileTap={{ scale: 0.9 }} onClick={() => onTabChange(t.id)} className="flex flex-col items-center gap-0.5 px-4 py-1.5 relative min-w-[55px]">{t.id === 'direct' && <motion.span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />}<I className={`w-6 h-6 ${a ? 'text-white' : 'text-[#999]'}`} /><span className={`text-[10px] font-medium ${a ? 'text-white' : 'text-[#999]'}`}>{t.label}</span></motion.button>); })}
      </div>
    </motion.nav>
  );
};

const SideMenu: React.FC<{ isOpen: boolean; onClose: () => void; currentLang: string; onNavigate: (p: string) => void; activeBottomTab: BottomTab; onBottomTabChange: (t: BottomTab) => void }> = ({ isOpen, onClose, currentLang, onNavigate, activeBottomTab, onBottomTabChange }) => {
  const items = [{ icon: '🏠', label: 'Accueil', path: '/tamtam', gradient: 'from-blue-500 to-cyan-400' }, { icon: '💬', label: 'Social', path: '/tamtam/social', gradient: 'from-emerald-500 to-teal-400', active: true }, { icon: '📻', label: 'Radio', path: '/tamtam/radio', gradient: 'from-amber-500 to-orange-400' }, { icon: '🛒', label: 'Marché', path: '/tamtam/market', gradient: 'from-orange-500 to-red-400' }, { icon: '👤', label: 'Profil', path: '/tamtam/profile', gradient: 'from-purple-500 to-pink-400' }];
  const sTabs: { id: BottomTab; icon: typeof Home; label: string; color: string }[] = [{ id: 'fil', icon: Home, label: 'Fil', color: 'text-blue-400' }, { id: 'chat', icon: MessageCircle, label: 'Chat', color: 'text-pink-400' }, { id: 'groupes', icon: Users, label: 'Groupes', color: 'text-amber-400' }, { id: 'direct', icon: Zap, label: 'Direct', color: 'text-red-400' }];
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed left-0 top-0 bottom-0 w-[300px] z-50 overflow-y-auto" style={{ background: '#0B0B0B' }}>
            <div className="sticky top-0 p-5 border-b border-white/10 bg-black/50 backdrop-blur-xl"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center"><span className="text-2xl">🥁</span></div><div><h2 className="text-xl font-black text-white">TAM-TAM</h2><p className="text-[10px] text-[#999]">Social Audio</p></div></div><motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><X className="w-5 h-5 text-white" /></motion.button></div></div>
            <div className="p-4"><p className="text-[#999] text-xs font-medium mb-3 px-2">NAVIGATION</p><div className="space-y-1">{items.map((it, i) => (<motion.button key={it.path} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} whileTap={{ scale: 0.98 }} onClick={() => { onNavigate(it.path); onClose(); }} className={`w-full flex items-center gap-3 p-3 rounded-xl ${it.active ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}><div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${it.gradient} flex items-center justify-center`}><span className="text-xl">{it.icon}</span></div><span className="text-white font-medium flex-1 text-left">{it.label}</span>{it.active && <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">ACTIF</span>}<ChevronRight className="w-4 h-4 text-[#999]" /></motion.button>))}</div></div>
            <div className="p-4 border-t border-white/10"><p className="text-[#999] text-xs font-medium mb-3 px-2">SECTIONS</p><div className="grid grid-cols-2 gap-2">{sTabs.map((t, i) => { const I = t.icon; const a = activeBottomTab === t.id; return (<motion.button key={t.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05 }} whileTap={{ scale: 0.95 }} onClick={() => { onBottomTabChange(t.id); onClose(); }} className={`flex flex-col items-center gap-2 p-4 rounded-xl ${a ? 'bg-white/10 border border-white/20' : 'bg-white/5'}`}><I className={`w-6 h-6 ${a ? t.color : 'text-[#999]'}`} /><span className={`text-xs font-medium ${a ? 'text-white' : 'text-[#999]'}`}>{t.label}</span></motion.button>); })}</div></div>
            <div className="p-4 border-t border-white/10"><motion.button whileTap={{ scale: 0.98 }} onClick={() => onNavigate('/tamtam/settings')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5"><Settings className="w-5 h-5 text-[#999]" /><span className="text-[#999] text-sm">Paramètres</span></motion.button></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FeedCard: React.FC<{ post: any; isActive: boolean; onLike: () => void; onComment: () => void; onShare: () => void; currentLang: string }> = ({ post, isActive, onLike, onComment, onShare, currentLang }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => { if (isActive && audioRef.current) { audioRef.current.play().catch(() => {}); setIsPlaying(true); } else if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); } }, [isActive]);

  const togglePlay = () => { if (audioRef.current) { isPlaying ? audioRef.current.pause() : audioRef.current.play(); setIsPlaying(!isPlaying); } };

  return (
    <div className="h-screen w-full snap-start snap-always relative" style={{ background: '#0B0B0B' }}>
      {post.audio_url && <audio ref={audioRef} src={post.audio_url} loop />}
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${(post.id?.charCodeAt(0) || 0) * 10 % 360}, 50%, 15%) 0%, #0B0B0B 100%)` }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div className="relative w-64 h-64" animate={isPlaying ? { rotate: 360 } : { rotate: 0 }} transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 shadow-2xl">
            {[...Array(15)].map((_, i) => (<div key={i} className="absolute rounded-full border border-gray-700/30" style={{ inset: `${10 + i * 5}%` }} />))}
            <div className="absolute inset-[35%] rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-inner"><span className="text-5xl">{post.feeling_emoji || '🎵'}</span></div>
            <div className="absolute inset-0 rounded-full opacity-30" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
          </div>
          {isPlaying && <motion.div className="absolute -inset-4 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255, 122, 0, 0.3) 0%, transparent 70%)' }} animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />}
        </motion.div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={togglePlay} className="absolute w-20 h-20 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center border border-white/20">
          {isPlaying ? <Pause className="w-10 h-10 text-white" fill="white" /> : <Play className="w-10 h-10 text-white ml-1" fill="white" />}
        </motion.button>
      </div>
      <div className="absolute bottom-48 left-0 right-0 flex justify-center gap-0.5 px-8">
        {[...Array(50)].map((_, i) => (<motion.div key={i} className="w-1 bg-[#FF7A00] rounded-full" animate={isPlaying ? { height: [4, Math.random() * 40 + 10, 4], opacity: [0.5, 1, 0.5] } : { height: 4 }} transition={{ repeat: Infinity, duration: 0.5 + Math.random() * 0.5, delay: i * 0.02 }} />))}
      </div>
      <div className="absolute bottom-16 left-0 right-0 px-4 py-4" style={{ background: 'linear-gradient(to top, rgba(11,11,11,0.95) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center overflow-hidden border-2 border-white">{post.profile?.avatar_url ? <img src={post.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">👤</span>}</div>
          <div className="flex-1"><span className="text-white font-bold block">@{post.profile?.username || 'tamtam_user'}</span><span className="text-[#999] text-xs">{post.location_name || 'Bénin'}</span></div>
          <motion.button whileTap={{ scale: 0.95 }} className="px-5 py-2 rounded-full bg-[#FF7A00] text-white text-sm font-bold">🟠 SUIVRE +</motion.button>
        </div>
        <p className="text-[#F2F2F2] text-base mb-2 line-clamp-2">"{post.transcript_fr?.slice(0, 80) || 'Écoutez ce contenu...'}"</p>
        <p className="text-[#999] text-sm mb-3">#TamTam #Bénin #Culture</p>
        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setIsLiked(!isLiked); onLike(); }} className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${isLiked ? 'bg-red-500' : 'bg-white/10'}`}><Heart className={`w-7 h-7 ${isLiked ? 'text-white fill-white' : 'text-white'}`} /><span className="text-white text-xs font-bold mt-1">{post.reactions_count || 0}</span></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onComment} className="w-16 h-16 rounded-2xl bg-white/10 flex flex-col items-center justify-center"><MessageCircle className="w-7 h-7 text-white" /><span className="text-white text-xs font-bold mt-1">{post.comments_count || 0}</span></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={onShare} className="w-16 h-16 rounded-2xl bg-white/10 flex flex-col items-center justify-center"><Share2 className="w-7 h-7 text-white" /><span className="text-white text-xs font-bold mt-1">0</span></motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsSaved(!isSaved)} className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ml-auto ${isSaved ? 'bg-[#FF7A00]' : 'bg-white/10'}`}><Star className={`w-7 h-7 ${isSaved ? 'text-white fill-white' : 'text-white'}`} /><span className="text-white text-xs font-bold mt-1">Save</span></motion.button>
        </div>
      </div>
    </div>
  );
};

const SearchModal: React.FC<{ isOpen: boolean; onClose: () => void; currentLang: string }> = ({ isOpen, onClose, currentLang }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50" style={{ background: '#0B0B0B' }}>
        <div className="p-4 pt-safe">
          <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#999]" /><input type="text" placeholder="Rechercher..." autoFocus className="w-full bg-white/10 border border-white/20 rounded-xl pl-12 pr-12 py-3.5 text-white placeholder-[#999] focus:outline-none focus:border-[#FF7A00]" /><motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="w-5 h-5 text-[#999]" /></motion.button></div>
          <div className="mt-6"><div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-[#FF7A00]" /><span className="text-white text-sm font-medium">Tendances</span></div>{['🎵 Musique', '📖 Contes', '🌾 Agriculture', '🩺 Santé', '🎭 Culture'].map((it, i) => (<motion.button key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="w-full text-left px-4 py-3 rounded-lg hover:bg-white/5 text-white flex items-center gap-3"><span className="text-xl">{it.split(' ')[0]}</span><span className="text-sm">{it.split(' ').slice(1).join(' ')}</span></motion.button>))}</div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default function TamTamSocial() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLang } = useTamTamLanguage();
  const { announceScreen } = useAudioDescription();
  const { toast } = useToast();
  const { posts, isLoading, createPost, addReaction, fetchComments, fetchPosts } = useTamTamPosts();
  const { rankPosts } = useFeedAlgorithm({ prioritizeUtility: true, prioritizeCulture: true });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('fil');
  const [feedMode, setFeedMode] = useState<FeedMode>('creation');
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [unreadMessages] = useState(3);
  const [liveCount] = useState(2);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [commentsModal, setCommentsModal] = useState<{ isOpen: boolean; postId: string | null; comments: TamTamComment[]; isLoading: boolean }>({ isOpen: false, postId: null, comments: [], isLoading: false });

  useEffect(() => { const s = location.state as any; if (s?.tab) setActiveTab(s.tab === 'messages' ? 'chat' : s.tab === 'communities' ? 'groupes' : s.tab === 'live' ? 'direct' : 'fil'); if (s?.openCreator) setShowCreateMenu(true); }, [location.state]);
  useEffect(() => { announceScreen('social'); }, [announceScreen]);

  const handleNavigate = useCallback((p: string) => { triggerFeedback('click'); navigate(p); }, [navigate]);
  const handleOpenComments = useCallback(async (postId: string) => { setCommentsModal({ isOpen: true, postId, comments: [], isLoading: true }); const c = await fetchComments(postId); setCommentsModal(prev => ({ ...prev, comments: c, isLoading: false })); }, [fetchComments]);
  const handleShare = useCallback((postId: string) => { triggerFeedback('send'); if (navigator.share) navigator.share({ title: 'TAM-TAM', url: window.location.href }); else { navigator.clipboard.writeText(window.location.href); toast({ title: "🔗 Copié!" }); } }, [toast]);
  const handleCreateSelect = useCallback((id: string) => { setShowCreateMenu(false); triggerFeedback('notification', { haptic: true }); if (id === 'poll') setShowCreatePoll(true); else if (id === 'story') setShowStoryCreator(true); else if (id === 'live') navigate('/tamtam/live/create'); else setShowCreator(true); }, [navigate]);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => { const idx = Math.round(e.currentTarget.scrollTop / window.innerHeight); if (idx !== currentPostIndex) setCurrentPostIndex(idx); }, [currentPostIndex]);

  const rankedPosts = useMemo(() => posts.map(p => ({ ...p, media_type: (p as any).media_type || 'audio', transcript_fr: (p as any).transcript_fr || (p as any).transcript || null, feeling_emoji: (p as any).feeling_emoji || null })), [posts]);

  return (
    <div className="fixed inset-0" style={{ background: '#0B0B0B' }}>
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} currentLang={currentLang} onNavigate={handleNavigate} activeBottomTab={activeTab} onBottomTabChange={setActiveTab} />
      <FloatingHeader currentMode={feedMode} onModeChange={setFeedMode} onMenuOpen={() => setIsMenuOpen(true)} onSearch={() => setShowSearch(true)} currentLang={currentLang} liveCount={liveCount} />
      <AnimatePresence mode="wait">
        {activeTab === 'fil' && (
          <motion.div key="fil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide pb-16" onScroll={handleScroll}>
            {isLoading ? <div className="h-screen flex items-center justify-center"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-10 h-10 border-3 border-[#FF7A00] border-t-transparent rounded-full" /></div> : rankedPosts.length > 0 ? rankedPosts.map((p, i) => <FeedCard key={p.id} post={p} isActive={i === currentPostIndex} onLike={() => addReaction(p.id, 'like')} onComment={() => handleOpenComments(p.id)} onShare={() => handleShare(p.id)} currentLang={currentLang} />) : <div className="h-screen flex flex-col items-center justify-center px-8"><span className="text-7xl mb-4">🥁</span><p className="text-[#999] text-center mb-6">Aucun contenu</p><motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCreateMenu(true)} className="px-6 py-3 rounded-full bg-[#FF7A00] text-white font-bold">Créer</motion.button></div>}
          </motion.div>
        )}
        {activeTab === 'chat' && <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16 pb-16 h-full" style={{ background: '#0B0B0B' }}><TamTamMessagesHub isOpen={true} onClose={() => setActiveTab('fil')} /></motion.div>}
        {activeTab === 'groupes' && <motion.div key="groupes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16 pb-16 h-full" style={{ background: '#0B0B0B' }}><TamTamCommunities /></motion.div>}
        {activeTab === 'direct' && <motion.div key="direct" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-16 pb-16 h-full" style={{ background: '#0B0B0B' }}><TamTamLiveList /></motion.div>}
      </AnimatePresence>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} onCreatePress={() => setShowCreateMenu(true)} currentLang={currentLang} unreadMessages={unreadMessages} />
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} currentLang={currentLang} />
      <CreateMenu isOpen={showCreateMenu} onClose={() => setShowCreateMenu(false)} onSelect={handleCreateSelect} currentLang={currentLang} />
      <TamTamCommentsModal isOpen={commentsModal.isOpen} onClose={() => setCommentsModal(prev => ({ ...prev, isOpen: false }))} comments={commentsModal.comments} onAddComment={async () => {}} isLoading={commentsModal.isLoading} />
      <TamTamVocalPoll isOpen={showCreatePoll} onClose={() => setShowCreatePoll(false)} />
      <TamTamStoryCreator isOpen={showStoryCreator} onClose={() => setShowStoryCreator(false)} onStoryCreated={() => fetchPosts()} />
      <FullscreenCreator isOpen={showCreator} onClose={() => setShowCreator(false)} onComplete={async (d) => { await createPost({ audio_url: d.audio_url, media_type: d.media_type, media_url: d.media_url, transcript_fr: d.transcript_fr || '', transcript_ba: d.transcript_ba || '', topic: d.topic, template_id: d.template_id, duration_seconds: d.duration_seconds }); toast({ title: "✅ Publié!" }); triggerFeedback('success'); fetchPosts(); setShowCreator(false); }} />
    </div>
  );
}

export { TamTamSocial };
