/**
 * TemplatePublishFlow - Voice-First Publish Workflow
 * Features: Large buttons, emoji-based UI, minimal text, audio feedback
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Pause, Save, Upload, Share2, Check, Loader2,
  Globe, Lock, Users, ChevronRight, ChevronLeft,
  Download, Copy, MessageCircle
} from 'lucide-react';
import { Template } from '@/components/tamtam/creator/TemplateSystem/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TemplatePublishFlowProps {
  template: Template;
  media: Blob;
  onComplete: () => void;
  onSaveDraft: () => void;
  onClose: () => void;
}

type PublishStep = 'preview' | 'details' | 'publishing' | 'success';
type VisibilityOption = 'public' | 'friends' | 'private';

// Voice-first visibility options with emojis
const VISIBILITY_OPTIONS: { value: VisibilityOption; emoji: string; label: string; labelBa: string; description: string }[] = [
  { value: 'public', emoji: '🌍', label: 'Public', labelBa: 'Bɛɛ', description: 'Tout le monde' },
  { value: 'friends', emoji: '👥', label: 'Amis', labelBa: 'Tɔ́rɔ', description: 'Vos amis' },
  { value: 'private', emoji: '🔒', label: 'Privé', labelBa: 'Kéléŋ', description: 'Vous seul' },
];

export function TemplatePublishFlow({
  template,
  media,
  onComplete,
  onSaveDraft,
  onClose
}: TemplatePublishFlowProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<PublishStep>('preview');
  const [isPlaying, setIsPlaying] = useState(true);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<VisibilityOption>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Create video URL
  useEffect(() => {
    const url = URL.createObjectURL(media);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [media]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if ('vibrate' in navigator) navigator.vibrate(30);
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSaveDraft = useCallback(async () => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    setIsSavingDraft(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "✅ Brouillon sauvegardé",
        description: "Reprenez plus tard",
      });
      onSaveDraft();
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive"
      });
    } finally {
      setIsSavingDraft(false);
    }
  }, [onSaveDraft, toast]);

  const handlePublish = useCallback(async () => {
    if ('vibrate' in navigator) navigator.vibrate(100);
    setStep('publishing');
    
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 80));
      setPublishProgress(i);
    }
    
    setStep('success');
    if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
    toast({
      title: "🎉 Vidéo publiée!",
      description: "Votre création est visible",
    });
  }, [toast]);

  const handleCopyLink = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    navigator.clipboard.writeText('https://tamtam.app/video/123');
    toast({ title: "📋 Lien copié!" });
  }, [toast]);

  const handleClose = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    onClose();
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-3xl bg-gradient-to-b from-background to-background/95 rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {step === 'preview' && '👀'}
              {step === 'details' && '📝'}
              {step === 'publishing' && '🚀'}
              {step === 'success' && '🎉'}
            </span>
            <div>
              <h2 className="font-bold text-foreground text-lg">
                {step === 'preview' && 'Aperçu'}
                {step === 'details' && 'Détails'}
                {step === 'publishing' && 'Publication...'}
                {step === 'success' && 'Publié!'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {template.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-3 rounded-xl hover:bg-muted transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Video Preview */}
          <div className="flex-1 p-4 md:p-6 flex items-center justify-center bg-black/30 min-h-[200px] md:min-h-0">
            <div className="relative aspect-[9/16] h-full max-h-[50vh] md:max-h-[60vh] rounded-2xl overflow-hidden shadow-2xl">
              <video
                ref={videoRef}
                src={videoUrl}
                loop
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Play/Pause Overlay */}
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center group"
                aria-label={isPlaying ? "Pause" : "Lecture"}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "p-4 rounded-full bg-white/20 backdrop-blur-md transition-opacity",
                    isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                  )}
                >
                  {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
                </motion.div>
              </button>

              {/* Template Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-sm text-white text-sm font-medium">
                ✨ {template.name}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full md:w-72 lg:w-80 p-4 md:p-5 overflow-y-auto border-t md:border-t-0 md:border-l border-border/30">
            <AnimatePresence mode="wait">
              
              {/* Preview Step */}
              {step === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center py-6">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-6xl mb-4"
                    >
                      ✅
                    </motion.div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Vidéo prête!
                    </h3>
                    <p className="text-muted-foreground">
                      Vérifiez et publiez
                    </p>
                  </div>

                  <Button
                    onClick={() => { if ('vibrate' in navigator) navigator.vibrate(30); setStep('details'); }}
                    size="lg"
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-accent-violet rounded-2xl"
                  >
                    Continuer ➡️
                  </Button>

                  <Button
                    onClick={handleSaveDraft}
                    variant="outline"
                    size="lg"
                    className="w-full h-12 rounded-xl"
                    disabled={isSavingDraft}
                  >
                    {isSavingDraft ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <span className="mr-2">💾</span>
                    )}
                    Sauvegarder brouillon
                  </Button>
                </motion.div>
              )}

              {/* Details Step */}
              {step === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  {/* Caption - Optional for voice-first users */}
                  <div>
                    <label className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                      ✏️ Légende (optionnel)
                    </label>
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Décrivez votre vidéo..."
                      className="resize-none rounded-xl min-h-[80px]"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {caption.length}/280
                    </p>
                  </div>

                  {/* Visibility - Large Touch Targets */}
                  <div>
                    <label className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                      👁️ Qui peut voir?
                    </label>
                    <div className="space-y-2">
                      {VISIBILITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { if ('vibrate' in navigator) navigator.vibrate(20); setVisibility(opt.value); }}
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all min-h-[64px]",
                            visibility === opt.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 active:scale-98"
                          )}
                        >
                          <span className="text-2xl">{opt.emoji}</span>
                          <div className="flex-1 text-left">
                            <p className="font-bold text-foreground">
                              {opt.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{opt.description}</p>
                          </div>
                          {visibility === opt.value && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options - Simple Toggles */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <span className="text-sm font-medium">Commentaires</span>
                      </div>
                      <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📥</span>
                        <span className="text-sm font-medium">Téléchargement</span>
                      </div>
                      <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                    </div>
                  </div>

                  {/* Publish Button */}
                  <Button
                    onClick={handlePublish}
                    size="lg"
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-accent-violet rounded-2xl"
                  >
                    🚀 Publier maintenant
                  </Button>

                  <button
                    onClick={() => { if ('vibrate' in navigator) navigator.vibrate(20); setStep('preview'); }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Retour
                  </button>
                </motion.div>
              )}

              {/* Publishing Step */}
              {step === 'publishing' && (
                <motion.div
                  key="publishing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-6xl mb-4"
                  >
                    🚀
                  </motion.div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Publication...
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Patientez
                  </p>
                  
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent-violet"
                      initial={{ width: 0 }}
                      animate={{ width: `${publishProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{publishProgress}%</p>
                </motion.div>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5"
                >
                  <div className="text-center py-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="text-7xl mb-4"
                    >
                      🎉
                    </motion.div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      Publié!
                    </h3>
                    <p className="text-muted-foreground">
                      Votre vidéo est visible
                    </p>
                  </div>

                  {/* Share Options */}
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      📤 Partager
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleCopyLink}
                        className="flex-1 h-12 rounded-xl"
                      >
                        📋 Copier
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-xl"
                      >
                        📱 WhatsApp
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={() => { if ('vibrate' in navigator) navigator.vibrate(30); onComplete(); }}
                    size="lg"
                    className="w-full h-14 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl"
                  >
                    ✅ Terminé
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
