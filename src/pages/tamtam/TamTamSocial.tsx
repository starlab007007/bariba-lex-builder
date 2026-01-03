import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Play, Pause, Volume2, VolumeX, ChevronUp
} from 'lucide-react';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

// ═══════════════════════════════════════════════════════════════
// COMPOSANT FEED PRINCIPAL - STYLE KUAISHOU
// ═══════════════════════════════════════════════════════════════
// Design clé : Informations ANCRÉES EN BAS (pas flottantes)
// ═══════════════════════════════════════════════════════════════

interface FeedPost {
  id: string;
  videoUrl?: string;
  audioUrl?: string;
  thumbnail?: string;
  author: {
    username: string;
    displayName: string;
    avatar: string;
    isFollowing: boolean;
  };
  content: {
    titleVocal: string; // Le titre avec icône onde vocale
    description?: string;
    hashtags: string[];
  };
  stats: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  isLiked: boolean;
  isSaved: boolean;
}

const TamTamFeed = () => {
  const { posts } = useTamTamPosts();
  const { currentLang } = useTamTamLanguage();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe handler
  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    
    if (info.offset.y < -threshold && currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (info.offset.y > threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Auto-play current video
  useEffect(() => {
    const video = videoRefs.current[currentIndex];
    if (video) {
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, [currentIndex, isPlaying]);

  const currentPost = posts[currentIndex];
  if (!currentPost) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {/* ZONE VIDÉO PLEIN ÉCRAN */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="absolute inset-0"
      >
        {/* Video/Image Background */}
        <div className="absolute inset-0">
          {currentPost.videoUrl ? (
            <video
              ref={(el) => (videoRefs.current[currentIndex] = el)}
              src={currentPost.videoUrl}
              className="w-full h-full object-cover"
              loop
              playsInline
              muted={isMuted}
              poster={currentPost.thumbnail}
            />
          ) : (
            <img
              src={currentPost.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Gradient overlay pour lisibilité du bas */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        {/* TOP NAV - Minimaliste */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-2 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </button>
              <button className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
                À la une
              </button>
              <button className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-1">
                📍 Local
              </button>
            </div>
            
            <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" strokeWidth="2"/>
                <path d="m21 21-4.35-4.35" strokeWidth="2"/>
                <path d="M11 6a5 5 0 0 1 5 5" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* CENTER - Tap to play/pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 z-0 flex items-center justify-center"
        >
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"
              >
                <Play className="w-10 h-10 text-white ml-1" fill="white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* ZONE D'INFORMATION BASSE - LE CŒUR DU DESIGN KUAISHOU */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {/* Fond opaque pour lisibilité - 20% de la hauteur */}
          <div 
            className="bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/95 to-transparent pt-8 pb-4 px-4"
            style={{ minHeight: '20vh' }}
          >
            {/* Auteur + Bouton Suivre */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src={currentPost.author.avatar}
                  alt={currentPost.author.displayName}
                  className="w-10 h-10 rounded-full border-2 border-white/20"
                />
                <div>
                  <p className="text-white font-semibold text-base">
                    @{currentPost.author.username}
                  </p>
                </div>
              </div>
              
              {!currentPost.author.isFollowing && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 rounded-full bg-[#FF7A00] text-white font-bold text-sm shadow-lg"
                >
                  SUIVRE +
                </motion.button>
              )}
            </div>

            {/* Titre VOCAL avec animation d'onde */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-[#FF7A00] rounded-full"
                      animate={{
                        height: [8, 16, 8, 12, 8],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
                <span className="text-white/80 text-sm">🎤</span>
              </div>
              <p className="text-white text-lg font-medium leading-snug">
                {currentPost.content.titleVocal}
              </p>
            </div>

            {/* Hashtags */}
            {currentPost.content.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {currentPost.content.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[#FF7A00] text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* ACTIONS HORIZONTALES (différence clé avec TikTok) */}
            <div className="flex items-center gap-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-2 text-white"
              >
                <Heart 
                  className="w-6 h-6" 
                  fill={currentPost.isLiked ? '#FF7A00' : 'none'}
                  stroke={currentPost.isLiked ? '#FF7A00' : 'white'}
                />
                <span className="text-sm font-semibold">
                  {currentPost.stats.likes > 1000 
                    ? `${(currentPost.stats.likes / 1000).toFixed(1)}K` 
                    : currentPost.stats.likes}
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2 text-white"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">{currentPost.stats.comments}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-2 text-white"
              >
                <Share2 className="w-6 h-6" />
                <span className="text-sm font-semibold">{currentPost.stats.shares}</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex items-center gap-2 text-white"
              >
                <Bookmark 
                  className="w-6 h-6" 
                  fill={currentPost.isSaved ? '#FF7A00' : 'none'}
                />
                <span className="text-sm">Enregistrer</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Volume control - Top right */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-20 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Scroll indicator */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
          {posts.map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all ${
                i === currentIndex 
                  ? 'h-6 bg-white' 
                  : 'h-1 bg-white/40'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3" />
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">
                  {currentPost.stats.comments} commentaires
                </h3>
                <button onClick={() => setShowComments(false)}>
                  <ChevronUp className="w-6 h-6" />
                </button>
              </div>
              {/* Comments list here */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TamTamFeed;
