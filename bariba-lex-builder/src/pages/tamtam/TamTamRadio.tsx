import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, 
  Heart, MessageCircle, Share2, Radio as RadioIcon,
  Volume2, VolumeX
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// RADIO TAM-TAM - Innovation BOT.BJ
// ═══════════════════════════════════════════════════════════════
// Feed audio qui n'est pas ennuyeux visuellement
// Visualiseur organique + Contrôles GÉANTS
// ═══════════════════════════════════════════════════════════════

interface RadioPost {
  id: string;
  audioUrl: string;
  titleFr: string;
  titleBa: string;
  source: string;
  duration: number;
  category: 'news' | 'culture' | 'advice' | 'story';
  emoji: string;
  likes: number;
  comments: number;
  isLiked: boolean;
}

const RadioTamTam = () => {
  const [currentPost, setCurrentPost] = useState<RadioPost>({
    id: '1',
    audioUrl: '/audio/sample.mp3',
    titleFr: 'Alerte Météo : Orages prévus sur le Zou',
    titleBa: 'Ọjọ́ ojú ọ̀run: Àrá máa dé lórí Zou',
    source: '@MétéoBénin',
    duration: 120,
    category: 'news',
    emoji: '⚡',
    likes: 234,
    comments: 45,
    isLiked: false
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentLang, setCurrentLang] = useState<'fr' | 'ba'>('fr');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(12).fill(0));

  // Simulate audio visualization
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setAudioLevels(prev => 
          prev.map(() => Math.random() * 100)
        );
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  // Update current time
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      const interval = setInterval(() => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speedOptions = [1, 1.5, 2];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0B0B0B] via-[#1A1A1A] to-[#0B0B0B]">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentPost.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-safe pb-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RadioIcon className="w-5 h-5 text-[#FF7A00]" />
            <h1 className="text-white text-lg font-bold">RADIO TAM-TAM</h1>
          </div>
          
          <button className="px-4 py-2 rounded-full bg-red-500 text-white text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Diffuser en direct
          </button>
        </div>
      </div>

      {/* VISUALISEUR CENTRAL - Organique */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-80 h-80">
          {/* Cercles concentriques pulsants */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2"
              style={{
                borderColor: `rgba(255, 122, 0, ${0.3 - i * 0.06})`,
                scale: 1 + i * 0.15,
              }}
              animate={{
                scale: [1 + i * 0.15, 1.1 + i * 0.15, 1 + i * 0.15],
                opacity: isPlaying ? [0.3, 0.6, 0.3] : 0.1,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}

          {/* Centre - Emoji animé */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              scale: isPlaying ? [1, 1.1, 1] : 1,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center text-6xl shadow-2xl">
              {currentPost.emoji}
            </div>
          </motion.div>

          {/* Audio level bars - Circular */}
          <div className="absolute inset-0">
            {audioLevels.map((level, i) => {
              const angle = (i * 360) / audioLevels.length;
              const radius = 140;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              
              return (
                <motion.div
                  key={i}
                  className="absolute w-1 bg-gradient-to-t from-[#FF7A00] to-[#FF5500] rounded-full"
                  style={{
                    height: isPlaying ? `${20 + level * 0.4}px` : '10px',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* GRAND TITRE LISIBLE */}
      <div className="absolute bottom-64 left-0 right-0 px-6 text-center">
        <motion.h2 
          className="text-white text-2xl font-bold mb-2 leading-tight"
          key={currentLang}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {currentLang === 'fr' ? currentPost.titleFr : currentPost.titleBa}
        </motion.h2>
        
        <button
          onClick={() => setCurrentLang(currentLang === 'fr' ? 'ba' : 'fr')}
          className="text-[#FF7A00] text-sm font-medium flex items-center gap-1 mx-auto"
        >
          <span>🌐</span>
          {currentLang === 'fr' ? 'Voir en Bariba' : 'Voir en Français'}
        </button>
        
        <p className="text-[#999999] text-sm mt-2">
          👤 Source : {currentPost.source}
        </p>
      </div>

      {/* BARRE DE CONTRÔLE GÉANTE */}
      <div className="absolute bottom-20 left-0 right-0 px-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#FF7A00] to-[#FF5500]"
              style={{ width: `${(currentTime / currentPost.duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#999999]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(currentPost.duration)}</span>
          </div>
        </div>

        {/* Main controls - ÉNORMES */}
        <div className="flex items-center justify-center gap-6 mb-4">
          {/* Skip back 10s */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => skip(-10)}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
          >
            <SkipBack className="w-7 h-7 text-white" />
            <span className="absolute text-[10px] text-white font-bold mt-8">10s</span>
          </motion.button>

          {/* Play/Pause - GÉANT */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF7A00] to-[#FF5500] flex items-center justify-center shadow-2xl"
          >
            {isPlaying ? (
              <Pause className="w-12 h-12 text-white" fill="white" />
            ) : (
              <Play className="w-12 h-12 text-white ml-1" fill="white" />
            )}
          </motion.button>

          {/* Skip forward 10s */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => skip(10)}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
          >
            <SkipForward className="w-7 h-7 text-white" />
            <span className="absolute text-[10px] text-white font-bold mt-8">10s</span>
          </motion.button>
        </div>

        {/* Playback speed */}
        <div className="flex justify-center gap-3 mb-4">
          <span className="text-white text-sm font-medium">Vitesse :</span>
          {speedOptions.map(speed => (
            <motion.button
              key={speed}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setPlaybackSpeed(speed);
                if (audioRef.current) {
                  audioRef.current.playbackRate = speed;
                }
              }}
              className={`px-4 py-2 rounded-full font-bold text-sm ${
                playbackSpeed === speed
                  ? 'bg-[#FF7A00] text-white'
                  : 'bg-white/10 text-white'
              }`}
            >
              {speed}x
            </motion.button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-8">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1"
          >
            <Heart 
              className="w-7 h-7" 
              stroke="white"
              fill={currentPost.isLiked ? '#FF7A00' : 'none'}
            />
            <span className="text-white text-xs">J'aime le sujet</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1"
          >
            <MessageCircle className="w-7 h-7 text-white" />
            <span className="text-white text-xs">Commenter en vocal</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1"
          >
            <Share2 className="w-7 h-7 text-white" />
            <span className="text-white text-xs">Partager</span>
          </motion.button>
        </div>
      </div>

      {/* Volume control */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-20 right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 text-white" />
        ) : (
          <Volume2 className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
};

export default RadioTamTam;
