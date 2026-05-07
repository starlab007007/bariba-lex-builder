/**
 * SuccessScreen.tsx
 * Écran de succès après publication avec confetti et redirection feed
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Share2, Plus, Home, Eye, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SuccessScreenProps {
  videoBlob?: Blob | null;
  postId?: string | null;
  templateName?: string;
  onCreateAnother: () => void;
  onGoHome: () => void;
}

// Confetti particle component
const ConfettiParticle: React.FC<{ index: number }> = ({ index }) => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[index % colors.length];
  
  const randomX = Math.random() * window.innerWidth;
  const randomDelay = Math.random() * 0.5;
  const randomDuration = 2 + Math.random() * 2;
  const randomRotation = Math.random() * 720 - 360;
  
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        width: 8 + Math.random() * 8,
        height: 8 + Math.random() * 8,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        left: window.innerWidth / 2,
        top: -20,
      }}
      initial={{ 
        x: 0,
        y: 0,
        scale: 0,
        rotate: 0,
        opacity: 1
      }}
      animate={{ 
        x: randomX - window.innerWidth / 2,
        y: window.innerHeight + 100,
        scale: [0, 1, 1, 0.5],
        rotate: randomRotation,
        opacity: [0, 1, 1, 0]
      }}
      transition={{ 
        duration: randomDuration,
        delay: randomDelay,
        ease: [0.25, 0.1, 0.25, 1]
      }}
    />
  );
};

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  videoBlob,
  postId,
  templateName,
  onCreateAnother,
  onGoHome
}) => {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoBlob]);

  const handleViewInFeed = () => {
    if (postId) {
      navigate(`/tamtam?postId=${postId}`);
    } else {
      navigate('/tamtam');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Ma création TAM-TAM',
      text: templateName ? `Regardez ma vidéo créée avec ${templateName} sur TAM-TAM !` : 'Regardez ma création sur TAM-TAM !',
      url: postId ? `${window.location.origin}/tamtam?postId=${postId}` : window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Partagé avec succès !');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setCopied(true);
        toast.success('Lien copié !');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-green-900/30 via-background to-background flex flex-col items-center justify-center p-6 overflow-hidden"
    >
      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}
      </div>

      {/* Success icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 15,
          delay: 0.2 
        }}
        className="relative mb-6"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 blur-3xl bg-green-500/30 rounded-full scale-150" />
        
        {/* Emoji */}
        <motion.div 
          className="text-8xl relative z-10"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          🎉
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-foreground mb-2"
      >
        Publié !
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground text-center mb-8 max-w-xs"
      >
        Ta vidéo est maintenant visible par la communauté TAM-TAM
      </motion.p>

      {/* Video preview */}
      {videoUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="relative w-36 h-64 rounded-2xl overflow-hidden shadow-2xl mb-8 border-2 border-white/20"
        >
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
          
          {/* Play indicator */}
          <div className="absolute bottom-2 right-2 bg-black/50 rounded-full px-2 py-1 text-xs text-white flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            En ligne
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        {/* View in feed */}
        <Button
          onClick={handleViewInFeed}
          className="w-full h-12 bg-white text-black hover:bg-white/90 font-semibold"
        >
          <Eye className="w-5 h-5 mr-2" />
          Voir dans le feed
        </Button>

        {/* Share */}
        <Button
          variant="outline"
          onClick={handleShare}
          className="w-full h-12 border-white/20 text-foreground hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 mr-2 text-green-500" />
              Lien copié !
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5 mr-2" />
              Partager
            </>
          )}
        </Button>

        {/* Create another */}
        <Button
          variant="ghost"
          onClick={onCreateAnother}
          className="w-full h-12 text-foreground hover:bg-white/5"
        >
          <Plus className="w-5 h-5 mr-2" />
          Créer une autre vidéo
        </Button>

        {/* Go home */}
        <Button
          variant="ghost"
          onClick={onGoHome}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          <Home className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
      </motion.div>

      {/* Template credit */}
      {templateName && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 text-xs text-muted-foreground"
        >
          Créé avec {templateName}
        </motion.p>
      )}
    </motion.div>
  );
};

export default SuccessScreen;
