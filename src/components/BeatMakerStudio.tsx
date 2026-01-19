/**
 * BeatMakerStudio - DAW-style UI for AI Beat Generation
 * Modern Ableton-inspired interface for creating Afrobeat tracks
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Hand,
  Upload,
  Sparkles,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Headphones,
  Download,
  Share2,
  Settings,
  Loader2,
  Music,
  Waves,
  Sliders,
  RotateCcw,
  ChevronDown,
  Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  BeatMakerAITemplate,
  BeatMakerEngine,
  BeatMakerInputs,
  BeatComposition,
  BeatStyle,
  MusicalKey,
  MusicalMode,
  TapEvent,
  BeatTrack
} from '@/templates/BeatMakerAI';

// ============================================================================
// TYPES
// ============================================================================

type InputMode = 'hum' | 'tap' | 'upload' | 'scratch';
type StudioView = 'input' | 'studio' | 'export';

interface TrackMixerState {
  drums: { volume: number; muted: boolean; solo: boolean };
  bass: { volume: number; muted: boolean; solo: boolean };
  melody: { volume: number; muted: boolean; solo: boolean };
  chords: { volume: number; muted: boolean; solo: boolean };
  fx: { volume: number; muted: boolean; solo: boolean };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BeatMakerStudio: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BeatMakerEngine | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  // State
  const [view, setView] = useState<StudioView>('input');
  const [inputMode, setInputMode] = useState<InputMode>('scratch');
  const [style, setStyle] = useState<BeatStyle>('afrobeat');
  const [tempo, setTempo] = useState(120);
  const [musicalKey, setMusicalKey] = useState<MusicalKey>('C');
  const [mode, setMode] = useState<MusicalMode>('minor');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [tapPattern, setTapPattern] = useState<TapEvent[]>([]);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  
  // Playback state
  const [composition, setComposition] = useState<BeatComposition | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  
  // Mixer state
  const [mixer, setMixer] = useState<TrackMixerState>({
    drums: { volume: 0.85, muted: false, solo: false },
    bass: { volume: 0.8, muted: false, solo: false },
    melody: { volume: 0.7, muted: false, solo: false },
    chords: { volume: 0.5, muted: false, solo: false },
    fx: { volume: 0.6, muted: false, solo: false }
  });

  // Initialize engine
  useEffect(() => {
    engineRef.current = new BeatMakerEngine();
    engineRef.current.initialize();
    
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  // Setup visualization when composition is ready
  useEffect(() => {
    if (composition && canvasRef.current && engineRef.current) {
      engineRef.current.setupVisualization(canvasRef.current);
    }
  }, [composition]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Handle microphone recording (hum mode)
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'humming.webm', { type: 'audio/webm' });
        setAudioFile(file);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      toast({
        title: 'Erreur microphone',
        description: 'Impossible d\'accéder au microphone',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      toast({ title: 'Audio importé', description: file.name });
    }
  }, [toast]);

  // Handle tap input
  const handleTap = useCallback((type: TapEvent['type']) => {
    const event: TapEvent = {
      timestamp: Date.now(),
      velocity: 0.8 + Math.random() * 0.2,
      type
    };
    setTapPattern(prev => [...prev, event]);
    
    // Visual feedback
    const audio = new Audio();
    audio.src = type === 'kick' 
      ? '/sounds/kick.wav' 
      : type === 'snare' 
        ? '/sounds/snare.wav' 
        : '/sounds/hat.wav';
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }, []);

  const clearTaps = useCallback(() => {
    setTapPattern([]);
  }, []);

  // Generate beat
  const generateBeat = useCallback(async () => {
    if (!engineRef.current) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setView('studio');

    try {
      const inputs: BeatMakerInputs = {
        inputType: inputMode,
        audioInput: audioFile || undefined,
        tapPattern: tapPattern.length > 0 ? tapPattern : undefined,
        style,
        tempo,
        key: musicalKey,
        mode,
        duration: 120
      };

      const result = await engineRef.current.generateBeat(inputs, (progress, stage) => {
        setGenerationProgress(progress * 100);
        setGenerationStage(stage);
      });

      setComposition(result);
      toast({ title: 'Beat créé!', description: `${result.name} - ${result.tempo} BPM` });
    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: 'Erreur',
        description: 'La génération a échoué',
        variant: 'destructive'
      });
      setView('input');
    } finally {
      setIsGenerating(false);
    }
  }, [inputMode, audioFile, tapPattern, style, tempo, musicalKey, mode, toast]);

  // Playback controls
  const togglePlayback = useCallback(async () => {
    if (!engineRef.current || !composition) return;

    if (isPlaying) {
      engineRef.current.pause();
      setIsPlaying(false);
    } else {
      await engineRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, composition]);

  const stopPlayback = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.stop();
    setIsPlaying(false);
    setPlaybackPosition(0);
  }, []);

  // Mixer controls
  const handleVolumeChange = useCallback((trackId: string, value: number[]) => {
    const volume = value[0];
    setMixer(prev => ({
      ...prev,
      [trackId]: { ...prev[trackId as keyof TrackMixerState], volume }
    }));
    engineRef.current?.setTrackVolume(trackId, volume);
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    setMixer(prev => ({
      ...prev,
      [trackId]: { 
        ...prev[trackId as keyof TrackMixerState], 
        muted: !prev[trackId as keyof TrackMixerState].muted 
      }
    }));
    engineRef.current?.toggleMute(trackId);
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    setMixer(prev => ({
      ...prev,
      [trackId]: { 
        ...prev[trackId as keyof TrackMixerState], 
        solo: !prev[trackId as keyof TrackMixerState].solo 
      }
    }));
    engineRef.current?.toggleSolo(trackId);
  }, []);

  // Export functions
  const exportAudio = useCallback(async (format: 'wav' | 'mp3') => {
    if (!engineRef.current || !composition) return;

    try {
      const buffer = await engineRef.current.renderToAudio(composition);
      // For now, export as WAV (MP3 would need additional encoding)
      const stems = await engineRef.current.exportStems(composition);
      
      const url = URL.createObjectURL(stems.master);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${composition.name.replace(/\s+/g, '-')}.wav`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Exporté!', description: `${composition.name}.wav` });
    } catch (error) {
      toast({ title: 'Erreur export', variant: 'destructive' });
    }
  }, [composition, toast]);

  const exportStems = useCallback(async () => {
    if (!engineRef.current || !composition) return;

    try {
      const stems = await engineRef.current.exportStems(composition);
      
      // Create zip file with all stems
      for (const [name, blob] of Object.entries(stems)) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${composition.name}-${name}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: 'Stems exportés!', description: '6 fichiers audio' });
    } catch (error) {
      toast({ title: 'Erreur export', variant: 'destructive' });
    }
  }, [composition, toast]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // RENDER: INPUT VIEW
  // ============================================================================

  const renderInputView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      {/* Input Mode Selection */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { id: 'hum' as const, icon: Mic, label: 'Fredonner', desc: 'Chantez votre mélodie' },
          { id: 'tap' as const, icon: Hand, label: 'Taper', desc: 'Tapez le rythme' },
          { id: 'upload' as const, icon: Upload, label: 'Importer', desc: 'Audio existant' },
          { id: 'scratch' as const, icon: Sparkles, label: 'AI', desc: 'Générer de zéro' }
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setInputMode(mode.id)}
            className={`p-4 rounded-xl border-2 transition-all ${
              inputMode === mode.id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <mode.icon className={`h-6 w-6 mx-auto mb-2 ${
              inputMode === mode.id ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <p className="text-sm font-medium">{mode.label}</p>
            <p className="text-xs text-muted-foreground hidden sm:block">{mode.desc}</p>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          {inputMode === 'hum' && (
            <div className="text-center space-y-4">
              {isRecording ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-red-500/20 animate-pulse mx-auto flex items-center justify-center">
                    <Mic className="h-12 w-12 text-red-500" />
                  </div>
                  <p className="text-2xl font-mono text-red-500">{formatTime(recordingTime)}</p>
                  <Button onClick={stopRecording} variant="destructive" size="lg">
                    Arrêter
                  </Button>
                </>
              ) : (
                <>
                  {audioFile ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
                        <Music className="h-8 w-8 text-green-500" />
                      </div>
                      <p className="text-sm">{audioFile.name}</p>
                      <Button onClick={() => setAudioFile(null)} variant="outline" size="sm">
                        Supprimer
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-muted-foreground">
                        Fredonnez votre mélodie, l'AI la transformera en beat
                      </p>
                      <Button onClick={startRecording} size="lg" className="gap-2">
                        <Mic className="h-5 w-5" />
                        Commencer
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {inputMode === 'tap' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                Tapez sur les pads pour créer votre rythme
              </p>
              
              {/* Tap Pads */}
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                {[
                  { type: 'kick' as const, label: 'KICK', color: 'bg-orange-500' },
                  { type: 'snare' as const, label: 'SNARE', color: 'bg-blue-500' },
                  { type: 'hat' as const, label: 'HI-HAT', color: 'bg-green-500' },
                  { type: 'perc' as const, label: 'PERC', color: 'bg-purple-500' }
                ].map((pad) => (
                  <motion.button
                    key={pad.type}
                    whileTap={{ scale: 0.95 }}
                    onPointerDown={() => handleTap(pad.type)}
                    className={`aspect-square rounded-xl ${pad.color} text-white font-bold text-lg
                      shadow-lg active:shadow-none transition-shadow`}
                  >
                    {pad.label}
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {tapPattern.length} taps enregistrés
                </p>
                <Button onClick={clearTaps} variant="ghost" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}

          {inputMode === 'upload' && (
            <div className="text-center space-y-4">
              {audioFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
                    <Music className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm">{audioFile.name}</p>
                  <Button onClick={() => setAudioFile(null)} variant="outline" size="sm">
                    Changer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Glissez un fichier audio ou cliquez pour importer
                    </p>
                  </div>
                  <Button onClick={() => audioInputRef.current?.click()} variant="outline">
                    Choisir un fichier
                  </Button>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
          )}

          {inputMode === 'scratch' && (
            <div className="text-center space-y-4 py-8">
              <Sparkles className="h-16 w-16 mx-auto text-primary" />
              <h3 className="text-lg font-semibold">Génération AI Pure</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                L'intelligence artificielle composera un beat original 
                basé sur le style et les paramètres sélectionnés
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Style & Parameters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Style Selection */}
          <div className="space-y-2">
            <Label>Style musical</Label>
            <RadioGroup
              value={style}
              onValueChange={(v) => setStyle(v as BeatStyle)}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { value: 'afrobeat', label: 'Afrobeat', emoji: '🥁' },
                { value: 'amapiano', label: 'Amapiano', emoji: '🎹' },
                { value: 'coupe-decale', label: 'Coupé-Décalé', emoji: '💃' }
              ].map((s) => (
                <Label
                  key={s.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                    style === s.value 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border'
                  }`}
                >
                  <RadioGroupItem value={s.value} className="sr-only" />
                  <span>{s.emoji}</span>
                  <span className="text-sm">{s.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          {/* BPM Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Tempo</Label>
              <span className="text-sm font-mono text-primary">{tempo} BPM</span>
            </div>
            <Slider
              value={[tempo]}
              onValueChange={(v) => setTempo(v[0])}
              min={60}
              max={200}
              step={1}
            />
          </div>

          {/* Key & Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tonalité</Label>
              <Select value={musicalKey} onValueChange={(v) => setMusicalKey(v as MusicalKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as MusicalMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="major">Majeur</SelectItem>
                  <SelectItem value="minor">Mineur</SelectItem>
                  <SelectItem value="dorian">Dorien</SelectItem>
                  <SelectItem value="mixolydian">Mixolydien</SelectItem>
                  <SelectItem value="pentatonic">Pentatonique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button 
        onClick={generateBeat} 
        size="lg" 
        className="w-full gap-2"
        disabled={
          (inputMode === 'hum' && !audioFile) ||
          (inputMode === 'tap' && tapPattern.length < 4) ||
          (inputMode === 'upload' && !audioFile)
        }
      >
        <Sparkles className="h-5 w-5" />
        Générer le Beat
      </Button>
    </motion.div>
  );

  // ============================================================================
  // RENDER: STUDIO VIEW
  // ============================================================================

  const renderStudioView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {/* Generation Progress */}
      {isGenerating && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">{generationStage}</span>
            </div>
            <Progress value={generationProgress} />
          </CardContent>
        </Card>
      )}

      {/* Visualization */}
      <Card className="overflow-hidden bg-black">
        <CardContent className="p-0">
          <canvas 
            ref={canvasRef}
            className="w-full h-48"
            width={800}
            height={200}
          />
        </CardContent>
      </Card>

      {/* Transport Controls */}
      {composition && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Play/Stop */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant={isPlaying ? 'default' : 'outline'}
                  onClick={togglePlayback}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button size="icon" variant="outline" onClick={stopPlayback}>
                  <Square className="h-4 w-4" />
                </Button>
              </div>

              {/* Info */}
              <div className="text-center">
                <p className="text-sm font-medium">{composition.name}</p>
                <p className="text-xs text-muted-foreground">
                  {composition.tempo} BPM • {composition.key} {composition.mode}
                </p>
              </div>

              {/* Position */}
              <div className="text-right font-mono text-sm">
                {formatTime(playbackPosition)} / {formatTime(composition.duration)}
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-4">
              <Slider
                value={[playbackPosition]}
                max={composition.duration}
                step={0.1}
                className="cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mixer */}
      {composition && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Mixer
              </h3>
            </div>

            <div className="space-y-3">
              {Object.entries(mixer).map(([trackId, state]) => (
                <div key={trackId} className="flex items-center gap-3">
                  {/* Track name */}
                  <div className="w-20">
                    <p className="text-sm font-medium capitalize">{trackId}</p>
                  </div>

                  {/* Mute/Solo */}
                  <Button
                    size="icon"
                    variant={state.muted ? 'destructive' : 'ghost'}
                    className="h-8 w-8"
                    onClick={() => toggleMute(trackId)}
                  >
                    {state.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="icon"
                    variant={state.solo ? 'default' : 'ghost'}
                    className="h-8 w-8"
                    onClick={() => toggleSolo(trackId)}
                  >
                    <Headphones className="h-3 w-3" />
                  </Button>

                  {/* Volume */}
                  <div className="flex-1">
                    <Slider
                      value={[state.volume]}
                      max={1}
                      step={0.01}
                      onValueChange={(v) => handleVolumeChange(trackId, v)}
                      disabled={state.muted}
                    />
                  </div>

                  {/* Volume % */}
                  <span className="w-12 text-xs text-muted-foreground text-right">
                    {Math.round(state.volume * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {composition && (
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => setView('input')} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Nouveau
          </Button>
          <Button onClick={() => setView('export')} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      )}
    </motion.div>
  );

  // ============================================================================
  // RENDER: EXPORT VIEW
  // ============================================================================

  const renderExportView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold">Exporter votre Beat</h2>
        <p className="text-muted-foreground mt-1">{composition?.name}</p>
      </div>

      <div className="grid gap-4">
        {/* WAV Export */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => exportAudio('wav')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Waves className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium">WAV (Haute qualité)</p>
              <p className="text-sm text-muted-foreground">Format non compressé</p>
            </div>
            <Download className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Stems Export */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={exportStems}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Sliders className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Stems (Pistes séparées)</p>
              <p className="text-sm text-muted-foreground">
                Drums, Bass, Melody, Chords, FX
              </p>
            </div>
            <Download className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        {/* Share */}
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Link2 className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Partager</p>
              <p className="text-sm text-muted-foreground">Créer un lien de collaboration</p>
            </div>
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <Button onClick={() => setView('studio')} variant="outline" className="w-full">
        Retour au Studio
      </Button>
    </motion.div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">🎵</span>
            Beat Maker AI
          </h1>
          <p className="text-muted-foreground text-sm">
            Créez des beats {style} professionnels
          </p>
        </div>

        {view !== 'input' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setView('input')}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Nouveau Beat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView('export')}>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Template Badge */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-0 mb-6">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Music className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{BeatMakerAITemplate.name}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(BeatMakerAITemplate.tags || ['AI', 'Music', 'DAW']).slice(0, 3).map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'input' && renderInputView()}
        {view === 'studio' && renderStudioView()}
        {view === 'export' && renderExportView()}
      </AnimatePresence>
    </div>
  );
};

export default BeatMakerStudio;
