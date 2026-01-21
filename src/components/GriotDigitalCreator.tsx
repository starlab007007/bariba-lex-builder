/**
 * GriotDigitalCreator - UI Component for Griot Digital template
 * Allows users to create interactive 3D animated stories
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Mic, 
  Image, 
  Sparkles, 
  Play, 
  Loader2,
  Languages,
  GitBranch,
  Volume2,
  Camera,
  X,
  Check,
  ChevronRight,
  Download,
  Share2,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { TemplateStepNavigator, TemplateStepLayout } from '@/components/tamtam/creator/TemplateStepNavigator';
import { 
  GriotDigitalTemplate, 
  GriotDigitalEngine, 
  GriotDigitalInputs,
  RenderResult
} from '@/templates/GriotDigital';

// ============================================================================
// TYPES
// ============================================================================

type CreatorStep = 'upload' | 'configure' | 'preview' | 'rendering' | 'complete';

interface CreatorState {
  step: CreatorStep;
  audioFile: File | null;
  photos: File[];
  language: 'bariba' | 'french' | 'auto';
  interactiveMode: boolean;
  style: 'traditional' | 'modern' | 'fantasy' | 'historical';
  customTitle: string;
  includeSubtitles: boolean;
  subtitleLanguage: 'bariba' | 'french' | 'both';
  renderProgress: number;
  renderStage: string;
  result: RenderResult | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GriotDigitalCreator: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GriotDigitalEngine | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<CreatorState>({
    step: 'upload',
    audioFile: null,
    photos: [],
    language: 'auto',
    interactiveMode: false,
    style: 'traditional',
    customTitle: '',
    includeSubtitles: true,
    subtitleLanguage: 'both',
    renderProgress: 0,
    renderStage: '',
    result: null
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new GriotDigitalEngine();
    
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

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

  // Handle audio file upload
  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast({
          title: 'Format invalide',
          description: 'Veuillez sélectionner un fichier audio',
          variant: 'destructive'
        });
        return;
      }
      
      setState(prev => ({ ...prev, audioFile: file }));
      setPreviewUrl(URL.createObjectURL(file));
      
      toast({
        title: 'Audio ajouté',
        description: `${file.name} prêt pour le traitement`
      });
    }
  }, [toast]);

  // Handle photo upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length > 0) {
      setState(prev => ({ 
        ...prev, 
        photos: [...prev.photos, ...validFiles].slice(0, 5) // Max 5 photos
      }));
      
      toast({
        title: 'Photos ajoutées',
        description: `${validFiles.length} photo(s) pour le face mapping`
      });
    }
  }, [toast]);

  // Start audio recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recorded-story.webm', { type: 'audio/webm' });
        setState(prev => ({ ...prev, audioFile: file }));
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
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

  // Stop audio recording
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  // Remove photo
  const removePhoto = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  }, []);

  // Proceed to next step
  const nextStep = useCallback(() => {
    const steps: CreatorStep[] = ['upload', 'configure', 'preview', 'rendering', 'complete'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex < steps.length - 1) {
      setState(prev => ({ ...prev, step: steps[currentIndex + 1] }));
    }
  }, [state.step]);

  // Go to previous step
  const prevStep = useCallback(() => {
    const steps: CreatorStep[] = ['upload', 'configure', 'preview', 'rendering', 'complete'];
    const currentIndex = steps.indexOf(state.step);
    if (currentIndex > 0) {
      setState(prev => ({ ...prev, step: steps[currentIndex - 1] }));
    }
  }, [state.step]);

  // Start rendering
  const startRendering = useCallback(async () => {
    if (!state.audioFile || !engineRef.current || !canvasRef.current) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord ajouter un audio',
        variant: 'destructive'
      });
      return;
    }

    setState(prev => ({ ...prev, step: 'rendering', renderProgress: 0 }));

    try {
      // Initialize engine
      await engineRef.current.initialize(canvasRef.current);
      
      // Load assets
      await engineRef.current.loadAssets((progress, asset) => {
        setState(prev => ({
          ...prev,
          renderProgress: progress * 0.3,
          renderStage: `Chargement: ${asset}`
        }));
      });

      // Prepare inputs
      const inputs: GriotDigitalInputs = {
        audioNarration: state.audioFile,
        language: state.language,
        photos: state.photos.length > 0 ? state.photos : undefined,
        interactiveMode: state.interactiveMode,
        style: state.style,
        customTitle: state.customTitle || undefined,
        includeSubtitles: state.includeSubtitles,
        subtitleLanguage: state.subtitleLanguage
      };

      // Render
      const result = await engineRef.current.render(inputs, (progress, stage) => {
        setState(prev => ({
          ...prev,
          renderProgress: 30 + progress * 70,
          renderStage: stage
        }));
      });

      setState(prev => ({
        ...prev,
        step: 'complete',
        result,
        renderProgress: 100
      }));

      toast({
        title: 'Rendu terminé!',
        description: 'Votre conte 3D est prêt'
      });

    } catch (error) {
      console.error('Rendering failed:', error);
      toast({
        title: 'Erreur de rendu',
        description: 'Le rendu a échoué. Veuillez réessayer.',
        variant: 'destructive'
      });
      setState(prev => ({ ...prev, step: 'preview' }));
    }
  }, [state, toast]);

  // Download result
  const downloadResult = useCallback(() => {
    if (!state.result) return;
    
    const url = URL.createObjectURL(state.result.video);
    const a = document.createElement('a');
    a.href = url;
    a.download = `griot-digital-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.result]);

  // Share result
  const shareResult = useCallback(async () => {
    if (!state.result) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: state.result.metadata.title,
          text: 'Découvrez mon conte 3D créé avec Griot Digital!',
          files: [new File([state.result.video], 'griot-story.webm', { type: 'video/webm' })]
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      toast({
        title: 'Partage non disponible',
        description: 'Utilisez le téléchargement pour partager votre création'
      });
    }
  }, [state.result, toast]);

  // Reset creator
  const resetCreator = useCallback(() => {
    setState({
      step: 'upload',
      audioFile: null,
      photos: [],
      language: 'auto',
      interactiveMode: false,
      style: 'traditional',
      customTitle: '',
      includeSubtitles: true,
      subtitleLanguage: 'both',
      renderProgress: 0,
      renderStage: '',
      result: null
    });
    setPreviewUrl(null);
  }, []);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderUploadStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Audio Upload Section */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
            <Volume2 className="h-5 w-5 text-primary" />
            Narration Audio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!state.audioFile ? (
            <>
              {/* Record option */}
              <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-background/50">
                {isRecording ? (
                  <div className="text-center space-y-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-red-500/20 animate-pulse flex items-center justify-center">
                        <Mic className="h-10 w-10 text-red-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-mono text-red-500">
                      {formatTime(recordingTime)}
                    </p>
                    <Button 
                      onClick={stopRecording}
                      variant="destructive"
                      size="lg"
                    >
                      Arrêter l'enregistrement
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <Button
                      onClick={startRecording}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                    >
                      <Mic className="h-5 w-5" />
                      Enregistrer votre conte
                    </Button>
                    
                    <p className="text-sm text-muted-foreground">ou</p>
                    
                    <Button
                      onClick={() => audioInputRef.current?.click()}
                      variant="secondary"
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Importer un fichier audio
                    </Button>
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Volume2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{state.audioFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(state.audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <audio src={previewUrl} controls className="h-8" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setState(prev => ({ ...prev, audioFile: null }));
                    setPreviewUrl(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos Upload Section (Optional) */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground flex-wrap">
            <Camera className="h-5 w-5 text-primary" />
            <span>Photos Face Mapping</span>
            <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {state.photos.map((photo, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                <img
                  src={URL.createObjectURL(photo)}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            
            {state.photos.length < 5 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors"
              >
                <Image className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ajouter</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Ajoutez jusqu'à 5 photos de visage pour personnaliser le griot
          </p>
        </CardContent>
      </Card>

    </motion.div>
  );

  const renderConfigureStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* Language Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
            <Languages className="h-5 w-5 text-primary" />
            Langue du conte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={state.language}
            onValueChange={(v) => setState(prev => ({ ...prev, language: v as 'bariba' | 'french' | 'auto' }))}
            className="grid grid-cols-3 gap-4"
          >
            {[
              { value: 'auto', label: 'Détection auto', icon: '🔍' },
              { value: 'french', label: 'Français', icon: '🇫🇷' },
              { value: 'bariba', label: 'Bariba', icon: '🇧🇯' }
            ].map((option) => (
              <Label
                key={option.value}
                htmlFor={option.value}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  state.language === option.value 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                <span className="text-2xl">{option.icon}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Style Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Style visuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={state.style}
            onValueChange={(v) => setState(prev => ({ ...prev, style: v as CreatorState['style'] }))}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { value: 'traditional', label: 'Traditionnel', desc: 'Village africain classique', emoji: '🏠' },
              { value: 'modern', label: 'Moderne', desc: 'Style contemporain', emoji: '🌆' },
              { value: 'fantasy', label: 'Fantaisie', desc: 'Effets magiques', emoji: '✨' },
              { value: 'historical', label: 'Historique', desc: 'Époque ancienne', emoji: '🏛️' }
            ].map((option) => (
              <Label
                key={option.value}
                htmlFor={`style-${option.value}`}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  state.style === option.value 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={option.value} id={`style-${option.value}`} className="sr-only" />
                <span className="text-2xl">{option.emoji}</span>
                <div>
                  <p className="font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.desc}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Interactive Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-foreground">
            <GitBranch className="h-5 w-5 text-primary" />
            Mode interactif
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Label htmlFor="interactive" className="text-sm sm:text-base text-foreground">Activer les choix</Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                L'IA créera des moments de décision
              </p>
            </div>
            <Switch
              id="interactive"
              checked={state.interactiveMode}
              onCheckedChange={(checked) => setState(prev => ({ ...prev, interactiveMode: checked }))}
            />
          </div>
          
          {state.interactiveMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 rounded-lg bg-primary/5 border border-primary/20"
            >
              <p className="text-sm text-muted-foreground">
                🎭 L'IA détectera 3-5 moments clés dans votre conte où les spectateurs 
                pourront choisir la direction de l'histoire. Jusqu'à 5 fins alternatives!
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Subtitles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg text-foreground">Options avancées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="subtitles" className="text-sm sm:text-base text-foreground">Sous-titres auto</Label>
            <Switch
              id="subtitles"
              checked={state.includeSubtitles}
              onCheckedChange={(checked) => setState(prev => ({ ...prev, includeSubtitles: checked }))}
            />
          </div>
          
          {state.includeSubtitles && (
            <RadioGroup
              value={state.subtitleLanguage}
              onValueChange={(v) => setState(prev => ({ ...prev, subtitleLanguage: v as CreatorState['subtitleLanguage'] }))}
              className="flex gap-4"
            >
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="french" />
                Français
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="bariba" />
                Bariba
              </Label>
              <Label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="both" />
                Les deux
              </Label>
            </RadioGroup>
          )}

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm sm:text-base text-foreground">Titre personnalisé</Label>
            <Input
              id="title"
              placeholder="Titre du conte (optionnel)"
              value={state.customTitle}
              onChange={(e) => setState(prev => ({ ...prev, customTitle: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderPreviewStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 sm:space-y-6"
    >
      {/* 3D Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-[9/16] max-h-[60vh] bg-black relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/50 space-y-2">
                <Play className="h-12 w-12 mx-auto" />
                <p>Aperçu 3D</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg text-foreground">Résumé de la configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Audio</span>
            <span className="font-medium text-foreground truncate max-w-[60%]">{state.audioFile?.name}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Langue</span>
            <span className="font-medium text-foreground">
              {state.language === 'auto' ? 'Auto' : state.language === 'french' ? 'FR' : 'BA'}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Style</span>
            <span className="font-medium text-foreground capitalize">{state.style}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Photos</span>
            <span className="font-medium text-foreground">{state.photos.length}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Interactif</span>
            <span className="font-medium text-foreground">{state.interactiveMode ? '✓' : '✗'}</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Sous-titres</span>
            <span className="font-medium text-foreground">
              {state.includeSubtitles ? state.subtitleLanguage : '✗'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Template Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
              🎭
            </div>
            <div>
              <h3 className="font-bold">{GriotDigitalTemplate.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {GriotDigitalTemplate.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {GriotDigitalTemplate.aiFeatures.slice(0, 4).map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </motion.div>
  );

  const renderRenderingStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
    >
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-primary"
          style={{
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent'
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-bold">Création en cours...</h2>
        <p className="text-muted-foreground">{state.renderStage}</p>
        
        <div className="space-y-2">
          <Progress value={state.renderProgress} className="h-3" />
          <p className="text-sm font-mono text-primary">
            {Math.round(state.renderProgress)}%
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          L'IA analyse votre conte et crée une expérience 3D unique
        </p>
      </div>

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" width={1080} height={1920} />
    </motion.div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Success Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 rounded-full bg-green-500/20 mx-auto flex items-center justify-center"
        >
          <Check className="h-10 w-10 text-green-500" />
        </motion.div>
        <h2 className="text-2xl font-bold">Conte créé avec succès!</h2>
        <p className="text-muted-foreground">
          Votre conte 3D "{state.result?.metadata.title}" est prêt
        </p>
      </div>

      {/* Video Preview */}
      {state.result && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="aspect-[9/16] max-h-[50vh] bg-black relative">
              <video
                src={URL.createObjectURL(state.result.video)}
                controls
                className="w-full h-full"
                poster={URL.createObjectURL(state.result.thumbnail)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {state.result && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Durée</span>
              <span>{Math.floor(state.result.duration / 60)}:{Math.floor(state.result.duration % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Segments</span>
              <span>{state.result.metadata.segments}</span>
            </div>
            {state.result.metadata.branchPoints && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Points de choix</span>
                <span>{state.result.metadata.branchPoints.length}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button onClick={downloadResult} className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger
        </Button>
        <Button onClick={shareResult} variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Partager
        </Button>
      </div>

      <Button onClick={resetCreator} variant="ghost" className="w-full gap-2">
        <RotateCcw className="h-4 w-4" />
        Créer un nouveau conte
      </Button>
    </motion.div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const steps: CreatorStep[] = ['upload', 'configure', 'preview', 'rendering', 'complete'];
  const currentStepIndex = steps.indexOf(state.step);
  const isNavigableStep = state.step !== 'rendering' && state.step !== 'complete';
  const stepLabels = ['Audio', 'Options', 'Aperçu'];

  const canGoNext = () => {
    if (state.step === 'upload') return !!state.audioFile;
    if (state.step === 'configure') return true;
    if (state.step === 'preview') return true;
    return false;
  };

  const handleNextAction = () => {
    if (state.step === 'preview') {
      startRendering();
    } else {
      nextStep();
    }
  };

  const header = (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevStep} disabled={currentStepIndex === 0 || !isNavigableStep}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-foreground">
            <span className="text-2xl">🎭</span>
            Griot Digital
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Contes 3D interactifs
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      {isNavigableStep && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {['upload', 'configure', 'preview'].map((step, index) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  state.step === step 
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' 
                    : ['upload', 'configure', 'preview'].indexOf(state.step) > index
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {['upload', 'configure', 'preview'].indexOf(state.step) > index ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {stepLabels[index]}
                </span>
              </div>
              {index < 2 && (
                <div className={`w-8 sm:w-12 h-1 rounded-full ${
                  ['upload', 'configure', 'preview'].indexOf(state.step) > index
                    ? 'bg-primary'
                    : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );

  const stepNavigator = isNavigableStep ? (
    <TemplateStepNavigator
      currentStep={currentStepIndex}
      totalSteps={3}
      stepLabels={stepLabels}
      onPrevious={prevStep}
      onNext={handleNextAction}
      canGoBack={currentStepIndex > 0}
      canGoNext={canGoNext()}
      previousLabel="Retour"
      nextLabel={state.step === 'preview' ? 'Générer' : 'Suivant'}
      showProgress={false}
      isLastStep={state.step === 'preview'}
      onComplete={startRendering}
    />
  ) : null;

  return (
    <TemplateStepLayout
      header={header}
      navigator={stepNavigator}
      className="bg-background"
    >
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Step Content */}
        <AnimatePresence mode="wait">
          {state.step === 'upload' && renderUploadStep()}
          {state.step === 'configure' && renderConfigureStep()}
          {state.step === 'preview' && renderPreviewStep()}
          {state.step === 'rendering' && renderRenderingStep()}
          {state.step === 'complete' && renderCompleteStep()}
        </AnimatePresence>
      </div>
    </TemplateStepLayout>
  );
};

export default GriotDigitalCreator;
