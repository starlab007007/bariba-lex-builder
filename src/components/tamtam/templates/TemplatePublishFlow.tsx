/**
 * TemplatePublishFlow - Complete publish workflow modal
 * Features: Preview, draft save, publish to feed, share options
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Pause, Save, Upload, Share2, Check, Loader2,
  Globe, Lock, Users, ChevronRight, Image, Sparkles,
  Download, Copy, MessageCircle, Send, Clock
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

const VISIBILITY_OPTIONS: { value: VisibilityOption; label: string; labelBa: string; icon: React.ElementType; description: string }[] = [
  { value: 'public', label: 'Public', labelBa: 'Bɛɛ', icon: Globe, description: 'Visible par tous' },
  { value: 'friends', label: 'Amis', labelBa: 'Tɔ́rɔ', icon: Users, description: 'Visible par vos amis' },
  { value: 'private', label: 'Privé', labelBa: 'Kéléŋ', icon: Lock, description: 'Visible uniquement par vous' },
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
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Create video URL from blob
  useEffect(() => {
    const url = URL.createObjectURL(media);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [media]);

  // Generate thumbnail from video
  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;
    
    const video = videoRef.current;
    const handleLoaded = () => {
      video.currentTime = 1; // Seek to 1 second for thumbnail
    };
    
    const handleSeeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.8));
      }
    };
    
    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('seeked', handleSeeked);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('seeked', handleSeeked);
    };
  }, [videoUrl]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Handle draft save
  const handleSaveDraft = useCallback(async () => {
    setIsSavingDraft(true);
    try {
      // Simulate saving draft
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "Brouillon sauvegardé ✓",
        description: "Vous pouvez reprendre plus tard",
      });
      onSaveDraft();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le brouillon",
        variant: "destructive"
      });
    } finally {
      setIsSavingDraft(false);
    }
  }, [onSaveDraft, toast]);

  // Handle publish
  const handlePublish = useCallback(async () => {
    setStep('publishing');
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setPublishProgress(i);
    }
    
    // Success
    setStep('success');
    toast({
      title: "Vidéo publiée! 🎉",
      description: "Votre création est maintenant visible",
    });
  }, [toast]);

  // Share handlers
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText('https://tamtam.app/video/123');
    toast({ title: "Lien copié!" });
  }, [toast]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl bg-gradient-to-b from-background to-background-soft rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                {step === 'preview' && 'Aperçu de votre création'}
                {step === 'details' && 'Détails de publication'}
                {step === 'publishing' && 'Publication en cours...'}
                {step === 'success' && 'Publié avec succès! 🎉'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Template: {template.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row">
          {/* Video Preview */}
          <div className="flex-1 p-6 flex items-center justify-center bg-black/50">
            <div className="relative aspect-[9/16] h-[400px] rounded-2xl overflow-hidden shadow-2xl">
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
              >
                <div className={cn(
                  "p-4 rounded-full bg-white/20 backdrop-blur-md transition-opacity",
                  isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                )}>
                  {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
                </div>
              </button>

              {/* Template Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs">
                <Sparkles className="w-3 h-3" />
                {template.name}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="w-full md:w-80 p-6 space-y-6 border-l border-border/30">
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
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Votre vidéo est prête!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vérifiez l'aperçu puis continuez pour publier
                    </p>
                  </div>

                  <Button
                    onClick={() => setStep('details')}
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-accent-violet"
                  >
                    Continuer
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>

                  <Button
                    onClick={handleSaveDraft}
                    variant="outline"
                    size="lg"
                    className="w-full"
                    disabled={isSavingDraft}
                  >
                    {isSavingDraft ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Sauvegarder en brouillon
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
                  {/* Caption */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Légende
                    </label>
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Écrivez quelque chose sur votre vidéo..."
                      className="resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {caption.length}/280 caractères
                    </p>
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Visibilité
                    </label>
                    <div className="space-y-2">
                      {VISIBILITY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setVisibility(opt.value)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                              visibility === opt.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <Icon className={cn(
                              "w-5 h-5",
                              visibility === opt.value ? "text-primary" : "text-muted-foreground"
                            )} />
                            <div className="flex-1 text-left">
                              <p className="font-medium text-foreground text-sm">
                                {opt.label}
                                <span className="text-muted-foreground ml-1">({opt.labelBa})</span>
                              </p>
                              <p className="text-xs text-muted-foreground">{opt.description}</p>
                            </div>
                            {visibility === opt.value && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Autoriser les commentaires</span>
                      </div>
                      <Switch checked={allowComments} onCheckedChange={setAllowComments} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Autoriser le téléchargement</span>
                      </div>
                      <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
                    </div>
                  </div>

                  {/* Publish Button */}
                  <Button
                    onClick={handlePublish}
                    size="lg"
                    className="w-full bg-gradient-to-r from-primary to-accent-violet"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Publier maintenant
                  </Button>

                  <button
                    onClick={() => setStep('preview')}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Retour à l'aperçu
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
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Publication en cours...
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Veuillez patienter
                  </p>
                  
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent-violet"
                      initial={{ width: 0 }}
                      animate={{ width: `${publishProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{publishProgress}%</p>
                </motion.div>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center py-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center"
                    >
                      <Check className="w-10 h-10 text-green-500" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      🎉 Publié avec succès!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Votre vidéo est maintenant visible dans le feed
                    </p>
                  </div>

                  {/* Share Options */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Partager</p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="flex-1"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copier le lien
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Partager
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={onComplete}
                    size="lg"
                    className="w-full"
                  >
                    Voir dans le feed
                    <ChevronRight className="w-5 h-5 ml-2" />
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
