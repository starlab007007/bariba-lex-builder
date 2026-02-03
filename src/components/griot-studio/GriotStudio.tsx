/**
 * Griot Studio v6.0
 * AI-powered Image-to-Animation Studio
 * Inspired by Pika Labs and Kaiber
 */

import React, { useState, useRef, useCallback } from 'react';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { ImageCapture } from './ImageCapture';
import { StoryInput } from './StoryInput';
import { StyleSelector, AnimationStyleName } from './StyleSelector';
import { AnimationPreview } from './AnimationPreview';
import { useImageAnimation } from './hooks/useImageAnimation';
import { useVFXEngine } from './hooks/useVFXEngine';

type StudioStep = 'create' | 'generating' | 'preview';

const DURATION_OPTIONS = [
  { value: 15, label: '15s', emoji: '⚡' },
  { value: 30, label: '30s', emoji: '🎬' },
  { value: 60, label: '60s', emoji: '🎥' }
];

export function GriotStudio() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [step, setStep] = useState<StudioStep>('create');
  const [imageFile, setImageFile] = useState<File | Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [style, setStyle] = useState<AnimationStyleName>('traditional');
  const [duration, setDuration] = useState(15);

  // Hooks
  const {
    state: animationState,
    analysisResult,
    analyzeContent,
    startPreview,
    stopPreview,
    renderVideo,
    reset: resetAnimation
  } = useImageAnimation(canvasRef);

  const { preloadStyleFlares } = useVFXEngine();

  // Handlers
  const handleImageCaptured = useCallback((file: File | Blob) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  }, []);

  const clearImage = useCallback(() => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(null);
    setImagePreviewUrl(null);
  }, [imagePreviewUrl]);

  const handleAudioRecorded = useCallback((blob: Blob) => {
    setAudioBlob(blob);
    // For now, we'll use a placeholder transcription
    // In production, this would call a speech-to-text service
    setStory('[Audio enregistré - transcription en cours...]');
    toast({
      title: "🎤 Audio enregistré!",
      description: "Ton histoire vocale a été capturée."
    });
  }, [toast]);

  const handleGenerate = useCallback(async () => {
    if (!imageFile) {
      toast({
        title: "Image requise",
        description: "Ajoute une image pour créer ton animation.",
        variant: "destructive"
      });
      return;
    }

    if (!story.trim()) {
      toast({
        title: "Histoire requise",
        description: "Raconte ton histoire pour donner vie à l'animation.",
        variant: "destructive"
      });
      return;
    }

    setStep('generating');

    try {
      // Preload VFX assets
      await preloadStyleFlares(style);

      // Analyze image and story with AI
      await analyzeContent(imageFile, story, style, duration);

      // Transition to preview
      setStep('preview');

      // Start preview automatically
      setTimeout(() => {
        startPreview(style, duration);
      }, 500);

    } catch (error) {
      console.error('[GriotStudio] Generation error:', error);
      toast({
        title: "Erreur de génération",
        description: "Réessaie dans quelques instants.",
        variant: "destructive"
      });
      setStep('create');
    }
  }, [imageFile, story, style, duration, preloadStyleFlares, analyzeContent, startPreview, toast]);

  const handlePlay = useCallback(() => {
    startPreview(style, duration);
  }, [startPreview, style, duration]);

  const handlePause = useCallback(() => {
    stopPreview();
  }, [stopPreview]);

  const handleExport = useCallback(async () => {
    try {
      stopPreview();
      
      toast({
        title: "🎬 Export en cours...",
        description: "Patiente pendant la création de ta vidéo."
      });

      const frames = await renderVideo(style, duration, 24);
      
      // For now, download as animated sequence
      // In production, this would use FFmpeg to create MP4
      const lastFrame = frames[frames.length - 1];
      const url = URL.createObjectURL(lastFrame);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `griot-animation-${Date.now()}.png`;
      link.click();
      
      URL.revokeObjectURL(url);

      toast({
        title: "✅ Export terminé!",
        description: "Ton animation a été sauvegardée."
      });

    } catch (error) {
      console.error('[GriotStudio] Export error:', error);
      toast({
        title: "Erreur d'export",
        description: "Réessaie dans quelques instants.",
        variant: "destructive"
      });
    }
  }, [stopPreview, renderVideo, style, duration, toast]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Mon conte animé - Griot Studio',
          text: story.slice(0, 100) + '...',
          url: window.location.href
        });
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "📋 Lien copié!",
          description: "Partage ce lien avec tes amis."
        });
      }
    } catch (error) {
      console.error('[GriotStudio] Share error:', error);
    }
  }, [story, toast]);

  const handleReset = useCallback(() => {
    stopPreview();
    resetAnimation();
    clearImage();
    setStory('');
    setAudioBlob(null);
    setStep('create');
  }, [stopPreview, resetAnimation, clearImage]);

  const handleBack = useCallback(() => {
    if (step === 'preview') {
      stopPreview();
      setStep('create');
    } else if (step === 'generating') {
      setStep('create');
    }
  }, [step, stopPreview]);

  const canGenerate = imageFile && story.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 via-black to-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-amber-500/20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {step !== 'create' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-amber-200 hover:text-amber-100"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
          ) : (
            <div className="w-20" />
          )}
          
          <h1 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            Griot Studio
          </h1>
          
          <div className="w-20" />
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        
        {/* Step: Create */}
        {step === 'create' && (
          <>
            {/* Image Capture */}
            <section>
              <ImageCapture
                onImageCaptured={handleImageCaptured}
                previewUrl={imagePreviewUrl}
                onClear={clearImage}
                disabled={animationState.isAnalyzing}
              />
            </section>

            {/* Story Input */}
            <section>
              <StoryInput
                value={story}
                onChange={setStory}
                onAudioRecorded={handleAudioRecorded}
                disabled={animationState.isAnalyzing}
              />
            </section>

            {/* Style Selector */}
            <section>
              <StyleSelector
                selected={style}
                onSelect={setStyle}
                disabled={animationState.isAnalyzing}
              />
            </section>

            {/* Duration Selector */}
            <section>
              <h3 className="text-sm font-medium text-amber-200/60 mb-3 text-center">
                ⏱️ Durée
              </h3>
              <div className="flex justify-center gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    disabled={animationState.isAnalyzing}
                    className={cn(
                      "px-4 py-2 rounded-lg border transition-all",
                      duration === opt.value
                        ? "border-amber-400 bg-amber-500/20 text-amber-100"
                        : "border-amber-500/20 bg-amber-950/20 text-amber-200/60 hover:border-amber-500/40"
                    )}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Generate Button */}
            <section className="pt-4">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!canGenerate || animationState.isAnalyzing}
                className={cn(
                  "w-full py-6 text-lg font-semibold rounded-2xl transition-all",
                  "bg-gradient-to-r from-amber-500 to-orange-500",
                  "hover:from-amber-400 hover:to-orange-400",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {animationState.isAnalyzing ? (
                  <>
                    <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    ✨ Animer mon histoire
                  </>
                )}
              </Button>
              
              {!canGenerate && (
                <p className="text-xs text-amber-200/40 text-center mt-2">
                  Ajoute une image et raconte ton histoire
                </p>
              )}
            </section>
          </>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <section className="py-12">
            <AnimationPreview
              canvasRef={canvasRef}
              isPlaying={false}
              isRendering={true}
              progress={animationState.progress}
              message={animationState.message}
              onPlay={() => {}}
              onPause={() => {}}
              onExport={() => {}}
              onShare={() => {}}
              onReset={handleReset}
            />
          </section>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <section>
            <AnimationPreview
              canvasRef={canvasRef}
              isPlaying={animationState.isPlaying}
              isRendering={animationState.isRendering}
              progress={animationState.progress}
              message={animationState.message}
              onPlay={handlePlay}
              onPause={handlePause}
              onExport={handleExport}
              onShare={handleShare}
              onReset={handleReset}
            />

            {/* Analysis info */}
            {analysisResult && (
              <div className="mt-4 p-4 rounded-xl bg-amber-950/30 border border-amber-500/20">
                <h4 className="text-sm font-medium text-amber-200 mb-2">
                  🎭 Analyse IA
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-amber-200/60">
                  <div>
                    <span className="text-amber-200/40">Ambiance:</span>{' '}
                    {analysisResult.mood}
                  </div>
                  <div>
                    <span className="text-amber-200/40">Mouvement:</span>{' '}
                    {analysisResult.motionPlan.direction}
                  </div>
                  <div className="col-span-2">
                    <span className="text-amber-200/40">Émotions:</span>{' '}
                    {analysisResult.emotionSegments.map(s => s.emotion).join(' → ')}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer branding */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 bg-black/60 backdrop-blur-sm">
        <p className="text-center text-xs text-amber-200/30">
          Griot Studio v6.0 • Powered by FITILA AI
        </p>
      </footer>
    </div>
  );
}

export default GriotStudio;
