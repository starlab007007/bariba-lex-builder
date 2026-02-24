import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Trash2, ImageIcon, Loader2, Play, Pause, Video, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AssetGallery, type LibraryAsset } from '@/components/griot-studio/AssetGallery';
import { VinylRecorder } from '@/components/griot-studio/VinylRecorder';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { aiAssetGenerator } from '@/services/aiAssetGenerator';
import { toast } from 'sonner';
import { getSupportedAudioMimeType, getAudioBlobType, getRecorderTimeslice } from '@/lib/audioMimeUtils';
import type { SegmentDraft } from '../types/story.types';
import { NARRATOR_VOICES, type NarratorVoice } from '../types/story.types';

const MAX_RECORDING_DURATION = 30; // seconds

async function transcribeBlob(blob: Blob): Promise<string | null> {
  try {
    const formData = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    formData.append('file', new File([blob], `narration.${ext}`, { type: blob.type }));

    const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: formData });
    if (error) throw error;
    return data?.text || null;
  } catch (err: any) {
    console.error('Transcription error:', err);
    return null;
  }
}

interface SegmentEditorProps {
  segment: SegmentDraft;
  onChange: (updated: SegmentDraft) => void;
  label: string;
  showEndingOptions?: boolean;
  showChoiceOptions?: boolean;
  maxMediaSelection?: number;
}

const ENDING_EMOJIS = [
  { emoji: '👍', label: 'Like' }, { emoji: '👎', label: 'Dislike' }, { emoji: '❤️', label: 'Amour' }, { emoji: '💔', label: 'Triste' },
  { emoji: '⚔️', label: 'Combat' }, { emoji: '🏆', label: 'Victoire' }, { emoji: '💀', label: 'Défaite' }, { emoji: '🌟', label: 'Étoile' },
  { emoji: '🎭', label: 'Théâtre' }, { emoji: '🔥', label: 'Feu' }, { emoji: '😂', label: 'Rire' }, { emoji: '😢', label: 'Pleure' },
  { emoji: '🦁', label: 'Lion' }, { emoji: '🐉', label: 'Dragon' }, { emoji: '👑', label: 'Roi' }, { emoji: '🌍', label: 'Monde' },
];

const CHOICE_COLORS = [
  { name: 'Orange', hex: '#FF6B35' },
  { name: 'Teal', hex: '#00D4AA' },
  { name: 'Or', hex: '#F5A623' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
];

export default function SegmentEditor({ segment, onChange, label, showEndingOptions, showChoiceOptions, maxMediaSelection = 1 }: SegmentEditorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showAssetGallery, setShowAssetGallery] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<LibraryAsset[]>([]);
  const [selectedColor, setSelectedColor] = useState('#FF6B35');
  const [selectedPosition, setSelectedPosition] = useState<'left' | 'right'>('left');
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: characterRefs } = useQuery({
    queryKey: ['character-references'],
    queryFn: async () => {
      const { data } = await supabase.from('character_references').select('*').order('character_name');
      return data || [];
    },
  });

  const cleanupRecordingTimers = useCallback(() => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    setRecordingElapsed(0);
  }, []);

  const generateTTSAudio = useCallback(async (text: string, seg: SegmentDraft): Promise<SegmentDraft | null> => {
    if (!text.trim()) return null;
    setIsGeneratingTTS(true);
    try {
      const voiceToUse = seg.voice || 'narrator';
      const { data, error } = await supabase.functions.invoke('french-tts', {
        body: { text, voice: voiceToUse, returnAudio: true },
      });
      if (error) throw error;
      if (!data?.audioBase64) {
        toast.error('Génération audio échouée (pas de données)');
        return null;
      }
      const dataUri = `data:audio/mpeg;base64,${data.audioBase64}`;
      // Create blob for upload
      const res = await fetch(dataUri);
      const blob = await res.blob();
      // Calculate real audio duration
      return new Promise<SegmentDraft>((resolve) => {
        const audio = new Audio(dataUri);
        audio.onloadedmetadata = () => {
          const duration = Math.ceil(audio.duration);
          const updated = { ...seg, narrator_audio_url: dataUri, narrator_audio_blob: blob, duration };
          resolve(updated);
        };
        audio.onerror = () => {
          // Fallback: keep text duration
          const updated = { ...seg, narrator_audio_url: dataUri, narrator_audio_blob: blob };
          resolve(updated);
        };
      });
    } catch (err: any) {
      console.error('TTS generation error:', err);
      toast.error('Erreur génération voix: ' + (err.message || 'Erreur'));
      return null;
    } finally {
      setIsGeneratingTTS(false);
    }
  }, []);

  const handleGenerateTTS = useCallback(async () => {
    const result = await generateTTSAudio(segment.text_content, segment);
    if (result) {
      onChange(result);
      toast.success('🎙️ Voix générée et synchronisée');
    }
  }, [segment, onChange, generateTTSAudio]);

  const autoTranscribe = useCallback(async (blob: Blob, updatedSegment: SegmentDraft) => {
    setIsTranscribing(true);
    const text = await transcribeBlob(blob);
    setIsTranscribing(false);
    if (text) {
      const segWithText = { ...updatedSegment, text_content: text };
      onChange(segWithText);
      toast.success('Transcription terminée');
      // Auto-generate TTS after transcription
      const ttsResult = await generateTTSAudio(text, segWithText);
      if (ttsResult) {
        onChange(ttsResult);
        toast.success('🎙️ Voix auto-générée');
      }
    } else {
      toast.error('Transcription échouée — texte non rempli');
    }
  }, [onChange, generateTTSAudio]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: getAudioBlobType() });
        const url = URL.createObjectURL(blob);
        const elapsed = Math.round((Date.now() - recordingStartRef.current) / 1000);
        const updated = { ...segment, audio_blob: blob, audio_url: url, duration: Math.min(elapsed, MAX_RECORDING_DURATION) };
        onChange(updated);
        cleanupRecordingTimers();
        // Auto-transcribe
        autoTranscribe(blob, updated);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(getRecorderTimeslice());
      setMediaRecorder(recorder);
      setIsRecording(true);
      recordingStartRef.current = Date.now();
      setRecordingElapsed(0);

      // Elapsed timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingElapsed(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 200);

      // Auto-stop at max duration
      autoStopRef.current = setTimeout(() => {
        recorder.stop();
        setIsRecording(false);
        setMediaRecorder(null);
      }, MAX_RECORDING_DURATION * 1000);
    } catch (err: any) {
      console.error('Recording error:', err);
      toast.error('Micro non accessible : ' + (err.message || 'Erreur'));
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
    cleanupRecordingTimers();
  };

  const handleAssetSelect = (assetsOrUpdater: LibraryAsset[] | ((prev: LibraryAsset[]) => LibraryAsset[])) => {
    // Support both direct array and functional updater from AssetGallery
    const resolvedAssets = typeof assetsOrUpdater === 'function'
      ? assetsOrUpdater(selectedAssets)
      : assetsOrUpdater;
    setSelectedAssets(resolvedAssets);
    if (resolvedAssets.length > 0) {
      const lastAsset = resolvedAssets[resolvedAssets.length - 1];
      // Store all selected assets' media URLs (video_url for videos, image_url for photos)
      if (maxMediaSelection > 1) {
        onChange({
          ...segment,
          image_urls: resolvedAssets.map(a =>
            (a.asset_type === 'video' && a.video_url) ? a.video_url : a.image_url
          ),
          media_url: lastAsset.video_url || lastAsset.image_url,
          mediaType: lastAsset.asset_type === 'video' ? 'video' : 'photo',
        });
      } else {
        onChange({
          ...segment,
          media_url: lastAsset.video_url || lastAsset.image_url,
          mediaType: lastAsset.asset_type === 'video' ? 'video' : 'photo',
        });
      }
    }
  };

  const handleNarrationComplete = (blob: Blob, duration: number) => {
    const url = URL.createObjectURL(blob);
    const updated = { ...segment, narrator_audio_blob: blob, narrator_audio_url: url, duration: Math.round(duration) };
    onChange(updated);
    setShowRecorder(false);
    // Auto-transcribe narration
    autoTranscribe(blob, updated);
  };

  const handleGenerateAsset = async () => {
    if (!selectedCharacter) {
      toast.error('Sélectionnez un personnage de référence');
      return;
    }
    setIsGenerating(true);
    try {
      setGenerationProgress('🎨 Préparation...');
      const charRef = characterRefs?.find((c: any) => c.id === selectedCharacter);
      setGenerationProgress('✨ Génération en cours...');
      const asset = await aiAssetGenerator.generateConsistentAsset({
        sceneType: 'village',
        characterType: charRef?.character_name || 'griot',
        mediaType: segment.mediaType || 'photo',
        durationSec: segment.duration || 12,
      });
      onChange({
        ...segment,
        media_url: (asset as any).image_url,
        mediaType: (asset as any).asset_type === 'video' ? 'video' : 'photo',
      });
      toast.success(`Asset généré avec ${Math.round(((asset as any).consistency_score || 0.8) * 100)}% de cohérence`);
    } catch (error: any) {
      toast.error('Échec de la génération : ' + (error.message || 'Erreur'));
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlayingVideo) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlayingVideo(!isPlayingVideo);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10"
    >
      <h4 className="font-semibold text-sm text-white">{label}</h4>

      {/* Title */}
      <Input
        value={segment.title}
        onChange={(e) => onChange({ ...segment, title: e.target.value })}
        placeholder="Titre du segment..."
        className="text-sm bg-white/10 border-white/20 text-white placeholder:text-white/40"
      />

      {/* Text content */}
      <textarea
        value={segment.text_content}
        onChange={(e) => onChange({ ...segment, text_content: e.target.value })}
        placeholder="Texte narratif du segment..."
        className="w-full h-20 px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white text-sm resize-none placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      />

      {/* Inline recording timer */}
      {isRecording && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 animate-pulse">
          <Square className="w-4 h-4 text-destructive" />
          <span className="text-sm font-mono font-bold text-destructive">
            {recordingElapsed}s / {MAX_RECORDING_DURATION}s
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${(recordingElapsed / MAX_RECORDING_DURATION) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Transcription loading indicator */}
      {isTranscribing && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs font-medium text-primary">Transcription en cours...</span>
        </div>
      )}
      {/* Media preview with playback controls */}
      {segment.media_url && (
        <div className="flex items-center gap-2">
          <div className="w-16 h-[86px] rounded-lg overflow-hidden bg-black/20 flex-shrink-0 relative">
            {segment.mediaType === 'video' ? (
              <>
                <video ref={videoRef} src={segment.media_url} className="w-full h-full object-cover"
                  preload="none" poster="" onEnded={() => setIsPlayingVideo(false)} playsInline />
                <button onClick={toggleVideoPlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition">
                  {isPlayingVideo ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                </button>
              </>
            ) : (
              <img src={segment.media_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <Button size="sm" variant="ghost"
            onClick={() => onChange({ ...segment, media_url: undefined, mediaType: undefined })}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      )}

      {/* TTS generation loading */}
      {isGeneratingTTS && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          <span className="text-xs font-medium text-purple-300">Génération de la voix...</span>
        </div>
      )}

      {/* Narration audio playback */}
      {segment.narrator_audio_url && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/20 border border-accent/30">
          <span className="text-xs font-medium text-white">🎙️ Narration ({segment.duration}s)</span>
          <audio src={segment.narrator_audio_url} controls className="h-8 flex-1" />
          <Button size="icon" variant="ghost" className="w-7 h-7"
            onClick={() => onChange({ ...segment, narrator_audio_blob: undefined, narrator_audio_url: undefined })}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      )}

      {/* Voice selector */}
      <div className="space-y-1.5">
        <p className="text-xs text-white/70 font-medium">🎙️ Voix du narrateur</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NARRATOR_VOICES.map((v) => (
            <button
              key={v.key}
              onClick={() => {
                onChange({ ...segment, voice: v.key });
                if (segment.narrator_audio_url && segment.text_content.trim()) {
                  const updatedSeg = { ...segment, voice: v.key, narrator_audio_url: undefined, narrator_audio_blob: undefined };
                  onChange(updatedSeg);
                  generateTTSAudio(segment.text_content, updatedSeg).then(result => {
                    if (result) {
                      onChange(result);
                      toast.success(`🎙️ Voix ${v.label} générée`);
                    }
                  });
                }
              }}
              className="flex-shrink-0 px-3 py-2 rounded-lg border-2 transition text-xs min-w-[70px] text-center"
              style={{
                background: (segment.voice || 'narrator') === v.key ? 'rgb(147 51 234)' : 'rgba(255,255,255,0.05)',
                borderColor: (segment.voice || 'narrator') === v.key ? 'rgb(168 85 247)' : 'rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            >
              <span className="block text-base">{v.label.split(' ')[0]}</span>
              <span className="block text-[10px] text-white/60">{v.label.split(' ')[1]}</span>
              <span className="block text-[9px] text-white/40 mt-0.5">{v.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Media & narration actions */}
      <div className="flex flex-wrap gap-2">
        {/* Asset Gallery Sheet */}
        <Sheet open={showAssetGallery} onOpenChange={setShowAssetGallery}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-1.5 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              <ImageIcon className="w-4 h-4" />
              Visuel
              {segment.media_url && <span className="text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center">✓</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] bg-background">
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              <h3 className="text-lg font-bold text-foreground">Sélectionner un visuel</h3>
              <AssetGallery selectedAssets={selectedAssets} onSelectionChange={handleAssetSelect} maxSelection={maxMediaSelection} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Narration Recorder Dialog */}
        <Dialog open={showRecorder} onOpenChange={setShowRecorder}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 min-h-[44px] bg-blue-600 hover:bg-blue-500 text-white font-semibold">
              <Mic className="w-4 h-4" />
              Narration
              {segment.narrator_audio_url && <span className="text-xs text-green-500 ml-1">✅</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border max-w-sm">
            <VinylRecorder onRecordingComplete={handleNarrationComplete} maxDuration={30} />
          </DialogContent>
        </Dialog>

        {/* TTS Generate button */}
        {segment.text_content.trim() && !segment.narrator_audio_url && (
          <Button size="sm" onClick={handleGenerateTTS}
            disabled={isGeneratingTTS}
            className="gap-1.5 min-h-[44px] bg-purple-600 hover:bg-purple-500 text-white font-semibold">
            {isGeneratingTTS ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Génération...</>
            ) : (
              <><Volume2 className="w-4 h-4" />Générer la voix</>
            )}
          </Button>
        )}

        {/* AI Generate button */}
        <Button size="sm" variant="outline" onClick={handleGenerateAsset}
          disabled={isGenerating || !selectedCharacter}
          className="gap-1.5 min-h-[44px] border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{generationProgress}</>
          ) : '✨ Générer IA'}
        </Button>
      </div>

      {/* Character reference selector */}
      {characterRefs && characterRefs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-white/70 font-medium">🎭 Personnage de référence</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {characterRefs.map((char: any) => (
              <button key={char.id} onClick={() => setSelectedCharacter(char.id)}
                className="flex-shrink-0 p-2 rounded-lg border-2 transition text-xs min-w-[60px]"
                style={{
                  background: selectedCharacter === char.id ? 'hsl(var(--accent))' : 'transparent',
                  borderColor: selectedCharacter === char.id ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                }}>
                <img src={char.reference_image_url} alt="" className="w-8 h-8 rounded-full object-cover mx-auto" />
                <span className="block mt-1 text-white/70">{char.character_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Choice options: color + position */}
      {showChoiceOptions && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="space-y-1.5">
            <p className="text-xs text-white/70 font-medium">🎨 Couleur du choix</p>
            <div className="flex gap-2 overflow-x-auto">
              {CHOICE_COLORS.map(color => (
                <button key={color.hex} onClick={() => setSelectedColor(color.hex)}
                  className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                  style={{
                    backgroundColor: color.hex,
                    border: selectedColor === color.hex ? '2px solid white' : '2px solid transparent',
                    boxShadow: selectedColor === color.hex ? `0 0 8px ${color.hex}` : 'none',
                  }} title={color.name} />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-white/70 font-medium">📍 Position du choix</p>
            <div className="flex gap-2">
              {(['left', 'right'] as const).map(pos => (
                <button key={pos} onClick={() => setSelectedPosition(pos)}
                  className="flex-1 px-3 py-2 rounded-lg border-2 text-sm transition min-h-[44px]"
                  style={{
                    background: selectedPosition === pos ? 'rgb(37 99 235)' : 'transparent',
                    borderColor: selectedPosition === pos ? 'rgb(37 99 235)' : 'hsl(var(--border))',
                    color: selectedPosition === pos ? '#fff' : 'hsl(var(--foreground))',
                  }}>
                  {pos === 'left' ? '← Gauche' : 'Droite →'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ending options */}
      {showEndingOptions && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={segment.is_ending}
              onChange={(e) => onChange({ ...segment, is_ending: e.target.checked })} className="rounded" />
            <span className="text-white">C'est une fin</span>
          </label>
          {segment.is_ending && (
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-12 h-10 text-xl bg-white/10 border-white/20 hover:bg-white/20">
                    {segment.ending_badge || '😀'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-popover border-border" align="start">
                  <div className="grid grid-cols-4 gap-1">
                    {ENDING_EMOJIS.map(({ emoji, label }) => (
                      <button key={emoji} onClick={() => onChange({ ...segment, ending_badge: emoji })}
                        className="flex flex-col items-center p-1.5 rounded-lg hover:bg-accent transition text-center"
                        title={label}>
                        <span className="text-xl">{emoji}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Input value={segment.ending_title ?? ''} onChange={(e) => onChange({ ...segment, ending_title: e.target.value })}
                placeholder="Titre de la fin" className="flex-1 text-sm bg-white text-black placeholder:text-gray-400" />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
