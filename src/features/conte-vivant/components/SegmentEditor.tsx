import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Trash2, ImageIcon, Loader2, Play, Pause, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AssetGallery, type LibraryAsset } from '@/components/griot-studio/AssetGallery';
import { VinylRecorder } from '@/components/griot-studio/VinylRecorder';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { aiAssetGenerator } from '@/services/aiAssetGenerator';
import { toast } from 'sonner';
import { getSupportedAudioMimeType, getAudioBlobType, getRecorderTimeslice } from '@/lib/audioMimeUtils';
import type { SegmentDraft } from '../types/story.types';

interface SegmentEditorProps {
  segment: SegmentDraft;
  onChange: (updated: SegmentDraft) => void;
  label: string;
  showEndingOptions?: boolean;
  showChoiceOptions?: boolean;
}

const CHOICE_COLORS = [
  { name: 'Orange', hex: '#FF6B35' },
  { name: 'Teal', hex: '#00D4AA' },
  { name: 'Or', hex: '#F5A623' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
];

export default function SegmentEditor({ segment, onChange, label, showEndingOptions, showChoiceOptions }: SegmentEditorProps) {
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

  const { data: characterRefs } = useQuery({
    queryKey: ['character-references'],
    queryFn: async () => {
      const { data } = await supabase.from('character_references').select('*').order('character_name');
      return data || [];
    },
  });

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
        onChange({ ...segment, audio_blob: blob, audio_url: url, duration: 15 });
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(getRecorderTimeslice());
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Recording error:', err);
      toast.error('Micro non accessible : ' + (err.message || 'Erreur'));
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleAssetSelect = (assets: LibraryAsset[]) => {
    setSelectedAssets(assets);
    if (assets.length > 0) {
      const asset = assets[assets.length - 1];
      onChange({
        ...segment,
        media_url: asset.video_url || asset.image_url,
        mediaType: asset.asset_type === 'video' ? 'video' : 'photo',
      });
    }
  };

  const handleNarrationComplete = (blob: Blob, duration: number) => {
    const url = URL.createObjectURL(blob);
    onChange({ ...segment, narrator_audio_blob: blob, narrator_audio_url: url, duration: Math.round(duration) });
    setShowRecorder(false);
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

      {/* Media preview with playback controls */}
      {segment.media_url && (
        <div className="flex items-center gap-2">
          <div className="w-16 h-[86px] rounded-lg overflow-hidden bg-black/20 flex-shrink-0 relative">
            {segment.mediaType === 'video' ? (
              <>
                <video ref={videoRef} src={segment.media_url} className="w-full h-full object-cover"
                  onEnded={() => setIsPlayingVideo(false)} playsInline />
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
              <AssetGallery selectedAssets={selectedAssets} onSelectionChange={handleAssetSelect} maxSelection={1} />
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
            <div className="flex gap-2">
              <Input value={segment.ending_badge ?? ''} onChange={(e) => onChange({ ...segment, ending_badge: e.target.value })}
                placeholder="Badge emoji (ex: ⚔️)" className="w-24 text-sm" />
              <Input value={segment.ending_title ?? ''} onChange={(e) => onChange({ ...segment, ending_title: e.target.value })}
                placeholder="Titre de la fin" className="flex-1 text-sm" />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
