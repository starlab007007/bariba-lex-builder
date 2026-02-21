/**
 * Griot Animé Studio v7
 * AI-powered Anime Story Creator — MovieFlow-inspired pipeline
 * 
 * Workflow: Record → Transcribe → Edit Scenes → Generate Images → Preview → Publish
 * 
 * v7 changes:
 * - Audio transcription via Mistral Voxtral Mini STT
 * - Interactive SceneEditor (1 phrase = 1 scene)
 * - Pre-segmented scene matching (skip AI segmentation)
 * - Cloud draft save/restore
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wand2, Check, Loader2, X, Maximize, Minimize, Save, RotateCcw, Mic, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { NarratorCapture } from './NarratorCapture';
import { VinylRecorder } from './VinylRecorder';
import { StoryPreviewPlayer } from './StoryPreviewPlayer';
import { PublishStep } from './PublishStep';
import type { AnimeStyleName } from './AnimeStyleSelector';
import { AssetGallery, LibraryAsset } from './AssetGallery';
import { SceneEditor, EditableScene } from './SceneEditor';
import { useAnimeStoryGenerator, StoryScene } from './hooks/useAnimeStoryGenerator';
import { useVFXEngine } from './hooks/useVFXEngine';
import { useGriotDraft } from './hooks/useGriotDraft';
import { GriotAnimationEngine } from '@/engines/GriotAnimationEngine';
import { supabase } from '@/integrations/supabase/client';
import { concatenateSceneAudios } from '@/utils/concatenateSceneAudios';

type StudioStep = 'create' | 'transcribing' | 'editing' | 'generating' | 'preview' | 'finalize' | 'success';

/** Auto-calculate duration from audio length */
function calcDuration(audioSeconds: number): number {
  if (audioSeconds < 20) return 15;
  if (audioSeconds <= 45) return 30;
  return 60;
}

// Confirmation modal component
function ConfirmModal({
  isOpen, title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', onConfirm, onCancel,
}: {
  isOpen: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-amber-950 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h3 className="text-lg font-bold text-amber-100 mb-2">{title}</h3>
        <p className="text-amber-200/70 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 border-amber-500/30 text-amber-200">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Split transcribed text into scenes (1 sentence = 1 scene)
 */
function splitTextIntoScenes(text: string): EditableScene[] {
  // Split on sentence-ending punctuation, keeping the punctuation
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5); // Filter out very short fragments

  if (sentences.length === 0) {
    return [{ id: 'scene_1', text: text.trim(), emotion: 'wonder' }];
  }

  // Auto-detect emotion based on keywords
  return sentences.map((sentence, i) => ({
    id: `scene_${Date.now()}_${i}`,
    text: sentence,
    emotion: detectEmotion(sentence, i, sentences.length),
  }));
}

function detectEmotion(text: string, index: number, total: number): string {
  const lower = text.toLowerCase();
  if (lower.includes('triste') || lower.includes('pleur') || lower.includes('larme')) return 'sadness';
  if (lower.includes('peur') || lower.includes('effroi') || lower.includes('terreur')) return 'fear';
  if (lower.includes('joie') || lower.includes('heureu') || lower.includes('rire') || lower.includes('bonheur')) return 'joy';
  if (lower.includes('mystère') || lower.includes('magic') || lower.includes('secret')) return 'wonder';
  if (lower.includes('courir') || lower.includes('combat') || lower.includes('aventure')) return 'excitement';
  if (lower.includes('amour') || lower.includes('cœur') || lower.includes('aime')) return 'love';
  if (lower.includes('sage') || lower.includes('paix') || lower.includes('silence') || lower.includes('calme')) return 'peace';
  
  // Default: opening = wonder, middle = excitement, ending = peace
  if (index === 0) return 'wonder';
  if (index === total - 1) return 'peace';
  return 'excitement';
}

export function GriotStudio() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GriotAnimationEngine | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const pendingScenesRef = useRef<any>(null);
  const concatenatedAudioRef = useRef<{ url: string; blob: Blob } | null>(null);

  // State
  const [step, setStep] = useState<StudioStep>('create');
  const [narratorFile, setNarratorFile] = useState<File | Blob | null>(null);
  const [narratorPreviewUrl, setNarratorPreviewUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcribedStory, setTranscribedStory] = useState('');
  const [editableScenes, setEditableScenes] = useState<EditableScene[]>([]);
  const [style] = useState<AnimeStyleName>('african');
  const [duration, setDuration] = useState(30);
  const [selectedAssets, setSelectedAssets] = useState<LibraryAsset[]>([]);
  const [showNarratorCapture, setShowNarratorCapture] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [publishedVideoId, setPublishedVideoId] = useState<string | null>(null);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isManualMode, setIsManualMode] = useState(false);

  // Hooks
  const {
    state: generationState,
    result: generationResult,
    generateStory,
    generateFromScenes,
    generateFromSelectedAssets,
    reset: resetGeneration
  } = useAnimeStoryGenerator();

  const { preloadStyleFlares } = useVFXEngine();
  const { draft, saveDraft, clearDraft, isSaving } = useGriotDraft();

  // Auto-save draft
  useEffect(() => {
    if (['create', 'editing', 'preview', 'finalize'].includes(step)) {
      const timeout = setTimeout(() => {
        saveDraft({
          style, duration,
          audioUrl: null,
          narratorAvatarUrl: narratorPreviewUrl,
          step,
          scenes: generationResult?.scenes || null,
        });
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [step, style, duration, narratorPreviewUrl, generationResult, saveDraft]);

  // Initialize engine when canvas is ready
  useEffect(() => {
    const initEngine = async () => {
      if ((step === 'preview' || step === 'finalize') && canvasRef.current) {
        if (!engineRef.current) {
          engineRef.current = new GriotAnimationEngine(canvasRef.current);
        }
        const pending = pendingScenesRef.current;
        if (pending && engineRef.current) {
          try {
            await engineRef.current.loadScenes(pending.scenes);
            if (pending.narratorUrl) await engineRef.current.loadNarratorAvatar(pending.narratorUrl);
            if (pending.audioUrl) engineRef.current.setAudio(pending.audioUrl);
            pendingScenesRef.current = null;
          } catch (err) {
            console.error('[GriotStudio] Failed to load scenes:', err);
          }
        }
      }
    };
    initEngine();
    return () => {
      if (step !== 'preview' && step !== 'finalize' && engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [step]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    if (!document.fullscreenElement) {
      previewContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Handlers
  const handleNarratorCaptured = useCallback((file: File | Blob) => {
    setNarratorFile(file);
    setNarratorPreviewUrl(URL.createObjectURL(file));
    setShowNarratorCapture(false);
  }, []);

  const clearNarrator = useCallback(() => {
    if (narratorPreviewUrl) URL.revokeObjectURL(narratorPreviewUrl);
    setNarratorFile(null);
    setNarratorPreviewUrl(null);
  }, [narratorPreviewUrl]);

  /**
   * Recording complete → start transcription
   */
  /**
   * Start transcription process (extracted for reuse)
   */
  const startTranscription = useCallback(async (blob: Blob) => {
    setStep('transcribing');
    setTranscriptionProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setTranscriptionProgress(prev => Math.min(prev + 5, 85));
      }, 500);

      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      clearInterval(progressInterval);

      if (error) throw new Error(error.message || 'Transcription échouée');

      if (data?.success && data?.text) {
        setTranscriptionProgress(100);
        setTranscribedStory(data.text);
        const scenes = splitTextIntoScenes(data.text);
        setEditableScenes(scenes);
        toast({ title: '📝 Transcription terminée!', description: `${scenes.length} scènes détectées.` });
        setTimeout(() => setStep('editing'), 500);
      } else if (data?.useClientSide) {
        throw new Error('Transcription serveur indisponible');
      } else {
        throw new Error(data?.error || 'Transcription échouée');
      }
    } catch (error) {
      console.error('[GriotStudio] Transcription error:', error);
      setTranscriptionProgress(0);
      const fallbackText = 'Il était une fois, dans un village lointain, un conte merveilleux. Les anciens racontaient des histoires autour du feu. Chaque mot portait la sagesse des générations passées.';
      setTranscribedStory(fallbackText);
      setEditableScenes(splitTextIntoScenes(fallbackText));
      toast({
        title: '⚠️ Transcription manuelle',
        description: 'Modifie le texte ci-dessous avec ton conte.',
        variant: 'destructive'
      });
      setStep('editing');
    }
  }, [toast]);

  /**
   * Recording complete → save audio, then auto-transcribe or stay for manual path
   */
  const handleRecordingComplete = useCallback(async (blob: Blob, recordedDuration: number) => {
    setAudioBlob(blob);
    setAudioDuration(recordedDuration);
    setDuration(calcDuration(recordedDuration));
    const url = URL.createObjectURL(blob);
    setNarrationAudioUrl(url);

    if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
    toast({ title: '🎤 Enregistré!', description: `${Math.floor(recordedDuration)}s de ton conte.` });

    // Manual path: if assets are selected, stay in create (user clicks "Utiliser")
    if (selectedAssets.length > 0) {
      return;
    }

    // Auto path: proceed to transcription
    await startTranscription(blob);
  }, [toast, selectedAssets, startTranscription]);

  /**
   * Generate from edited scenes (MovieFlow approach)
   */
  const handleGenerateFromScenes = useCallback(async () => {
    setStep('generating');

    try {
      await preloadStyleFlares(style);

      let result;

      // Option A: user pre-selected assets → direct montage (no Edge Function)
      if (selectedAssets.length > 0) {
        result = await generateFromSelectedAssets(selectedAssets, duration);
      } else {
        // Option B: AI matching from edited scenes
        const validScenes = editableScenes.filter(s => s.text.trim().length > 0);
        if (validScenes.length === 0) {
          throw new Error('Aucune scène avec du texte');
        }
        result = await generateFromScenes(validScenes, style, duration);
      }

      if (!result || !result.scenes.length) {
        throw new Error('Aucune scène générée');
      }

      // Store scenes for engine
      let currentTime = 0;
      const scenesWithTiming = result.scenes.map((scene: StoryScene) => {
        const sceneData = {
          imageUrl: scene.imageUrl || '',
          videoUrl: scene.videoUrl,
          startTime: currentTime,
          endTime: currentTime + scene.durationSeconds,
          emotion: scene.emotion
        };
        currentTime += scene.durationSeconds;
        return sceneData;
      }).filter(s => s.imageUrl || s.videoUrl);

      pendingScenesRef.current = {
        scenes: scenesWithTiming,
        narratorUrl: narratorPreviewUrl,
        audioUrl: result.audioUrl,
        style, duration
      };

      setTranscribedStory(editableScenes.map(s => s.text).join(' '));

      // Concatenate per-scene TTS audios into narration (centralized, single concatenation)
      if (result.scenes.some(s => s.audioBase64)) {
        try {
          const concatenated = await concatenateSceneAudios(result.scenes);
          if (concatenated) {
            concatenatedAudioRef.current = concatenated;
            setNarrationAudioUrl(concatenated.url);
            setAudioBlob(concatenated.blob);
            console.log('[GriotStudio] Concatenated per-scene audios (centralized)');
          }
        } catch (e) {
          console.warn('[GriotStudio] Failed to concatenate scene audios:', e);
        }
      }

      setStep('preview');
    } catch (error) {
      console.error('[GriotStudio] Generation error:', error);
      toast({
        title: 'Erreur de génération',
        description: error instanceof Error ? error.message : 'Réessaie dans quelques instants.',
        variant: 'destructive'
      });
      setStep('editing');
    }
  }, [style, duration, editableScenes, selectedAssets, preloadStyleFlares, generateFromScenes, generateFromSelectedAssets, narratorPreviewUrl, narrationAudioUrl, toast]);

  const handleContinueToFinalize = useCallback(() => setStep('finalize'), []);

  // Manual path: use selected assets directly → finalize
  const handleUseAssets = useCallback(async () => {
    if (selectedAssets.length === 0) return;
    if ('vibrate' in navigator) navigator.vibrate(50);

    try {
      const result = await generateFromSelectedAssets(selectedAssets, duration);
      if (!result || !result.scenes.length) {
        throw new Error('Aucune scène générée');
      }

      let ct = 0;
      const scenesWithTiming = result.scenes.map((scene: StoryScene) => {
        const data = {
          imageUrl: scene.imageUrl || '',
          videoUrl: scene.videoUrl,
          startTime: ct,
          endTime: ct + scene.durationSeconds,
          emotion: scene.emotion
        };
        ct += scene.durationSeconds;
        return data;
      }).filter(s => s.imageUrl || s.videoUrl);

      pendingScenesRef.current = {
        scenes: scenesWithTiming,
        narratorUrl: narratorPreviewUrl,
        audioUrl: narrationAudioUrl,
        style, duration
      };

      setIsManualMode(true);
      setStep('finalize');
    } catch (error) {
      console.error('[GriotStudio] Use assets error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de préparer les illustrations.',
        variant: 'destructive'
      });
    }
  }, [selectedAssets, duration, generateFromSelectedAssets, narratorPreviewUrl, narrationAudioUrl, style, toast]);

  // Auto path: trigger transcription manually (back-from-transcription scenario)
  const handleAutoPath = useCallback(async () => {
    if (!audioBlob) return;
    await startTranscription(audioBlob);
  }, [audioBlob, startTranscription]);

  const handlePublishSuccess = useCallback((videoId: string) => {
    setPublishedVideoId(videoId);
    clearDraft();
    const feedUrl = videoId ? `/fitila?video=${videoId}` : '/fitila';
    toast({ title: '🎉 Félicitations !', description: 'Ton conte est maintenant visible sur le feed.' });
    // Force full page reload to close all modals (FullscreenCreator overlay)
    setTimeout(() => {
      window.location.href = feedUrl;
    }, 1200);
  }, [clearDraft, toast]);

  const handleViewInFeed = useCallback(() => {
    navigate(publishedVideoId ? `/fitila?video=${publishedVideoId}` : '/fitila');
  }, [navigate, publishedVideoId]);

  const handleReset = useCallback(() => {
    engineRef.current?.stopPreview();
    resetGeneration();
    clearNarrator();
    // Revoke narration URL
    if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
    setNarrationAudioUrl(null);
    setAudioBlob(null);
    setAudioDuration(0);
    setTranscribedStory('');
    setEditableScenes([]);
    setSelectedAssets([]);
    setIsManualMode(false);
    setPublishedVideoId(null);
    setTranscriptionProgress(0);
    clearDraft();
    setStep('create');
  }, [resetGeneration, clearNarrator, clearDraft, narrationAudioUrl]);

  const handleBack = useCallback(() => {
    if (step === 'finalize') {
      if (isManualMode) { setIsManualMode(false); setStep('create'); }
      else setStep('preview');
    }
    else if (step === 'preview') { engineRef.current?.stopPreview(); setStep('editing'); }
    else if (step === 'generating') setStep('editing');
    else if (step === 'editing') setStep('create');
    else if (step === 'transcribing') setStep('create');
  }, [step, isManualMode]);

  const handleCancelClick = useCallback(() => {
    if (audioBlob || generationResult) setShowCancelConfirm(true);
    else navigate('/fitila', { replace: true });
  }, [audioBlob, generationResult, navigate]);

  const confirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    handleReset();
    navigate('/fitila', { replace: true });
  }, [handleReset, navigate]);

  const handleModify = useCallback(() => {
    engineRef.current?.stopPreview();
    if (isManualMode) { setIsManualMode(false); setStep('create'); }
    else setStep('editing');
  }, [isManualMode]);

  const canGenerate = audioBlob !== null;

  // Step indicators
  const stepLabels: Record<StudioStep, { emoji: string; label: string }> = {
    create: { emoji: '🎙️', label: 'Enregistrer' },
    transcribing: { emoji: '📝', label: 'Transcription' },
    editing: { emoji: '✏️', label: 'Édition' },
    generating: { emoji: '🎨', label: 'Illustration' },
    preview: { emoji: '🎬', label: 'Aperçu' },
    finalize: { emoji: '📤', label: 'Publication' },
    success: { emoji: '🎉', label: 'Publié!' },
  };

  const stepOrder: StudioStep[] = isManualMode 
    ? ['create', 'finalize'] 
    : ['create', 'transcribing', 'editing', 'generating', 'preview', 'finalize'];
  const currentStepIndex = stepOrder.indexOf(step);

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-amber-950 via-black to-black text-white">
      {/* Confirmation Modal */}
      <AnimatePresence>
        <ConfirmModal
          isOpen={showCancelConfirm}
          title="Annuler la création ?"
          message="Ton enregistrement et tes illustrations seront perdus."
          confirmLabel="Oui, annuler"
          cancelLabel="Non, continuer"
          onConfirm={confirmCancel}
          onCancel={() => setShowCancelConfirm(false)}
        />
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-amber-500/20 safe-area-inset-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-1">
            {step !== 'create' && step !== 'success' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="text-amber-200 hover:text-amber-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleCancelClick} className="text-red-400 hover:text-red-300">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <h1 className="text-lg font-bold text-amber-100 flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <span className="hidden sm:inline">Griot Animé</span>
          </h1>

          <div className="flex items-center gap-1">
            {(step === 'preview' || step === 'finalize') && (
              <Button variant="ghost" size="icon" onClick={handleModify} className="text-amber-200 hover:text-amber-100" title="Modifier">
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}
            {isSaving ? (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            ) : (
              <Button variant="ghost" size="icon" onClick={() => saveDraft({ step })} className="text-amber-200 hover:text-amber-100" title="Sauvegarder">
                <Save className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Step Progress Bar */}
        {step !== 'success' && (
          <div className="flex items-center justify-center gap-1 mt-2 max-w-lg mx-auto">
            {stepOrder.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all',
                  i < currentStepIndex ? 'bg-green-500/80 text-white' :
                  i === currentStepIndex ? 'bg-amber-500 text-white scale-110' :
                  'bg-amber-900/40 text-amber-200/40'
                )}>
                  {i < currentStepIndex ? <Check className="w-3 h-3" /> : stepLabels[s].emoji}
                </div>
                {i < stepOrder.length - 1 && (
                  <div className={cn('w-4 h-0.5 mx-0.5', i < currentStepIndex ? 'bg-green-500/60' : 'bg-amber-900/30')} />
                )}
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 max-w-lg mx-auto w-full space-y-6 pb-32">

        {/* Step: Create */}
        {step === 'create' && (
          <>
            {showNarratorCapture && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="bg-amber-950 rounded-2xl p-6 max-w-sm w-full border border-amber-500/30">
                  <NarratorCapture
                    onImageCaptured={handleNarratorCaptured}
                    previewUrl={narratorPreviewUrl}
                    onClear={clearNarrator}
                    disabled={false}
                  />
                  <Button variant="ghost" onClick={() => setShowNarratorCapture(false)} className="w-full mt-4 text-amber-200/60">
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {/* Audio Section: recorded confirmation OR recorder */}
            {audioBlob ? (
              <motion.section
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-3"
              >
                <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-200">Voix enregistrée</p>
                    <p className="text-xs text-green-200/60">{Math.floor(audioDuration)}s de narration</p>
                  </div>
                  <button
                    onClick={() => {
                      if (narrationAudioUrl) URL.revokeObjectURL(narrationAudioUrl);
                      setAudioBlob(null);
                      setNarrationAudioUrl(null);
                      setAudioDuration(0);
                    }}
                    className="text-xs text-amber-200/50 hover:text-amber-100 transition-colors px-2 py-1 flex-shrink-0"
                  >
                    🔄 Refaire
                  </button>
                </div>
              </motion.section>
            ) : (
              <section className="py-4">
                <VinylRecorder
                  avatarUrl={narratorPreviewUrl}
                  maxDuration={120}
                  onRecordingComplete={handleRecordingComplete}
                  onAvatarCapture={() => setShowNarratorCapture(true)}
                  disabled={generationState.isGenerating}
                  accentColor="#FFD700"
                />
              </section>
            )}

            {/* Asset Gallery */}
            <AssetGallery
              selectedAssets={selectedAssets}
              onSelectionChange={setSelectedAssets}
              disabled={generationState.isGenerating}
            />

            {/* Bottom CTAs */}
            <div className="pt-4 space-y-3 pb-8">
              {/* Manual path: assets selected → "Utiliser" */}
              {selectedAssets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Button
                    size="lg"
                    onClick={handleUseAssets}
                    disabled={generationState.isGenerating}
                    className={cn(
                      'w-full py-6 text-base font-semibold rounded-2xl',
                      'bg-gradient-to-r from-green-500 to-emerald-500',
                      'hover:from-green-400 hover:to-emerald-400',
                      'shadow-xl shadow-green-500/20'
                    )}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    ✅ Utiliser ({selectedAssets.length} sélection{selectedAssets.length > 1 ? 's' : ''})
                  </Button>
                  <p className="text-xs text-center text-amber-200/40 mt-2">
                    {audioBlob ? 'Passer à la publication →' : 'Enregistrer ta voix à l\'étape suivante'}
                  </p>
                </motion.div>
              )}

              {/* Auto path: audio recorded, no assets → continue with AI */}
              {audioBlob && selectedAssets.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button
                    size="lg"
                    onClick={handleAutoPath}
                    className={cn(
                      'w-full py-6 text-base font-semibold rounded-2xl',
                      'bg-gradient-to-r from-amber-500 to-orange-500',
                      'hover:from-amber-400 hover:to-orange-400'
                    )}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    ▶ Continuer avec l'IA
                  </Button>
                  <p className="text-xs text-center text-amber-200/40 mt-2">
                    Transcription et illustration automatiques
                  </p>
                </motion.div>
              )}

              {/* Default hint */}
              {!audioBlob && selectedAssets.length === 0 && (
                <p className="text-xs text-center text-amber-200/40">
                  🎙️ Enregistre ton conte ou sélectionne des illustrations
                </p>
              )}
            </div>
          </>
        )}

        {/* Step: Transcribing */}
        {step === 'transcribing' && (
          <section className="flex-1 flex flex-col items-center justify-center py-12 space-y-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-2xl animate-pulse" />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mic className="w-20 h-20 text-amber-400 relative z-10" />
              </motion.div>
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-amber-100">📝 Écoute de ton conte...</h2>
              <p className="text-amber-200/70 text-sm">Transcription en cours via IA</p>
            </div>

            <div className="w-full max-w-xs space-y-2">
              <div className="w-full bg-amber-900/40 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${transcriptionProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-center text-amber-300 text-sm">
                {transcriptionProgress < 90 ? 'Transcription...' : '✅ Terminé!'}
              </p>
            </div>

            {/* Animated dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full bg-amber-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Step: Editing (SceneEditor) */}
        {step === 'editing' && (
          <SceneEditor
            scenes={editableScenes}
            onScenesChange={setEditableScenes}
            onValidate={handleGenerateFromScenes}
            isGenerating={generationState.isGenerating}
          />
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <section className="flex-1 flex flex-col items-center justify-center py-8 space-y-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-2xl animate-pulse" />
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wand2 className="w-20 h-20 text-amber-400 relative z-10" />
              </motion.div>
            </motion.div>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-amber-100">📚 Bibliothèque Griot</h2>
              <motion.p 
                key={generationState.message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-amber-200/80 text-base"
              >
                {generationState.message || 'Sélection des illustrations...'}
              </motion.p>
            </div>

            <div className="w-full max-w-xs space-y-2">
              <div className="w-full bg-amber-900/40 rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-full relative overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${generationState.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
              <p className="text-center text-amber-300 text-lg font-semibold">
                {Math.round(generationState.progress)}%
              </p>
            </div>

            {generationState.totalScenes > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center gap-3">
                {Array.from({ length: generationState.totalScenes }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                      i < generationState.currentScene ? 'bg-green-500 shadow-lg shadow-green-500/30' :
                      i === generationState.currentScene ? 'bg-amber-500 animate-pulse shadow-lg shadow-amber-500/30' :
                      'bg-amber-900/40 border border-amber-500/20'
                    )}
                  >
                    {i < generationState.currentScene ? <Check className="w-4 h-4 text-white" /> :
                     <span className="text-white/80 text-xs font-medium">{i + 1}</span>}
                  </motion.div>
                ))}
              </motion.div>
            )}

            <p className="text-amber-200/50 text-xs text-center max-w-xs">
              ⚡ Images matchées depuis la bibliothèque pré-générée
            </p>
          </section>
        )}

        {/* Step: Preview */}
        {step === 'preview' && generationResult && (
          <section className="space-y-6" ref={previewContainerRef}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-100">🎬 Preview / Gbíyà</h2>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-amber-200 hover:text-amber-100">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </Button>
            </div>

            <StoryPreviewPlayer
              scenes={generationResult.scenes}
              audioUrl={generationResult.audioUrl}
              narrationAudioUrl={narrationAudioUrl || undefined}
              narratorAvatarUrl={narratorPreviewUrl}
              style={style}
              duration={duration}
            />

            <div className="pt-4">
              <Button
                size="lg"
                onClick={handleContinueToFinalize}
                className={cn(
                  'w-full py-6 text-lg font-semibold rounded-2xl',
                  'bg-gradient-to-r from-amber-500 to-orange-500',
                  'hover:from-amber-400 hover:to-orange-400'
                )}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                ✅ Continuer / Tɛ́rɛ́
              </Button>
            </div>

            <Button variant="ghost" onClick={handleReset} className="w-full text-amber-200/60 hover:text-amber-200">
              🔄 Recommencer
            </Button>
          </section>
        )}

        {/* Step: Finalize */}
        {step === 'finalize' && (
          <section className="space-y-4 flex flex-col items-center w-full">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-amber-100">📤 Finaliser / Sɔ̀ɔ́rɔ́</h2>
            </div>
            {/* Canvas must remain mounted (off-screen) for engine to work in manual mode */}
            <canvas ref={canvasRef} width={540} height={960} className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true" />
            {generationResult ? (
              <PublishStep
                scenes={generationResult.scenes}
                audioUrl={generationResult.audioUrl}
                narrationAudioUrl={narrationAudioUrl || undefined}
                narrationBlob={audioBlob || undefined}
                narratorAvatarUrl={narratorPreviewUrl}
                style={style}
                duration={duration}
                storyText={transcribedStory}
                canvasRef={canvasRef}
                engineRef={engineRef}
                onPublishSuccess={handlePublishSuccess}
                onReset={handleReset}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                <p className="text-sm text-amber-200/60">Préparation des scènes...</p>
              </div>
            )}
          </section>
        )}

        {/* Step: Success — handled by PublishStep popup now */}
        {/* Success state is now handled internally by PublishStep */}
      </main>

      {/* Footer — integrated in flow, not fixed */}
      <footer className="py-3 bg-black/40 safe-area-inset-bottom">
        <p className="text-center text-xs text-amber-200/30">Griot Animé v7 • FITILA AI</p>
      </footer>
    </div>
  );
}

export default GriotStudio;
