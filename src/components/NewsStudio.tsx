/**
 * NewsStudio - Interface de création de journal TV automatisé
 * Newsroom professionnelle pour Village Chronicle
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Newspaper, 
  Mic, 
  Video,
  Camera,
  Upload,
  Star,
  Clock,
  MapPin,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  Download,
  Share2,
  Youtube,
  Facebook,
  MessageCircle,
  Trash2,
  Plus,
  ChevronRight,
  Sun,
  Cloud,
  CloudRain,
  User,
  Volume2,
  Settings,
  Eye,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useVideoPublish } from '@/hooks/useVideoPublish';
import { 
  VillageChronicleEngine, 
  createVillageChronicleEngine,
  NewsItem,
  VillageInfo,
  VillageChronicleInputs
} from '@/templates/VillageChronicle';

// ============================================
// TYPES
// ============================================

type NewsType = 'breaking' | 'main' | 'announcement' | 'weather';

interface NewsFormData {
  type: NewsType;
  title: string;
  description: string;
  location: string;
  priority: number;
}

interface StudioState {
  step: 'setup' | 'news' | 'anchor' | 'schedule' | 'preview' | 'rendering' | 'complete';
  village: VillageInfo;
  newsItems: NewsItem[];
  anchorVoice?: File;
  anchorPhoto?: File;
  anchorPhotoUrl?: string;  // Backend URL for anchor photo
  broadcastTime: string;
  language: 'bariba' | 'french' | 'bilingual';
  autoBroadcast: boolean;
  platforms: ('youtube' | 'facebook' | 'whatsapp')[];
}

// ============================================
// NEWS SUBMISSION FORM
// ============================================

interface NewsFormProps {
  onSubmit: (news: NewsItem) => void;
  onCancel: () => void;
}

const NewsSubmissionForm: React.FC<NewsFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<NewsFormData>({
    type: 'main',
    title: '',
    description: '',
    location: '',
    priority: 3
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!formData.title || !formData.description) return;

    const newsItem: NewsItem = {
      id: crypto.randomUUID(),
      type: formData.type,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      priority: formData.priority,
      media: mediaFiles,
      timestamp: new Date()
    };

    onSubmit(newsItem);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setMediaFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const newsTypeIcons = {
    breaking: '🚨',
    main: '📰',
    announcement: '📢',
    weather: '🌤️'
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Nouvelle Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {/* Type de news - responsive grid */}
        <div className="space-y-2">
          <Label className="text-sm">Type d'information</Label>
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {(['breaking', 'main', 'announcement', 'weather'] as NewsType[]).map(type => (
              <Button
                key={type}
                variant={formData.type === type ? 'default' : 'outline'}
                className="flex flex-col h-auto py-2 sm:py-3 px-1 sm:px-2"
                onClick={() => setFormData(prev => ({ ...prev, type }))}
              >
                <span className="text-lg sm:text-xl mb-0.5 sm:mb-1">{newsTypeIcons[type]}</span>
                <span className="text-[10px] sm:text-xs capitalize">
                  {type === 'breaking' ? 'Urgent' : 
                   type === 'main' ? 'Principal' :
                   type === 'announcement' ? 'Annonce' : 'Météo'}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-2">
          <Label htmlFor="news-title">Titre</Label>
          <Input
            id="news-title"
            placeholder="Titre de l'information..."
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="news-description">Description</Label>
          <Textarea
            id="news-description"
            placeholder="Décrivez l'information en détail..."
            rows={4}
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {/* Localisation */}
        <div className="space-y-2">
          <Label htmlFor="news-location">Lieu (optionnel)</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="news-location"
              className="pl-10"
              placeholder="Quartier, village..."
              value={formData.location}
              onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
        </div>

        {/* Priorité */}
        <div className="space-y-3">
          <Label>Priorité</Label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setFormData(prev => ({ ...prev, priority: star }))}
                className="focus:outline-none"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    star <= formData.priority 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">
              {formData.priority === 5 ? 'Très urgent' : 
               formData.priority === 4 ? 'Important' :
               formData.priority === 3 ? 'Normal' :
               formData.priority === 2 ? 'Secondaire' : 'Optionnel'}
            </span>
          </div>
        </div>

        {/* Médias */}
        <div className="space-y-2">
          <Label>Photos/Vidéos (B-roll)</Label>
          <div className="border-2 border-dashed rounded-lg p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            
            {mediaFiles.length > 0 ? (
              <div className="grid grid-cols-5 gap-2 mb-3">
                {mediaFiles.map((file, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= 5}
            >
              <Upload className="w-4 h-4 mr-2" />
              {mediaFiles.length > 0 ? 'Ajouter plus' : 'Ajouter des médias'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Maximum 5 fichiers (photos ou vidéos)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Annuler
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSubmit}
            disabled={!formData.title || !formData.description}
          >
            <Send className="w-4 h-4 mr-2" />
            Soumettre
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// NEWS LIST ITEM
// ============================================

interface NewsListItemProps {
  news: NewsItem;
  onDelete: (id: string) => void;
  onEdit: (news: NewsItem) => void;
}

const NewsListItem: React.FC<NewsListItemProps> = ({ news, onDelete, onEdit }) => {
  const typeColors = {
    breaking: 'bg-red-500/20 text-red-500 border-red-500/30',
    main: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    announcement: 'bg-green-500/20 text-green-500 border-green-500/30',
    weather: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
  };

  const typeLabels = {
    breaking: 'URGENT',
    main: 'Principal',
    announcement: 'Annonce',
    weather: 'Météo'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-card border rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className="flex flex-col items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${
                i < news.priority ? 'fill-yellow-400 text-yellow-400' : 'text-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${typeColors[news.type]} text-xs`}>
              {typeLabels[news.type]}
            </Badge>
            {news.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {news.location}
              </span>
            )}
          </div>
          
          <h4 className="font-semibold truncate">{news.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {news.description}
          </p>

          {news.media.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Camera className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {news.media.length} média{news.media.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onEdit(news)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive"
            onClick={() => onDelete(news.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// ANCHOR CUSTOMIZATION
// ============================================

interface AnchorCustomizationProps {
  anchorPhoto?: File;
  anchorVoice?: File;
  onPhotoChange: (file: File | undefined) => void;
  onVoiceChange: (file: File | undefined) => void;
}

const AnchorCustomization: React.FC<AnchorCustomizationProps> = ({
  anchorPhoto,
  anchorVoice,
  onPhotoChange,
  onVoiceChange
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onPhotoChange(file);
  };

  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onVoiceChange(file);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'anchor_voice.webm', { type: 'audio/webm' });
        onVoiceChange(file);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const stopVoiceRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Photo du présentateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Visage du Présentateur
          </CardTitle>
          <CardDescription>
            Personnalisez l'apparence avec votre photo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {anchorPhoto ? (
            <div className="relative aspect-square max-w-48 mx-auto rounded-full overflow-hidden border-4 border-primary">
              <img 
                src={URL.createObjectURL(anchorPhoto)} 
                alt="Anchor" 
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => onPhotoChange(undefined)}
                className="absolute bottom-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-32"
              onClick={() => photoInputRef.current?.click()}
            >
              <div className="text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <span>Uploader une photo</span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Voix du présentateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Voix du Présentateur
          </CardTitle>
          <CardDescription>
            Clonez votre voix pour le présentateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={voiceInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleVoiceUpload}
          />

          {anchorVoice ? (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-full">
                  <Volume2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{anchorVoice.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(anchorVoice.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onVoiceChange(undefined)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                className="w-full"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              >
                <Mic className={`w-4 h-4 mr-2 ${isRecording ? 'animate-pulse' : ''}`} />
                {isRecording ? 'Arrêter l\'enregistrement' : 'Enregistrer ma voix'}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => voiceInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Uploader un fichier audio
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Enregistrez au moins 30 secondes pour un meilleur clonage
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const NewsStudio: React.FC = () => {
  const { toast } = useToast();
  const { publishVideo, isPublishing, publishProgress, publishStage } = useVideoPublish();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VillageChronicleEngine | null>(null);

  const [state, setState] = useState<StudioState>({
    step: 'setup',
    village: {
      name: '',
      location: { lat: 0, lng: 0 },
      weatherAPI: '',
      temperature: 28,
      weatherIcon: 'sunny'
    },
    newsItems: [],
    broadcastTime: '18:00',
    language: 'bilingual',
    autoBroadcast: false,
    platforms: []
  });

  // Helper function to calculate estimated duration based on news count
  const calculateEstimatedDuration = (newsCount: number): number => {
    const baseTime = 5; // intro/outro
    const perNewsTime = 12; // average per news item
    const weatherTime = 10;
    return Math.min(60, baseTime + (newsCount * perNewsTime) + weatherTime);
  };

  const [showNewsForm, setShowNewsForm] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('');
  const [finalVideo, setFinalVideo] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Track engine initialization state for UI feedback
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  // Keep latest engineReady value for async callbacks (timeout) without re-running init effect.
  const engineReadyRef = useRef(false);
  useEffect(() => {
    engineReadyRef.current = engineReady;
  }, [engineReady]);

  // Initialize engine ONLY when entering preview step (avoid re-running init on every state update).
  useEffect(() => {
    let timeoutId: number | undefined;
    let rafId: number | undefined;

    const initOrResumePreview = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use 720p for faster preview rendering on mobile
      canvas.width = 1280;
      canvas.height = 720;

      const fail = (error: unknown) => {
        console.error('[NewsStudio] ❌ Engine init/resume failed:', error);
        setEngineError(error instanceof Error ? error.message : "Erreur d'initialisation du moteur");
        setEngineReady(false);
        toast({
          variant: 'destructive',
          title: 'Erreur de rendu',
          description: "Impossible d'initialiser le studio. Essayez de rafraîchir la page."
        });
      };

      try {
        const testCtx = canvas.getContext('2d');
        if (!testCtx) throw new Error('Le navigateur ne supporte pas le rendu Canvas 2D');

        // If engine already exists (e.g., user left preview and came back), resume preview.
        if (engineRef.current) {
          engineRef.current.setVillageInfo(state.village, state.newsItems, state.anchorPhoto);
          engineRef.current.startPreview();
          setIsPlaying(true);
          setEngineReady(true);
          setEngineError(null);
          console.log('[NewsStudio] ▶️ Engine preview resumed');
          return;
        }

        console.log('[NewsStudio] 🎬 Initializing engine for preview step. Canvas:', canvas.width, 'x', canvas.height);
        engineRef.current = createVillageChronicleEngine(canvas);
        engineRef.current.setVillageInfo(state.village, state.newsItems, state.anchorPhoto);
        engineRef.current.startPreview();
        setIsPlaying(true);
        setEngineReady(true);
        setEngineError(null);
        console.log('[NewsStudio] ✅ Engine started successfully');
      } catch (e) {
        fail(e);
      }
    };

    if (state.step === 'preview') {
      // Safety timeout to avoid infinite “Chargement du studio…”
      timeoutId = window.setTimeout(() => {
        if (!engineReadyRef.current && !engineRef.current) {
          setEngineError(
            "Le moteur n'a pas pu être initialisé (délai dépassé). Rafraîchissez la page puis réessayez."
          );
        } else if (engineRef.current && !engineReadyRef.current) {
          console.log('[NewsStudio] Force-marking engine ready after timeout');
          setEngineReady(true);
          engineReadyRef.current = true;
        }
      }, 30000); // 30s timeout for slower devices

      // Attempt immediate init/resume first
      initOrResumePreview();

      // Secondary attempt via rAF for late layout readiness
      rafId = requestAnimationFrame(() => {
        if (!engineReadyRef.current) initOrResumePreview();
      });
      
      // Third attempt after short delay (for slow canvas initialization)
      const delayedId = setTimeout(() => {
        if (!engineReadyRef.current && canvasRef.current) {
          console.log('[NewsStudio] Delayed init attempt...');
          initOrResumePreview();
        }
      }, 500);
      
      return () => {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (rafId) cancelAnimationFrame(rafId);
        clearTimeout(delayedId);
      };
    } else {
      // Stop preview when leaving preview step
      if (engineRef.current) {
        engineRef.current.stopPreview();
        setIsPlaying(false);
      }
      setEngineReady(false);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
    // Intentionally only depend on step/toast: we don't want to restart init on data changes.
    // Data changes are pushed via the separate setVillageInfo effect below.
  }, [state.step, toast]);

  // Update engine with village data whenever it changes
  useEffect(() => {
    if (engineRef.current && state.village.name) {
      engineRef.current.setVillageInfo(
        state.village, 
        state.newsItems,
        state.anchorPhoto
      );
    }
  }, [state.village, state.newsItems, state.anchorPhoto]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  // === BACKEND UPLOAD FUNCTIONS ===
  const uploadMediaToStorage = async (file: File, newsId: string): Promise<string> => {
    const fileName = `news-assets/${newsId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    console.log('[NewsStudio] Uploading media:', fileName);
    
    const { data, error } = await supabase.storage
      .from('tamtam-media')
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('[NewsStudio] Media upload failed:', error);
      throw error;
    }
    
    const { data: urlData } = supabase.storage
      .from('tamtam-media')
      .getPublicUrl(fileName);
    
    console.log('[NewsStudio] Media uploaded:', urlData.publicUrl);
    return urlData.publicUrl;
  };

  const uploadAnchorPhoto = async (file: File): Promise<string> => {
    const fileName = `anchor-photos/${Date.now()}-anchor.${file.name.split('.').pop()}`;
    console.log('[NewsStudio] Uploading anchor photo:', fileName);
    
    const { data, error } = await supabase.storage
      .from('tamtam-media')
      .upload(fileName, file, {
        contentType: file.type
      });
    
    if (error) {
      console.error('[NewsStudio] Anchor photo upload failed:', error);
      throw error;
    }
    
    const { data: urlData } = supabase.storage
      .from('tamtam-media')
      .getPublicUrl(fileName);
    
    console.log('[NewsStudio] Anchor photo uploaded:', urlData.publicUrl);
    return urlData.publicUrl;
  };

  const addNewsItem = async (news: NewsItem) => {
    // Upload media files to backend
    const uploadedMediaUrls: string[] = [];
    
    for (const file of news.media) {
      try {
        const url = await uploadMediaToStorage(file, news.id);
        uploadedMediaUrls.push(url);
      } catch (e) {
        console.error('[NewsStudio] Media upload failed for', file.name, e);
      }
    }
    
    // Add news with uploaded URLs stored in metadata
    const newsWithUrls = {
      ...news,
      // Store URLs for later use in rendering
      mediaUrls: uploadedMediaUrls
    };
    
    setState(prev => ({
      ...prev,
      newsItems: [...prev.newsItems, newsWithUrls as NewsItem]
    }));
    setShowNewsForm(false);
    
    toast({
      title: 'Information ajoutée',
      description: `"${news.title}" a été ajouté au journal.${uploadedMediaUrls.length > 0 ? ` (${uploadedMediaUrls.length} média(s) uploadé(s))` : ''}`
    });
  };

  const deleteNewsItem = (id: string) => {
    setState(prev => ({
      ...prev,
      newsItems: prev.newsItems.filter(n => n.id !== id)
    }));
  };

  const startRendering = async () => {
    // Validate engine is ready
    if (!engineRef.current) {
      console.error('[NewsStudio] ❌ Cannot render: engine not initialized');
      toast({
        variant: 'destructive',
        title: 'Moteur non prêt',
        description: 'Veuillez attendre le chargement de l\'aperçu avant de générer.'
      });
      return;
    }
    
    // Validate we have news items
    if (state.newsItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Aucune actualité',
        description: 'Ajoutez au moins une information avant de générer le journal.'
      });
      return;
    }

    console.log('[NewsStudio] 🎬 Starting render with', state.newsItems.length, 'news items');
    setState(prev => ({ ...prev, step: 'rendering' }));
    setRenderProgress(0);
    setRenderStage('Préparation du script...');

    try {
      const inputs: VillageChronicleInputs = {
        village: state.village,
        newsItems: state.newsItems,
        anchorVoice: state.anchorVoice,
        anchorPhoto: state.anchorPhoto,
        broadcastTime: state.broadcastTime,
        language: state.language,
        duration: 1 // OPTIMIZED: 1 minute max instead of 5
      };

      // Use QUICK PREVIEW mode by default for faster generation (WebM, 15fps)
      // This is 4-5x faster than HD mode while maintaining good quality
      const video = await engineRef.current.render(inputs, (progress, stage) => {
        console.log(`[NewsStudio] Render progress: ${progress}% - ${stage}`);
        setRenderProgress(Math.round(progress));
        setRenderStage(stage);
      }, true); // true = Quick preview mode (WebM, 15fps, no FFmpeg overhead)

      if (!video || video.size === 0) {
        throw new Error('La vidéo générée est vide');
      }

      setFinalVideo(video);
      setState(prev => ({ ...prev, step: 'complete' }));

      toast({
        title: '🎉 Journal créé !',
        description: `Votre journal télévisé de ${state.village.name} est prêt.`
      });
    } catch (error) {
      console.error('[NewsStudio] ❌ Render error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur de génération',
        description: error instanceof Error ? error.message : 'Impossible de créer le journal. Réessayez.'
      });
      setState(prev => ({ ...prev, step: 'preview' }));
    }
  };

  const downloadVideo = () => {
    if (!finalVideo) return;
    
    // Detect actual format from blob type
    const isMP4 = finalVideo.type.includes('mp4');
    const extension = isMP4 ? 'mp4' : 'webm';
    
    const url = URL.createObjectURL(finalVideo);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_${state.village.name}_${new Date().toISOString().split('T')[0]}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const publishToplatform = async (platform: 'youtube' | 'facebook' | 'whatsapp') => {
    if (!finalVideo || !engineRef.current) return;

    toast({
      title: 'Publication en cours...',
      description: `Envoi vers ${platform}...`
    });

    const results = await engineRef.current.publishToPlatforms(
      finalVideo,
      [platform],
      {
        title: `Journal de ${state.village.name} - ${new Date().toLocaleDateString('fr-FR')}`,
        description: `Les dernières actualités de ${state.village.name}`
      }
    );

    if (results[platform] !== 'error') {
      toast({
        title: 'Publié !',
        description: `Lien: ${results[platform]}`
      });
    }
  };

  // Publish to video feed (requires authentication)
  const publishToVideoFeed = async () => {
    if (!finalVideo) return;
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        variant: 'destructive',
        title: '🔐 Connexion requise',
        description: 'Connectez-vous pour publier votre journal dans le feed vidéo.'
      });
      return;
    }
    
    // Generate a thumbnail from the first frame of the canvas
    let thumbnail: Blob;
    try {
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        const res = await fetch(dataUrl);
        thumbnail = await res.blob();
      } else {
        // Create a simple placeholder thumbnail
        const placeholderCanvas = document.createElement('canvas');
        placeholderCanvas.width = 1280;
        placeholderCanvas.height = 720;
        const ctx = placeholderCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1e3a5f';
          ctx.fillRect(0, 0, 1280, 720);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 48px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`📺 ${state.village.name} TV`, 640, 360);
        }
        const dataUrl = placeholderCanvas.toDataURL('image/jpeg', 0.8);
        const res = await fetch(dataUrl);
        thumbnail = await res.blob();
      }
    } catch (e) {
      console.error('Thumbnail generation failed:', e);
      thumbnail = new Blob([], { type: 'image/jpeg' });
    }

    // Calculate real duration (30-60 seconds based on news items)
    const estimatedDuration = Math.min(60, 5 + (state.newsItems.length * 12) + 10); // opening + news + closing/weather

    const result = await publishVideo({
      video: finalVideo,
      thumbnail,
      title: `Journal de ${state.village.name} - ${new Date().toLocaleDateString('fr-FR')}`,
      description: `Les dernières actualités de ${state.village.name}. ${state.newsItems.length} informations présentées.`,
      templateId: 'village-chronicle',
      templateName: 'Village Chronicle',
      duration: estimatedDuration // Real duration instead of 300
    });

    if (result.success) {
      console.log('[NewsStudio] ✅ Video published successfully, ID:', result.videoId);
      toast({
        title: '🎉 Publié dans le feed!',
        description: `Votre journal est maintenant visible par tous. ID: ${result.videoId?.slice(0, 8) || 'OK'}`
      });
    } else {
      console.error('[NewsStudio] ❌ Video publish failed:', result.error);
    }
  };

  const goToStep = (step: StudioState['step']) => {
    setState(prev => ({ ...prev, step }));
  };

  const canProceed = () => {
    switch (state.step) {
      case 'setup':
        return !!state.village.name;
      case 'news':
        return state.newsItems.length > 0;
      case 'anchor':
        return true;
      case 'schedule':
        return true;
      default:
        return true;
    }
  };

  // ============================================
  // RENDER STEPS
  // ============================================

  const renderSetupStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Configuration du Village</CardTitle>
        <CardDescription>
          Configurez les informations de base de votre village
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="village-name">Nom du village</Label>
          <Input
            id="village-name"
            placeholder="Ex: Nikki, Parakou, Kandi..."
            value={state.village.name}
            onChange={e => setState(prev => ({
              ...prev,
              village: { ...prev.village, name: e.target.value }
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input
              type="number"
              placeholder="9.9333"
              value={state.village.location.lat || ''}
              onChange={e => setState(prev => ({
                ...prev,
                village: { 
                  ...prev.village, 
                  location: { ...prev.village.location, lat: parseFloat(e.target.value) || 0 }
                }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input
              type="number"
              placeholder="3.2000"
              value={state.village.location.lng || ''}
              onChange={e => setState(prev => ({
                ...prev,
                village: { 
                  ...prev.village, 
                  location: { ...prev.village.location, lng: parseFloat(e.target.value) || 0 }
                }
              }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Langue du journal</Label>
          <Select
            value={state.language}
            onValueChange={(v: 'bariba' | 'french' | 'bilingual') => 
              setState(prev => ({ ...prev, language: v }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="french">Français uniquement</SelectItem>
              <SelectItem value="bariba">Bariba uniquement</SelectItem>
              <SelectItem value="bilingual">Bilingue (FR + BA)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  const renderNewsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Informations du Journal</h3>
          <p className="text-sm text-muted-foreground">
            {state.newsItems.length} information{state.newsItems.length !== 1 ? 's' : ''} ajoutée{state.newsItems.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowNewsForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {showNewsForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NewsSubmissionForm
              onSubmit={addNewsItem}
              onCancel={() => setShowNewsForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3 pr-4">
          <AnimatePresence>
            {state.newsItems
              .sort((a, b) => b.priority - a.priority)
              .map(news => (
                <NewsListItem
                  key={news.id}
                  news={news}
                  onDelete={deleteNewsItem}
                  onEdit={() => {}}
                />
              ))}
          </AnimatePresence>

          {state.newsItems.length === 0 && !showNewsForm && (
            <div className="text-center py-12 text-muted-foreground">
              <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune information pour le moment</p>
              <p className="text-sm">Cliquez sur "Ajouter" pour soumettre une nouvelle</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderAnchorStep = () => (
    <AnchorCustomization
      anchorPhoto={state.anchorPhoto}
      anchorVoice={state.anchorVoice}
      onPhotoChange={async (file) => {
        if (file) {
          // Upload to backend
          try {
            const url = await uploadAnchorPhoto(file);
            setState(prev => ({ 
              ...prev, 
              anchorPhoto: file,
              anchorPhotoUrl: url 
            }));
            toast({
              title: 'Photo uploadée',
              description: 'La photo du présentateur a été enregistrée.'
            });
          } catch (e) {
            console.error('[NewsStudio] Anchor photo upload failed:', e);
            // Still set local file for preview
            setState(prev => ({ ...prev, anchorPhoto: file }));
          }
        } else {
          setState(prev => ({ ...prev, anchorPhoto: undefined, anchorPhotoUrl: undefined }));
        }
      }}
      onVoiceChange={file => setState(prev => ({ ...prev, anchorVoice: file }))}
    />
  );

  const renderScheduleStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Programmation
        </CardTitle>
        <CardDescription>
          Configurez la diffusion automatique de votre journal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Diffusion automatique</Label>
            <p className="text-sm text-muted-foreground">
              Le journal sera généré et publié automatiquement
            </p>
          </div>
          <Switch
            checked={state.autoBroadcast}
            onCheckedChange={v => setState(prev => ({ ...prev, autoBroadcast: v }))}
          />
        </div>

        {state.autoBroadcast && (
          <>
            <div className="space-y-2">
              <Label>Heure de diffusion</Label>
              <Input
                type="time"
                value={state.broadcastTime}
                onChange={e => setState(prev => ({ ...prev, broadcastTime: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Plateformes de publication</Label>
              <div className="flex gap-2">
                {(['youtube', 'facebook', 'whatsapp'] as const).map(platform => (
                  <Button
                    key={platform}
                    variant={state.platforms.includes(platform) ? 'default' : 'outline'}
                    onClick={() => setState(prev => ({
                      ...prev,
                      platforms: prev.platforms.includes(platform)
                        ? prev.platforms.filter(p => p !== platform)
                        : [...prev.platforms, platform]
                    }))}
                  >
                    {platform === 'youtube' && <Youtube className="w-4 h-4 mr-2" />}
                    {platform === 'facebook' && <Facebook className="w-4 h-4 mr-2" />}
                    {platform === 'whatsapp' && <MessageCircle className="w-4 h-4 mr-2" />}
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => (
    <div className="space-y-3 sm:space-y-4">
      <Card className="overflow-hidden">
        <div 
          className="relative w-full bg-gradient-to-br from-slate-900 to-slate-800"
          style={{ 
            aspectRatio: '16/9',
            minHeight: '180px',
            maxHeight: '50vh' // Limit on mobile for better UX
          }}
        >
          {/* Canvas with fully responsive sizing - fills container */}
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="absolute inset-0 w-full h-full"
            style={{ 
              objectFit: 'contain',
              backgroundColor: '#0f172a'
            }}
          />

          {/* Loading overlay when engine not ready */}
          {!engineReady && !engineError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center text-white">
                <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium">Chargement du studio...</p>
                <p className="text-sm text-white/70">Initialisation du moteur de rendu</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {engineError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
              <div className="text-center text-white p-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/30 flex items-center justify-center">
                  <Video className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium mb-2">Erreur de rendu</p>
                <p className="text-sm text-white/70 mb-4">{engineError}</p>
                <Button 
                  variant="outline" 
                  className="text-white border-white hover:bg-white/20"
                  onClick={() => {
                    // Force re-initialization
                    engineRef.current?.dispose();
                    engineRef.current = null;
                    setEngineError(null);
                    // Trigger re-init via step change
                    setState(prev => ({ ...prev, step: 'schedule' }));
                    setTimeout(() => setState(prev => ({ ...prev, step: 'preview' })), 100);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          )}

          {/* TV Frame overlay */}
          <div className="absolute inset-0 pointer-events-none border-8 border-slate-700 rounded-lg" />
          
          {/* News ticker */}
          <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white py-2 overflow-hidden">
            <motion.div
              className="whitespace-nowrap"
              animate={{ x: ['100%', '-100%'] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {state.newsItems.map((news, i) => (
                <span key={news.id} className="mx-8">
                  {news.type === 'breaking' && '🔴 URGENT: '}
                  {news.title}
                  {i < state.newsItems.length - 1 && ' • '}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Logo */}
          <div className="absolute top-4 left-4">
            <Badge className="bg-primary text-primary-foreground text-lg px-3 py-1">
              📺 {state.village.name || 'Village'} TV
            </Badge>
          </div>

          {/* Dynamic Weather widget */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 sm:p-3">
            <div className="flex items-center gap-1 sm:gap-2 text-white">
              {state.village.weatherIcon === 'cloudy' ? (
                <Cloud className="w-4 h-4 sm:w-6 sm:h-6 text-gray-300" />
              ) : state.village.weatherIcon === 'rainy' ? (
                <CloudRain className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" />
              )}
              <span className="text-sm sm:text-xl font-bold">{state.village.temperature || 28}°C</span>
            </div>
          </div>

          {/* Play/Pause overlay - only show when engine is ready */}
          {engineReady && (
            <button
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
              onClick={() => {
                if (isPlaying) {
                  engineRef.current?.stopPreview();
                } else {
                  engineRef.current?.startPreview();
                }
                setIsPlaying(!isPlaying);
              }}
            >
              <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full">
                {isPlaying ? (
                  <Pause className="w-12 h-12 text-white" />
                ) : (
                  <Play className="w-12 h-12 text-white" />
                )}
              </div>
            </button>
          )}
        </div>
      </Card>

      {/* TTS Test Button - compact on mobile */}
      <Card className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm sm:text-base truncate">Test narration</p>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Écoutez un aperçu de la voix</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (engineRef.current && state.newsItems.length > 0) {
                const previewText = `Bonsoir et bienvenue au Journal de ${state.village.name}. 
                  ${state.newsItems[0]?.title || 'Actualité locale'}.`;
                engineRef.current.startLiveTTS(previewText);
                toast({
                  title: '🎙️ Narration en cours',
                  description: 'Le présentateur parle...'
                });
              } else {
                toast({
                  variant: 'destructive',
                  title: 'Ajoutez des actualités',
                  description: 'Ajoutez au moins une information pour tester la narration'
                });
              }
            }}
          >
            <Mic className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Écouter</span>
          </Button>
        </div>
      </Card>

      {/* Summary - show estimated duration */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 text-center">
          <Newspaper className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-primary" />
          <p className="text-xl sm:text-2xl font-bold">{state.newsItems.length}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Infos</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-primary" />
          <p className="text-xl sm:text-2xl font-bold">~{calculateEstimatedDuration(state.newsItems.length)}s</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Durée</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center">
          <Eye className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-1 sm:mb-2 text-primary" />
          <p className="text-xl sm:text-2xl font-bold">{state.language === 'bilingual' ? '2' : '1'}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Langue{state.language === 'bilingual' ? 's' : ''}</p>
        </Card>
      </div>
    </div>
  );

  const renderRenderingStep = () => (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-16 h-16 mx-auto text-primary" />
          </motion.div>
          
          <div>
            <h3 className="text-xl font-semibold mb-2">Création du journal en cours...</h3>
            <p className="text-muted-foreground">{renderStage}</p>
          </div>

          <div className="max-w-md mx-auto">
            <Progress value={renderProgress} className="h-3" />
            <p className="text-sm text-muted-foreground mt-2">{renderProgress}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="aspect-video bg-black">
          {finalVideo && (
            <video
              src={URL.createObjectURL(finalVideo)}
              controls
              className="w-full h-full"
            />
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <Button 
          onClick={publishToVideoFeed} 
          className="w-full" 
          size="lg"
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              {publishStage} ({publishProgress}%)
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Publier dans le Feed Vidéo
            </>
          )}
        </Button>
        
        <div className="flex gap-3">
          <Button onClick={downloadVideo} className="flex-1" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          <Button variant="outline" onClick={() => publishToplatform('youtube')}>
            <Youtube className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => publishToplatform('facebook')}>
            <Facebook className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => publishToplatform('whatsapp')}>
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full"
        onClick={() => {
          setFinalVideo(null);
          setState(prev => ({ ...prev, step: 'setup', newsItems: [] }));
        }}
      >
        Créer un nouveau journal
      </Button>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  const steps = ['setup', 'news', 'anchor', 'schedule', 'preview'] as const;
  const stepLabels = {
    setup: 'Village',
    news: 'Actualités',
    anchor: 'Présentateur',
    schedule: 'Programme',
    preview: 'Aperçu'
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header - responsive */}
      <header className="bg-gradient-to-r from-red-600 to-red-800 text-white p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl">
              <Newspaper className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Village Chronicle</h1>
              <p className="text-white/80 text-xs sm:text-base">Journal TV Automatisé</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar - mobile optimized */}
      {state.step !== 'rendering' && state.step !== 'complete' && (
        <div className="bg-card border-b overflow-x-auto">
          <div className="max-w-4xl mx-auto py-3 sm:py-4 px-4 sm:px-6">
            <div className="flex items-center justify-between min-w-max gap-1 sm:gap-2">
              {steps.map((step, index) => (
                <React.Fragment key={step}>
                  <button
                    onClick={() => goToStep(step)}
                    className={`flex items-center gap-1 sm:gap-2 ${
                      state.step === step 
                        ? 'text-primary font-semibold' 
                        : steps.indexOf(state.step as typeof steps[number]) > index
                          ? 'text-primary/60'
                          : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm ${
                      state.step === step 
                        ? 'bg-primary text-primary-foreground' 
                        : steps.indexOf(state.step as typeof steps[number]) > index
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="hidden md:inline text-sm">{stepLabels[step]}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content - responsive padding */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {state.step === 'setup' && renderSetupStep()}
            {state.step === 'news' && renderNewsStep()}
            {state.step === 'anchor' && renderAnchorStep()}
            {state.step === 'schedule' && renderScheduleStep()}
            {state.step === 'preview' && renderPreviewStep()}
            {state.step === 'rendering' && renderRenderingStep()}
            {state.step === 'complete' && renderCompleteStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation - mobile optimized */}
        {state.step !== 'rendering' && state.step !== 'complete' && (
          <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6 pb-4">
            {state.step !== 'setup' && (
              <Button
                variant="outline"
                size="sm"
                className="sm:size-default"
                onClick={() => {
                  const currentIndex = steps.indexOf(state.step as typeof steps[number]);
                  if (currentIndex > 0) goToStep(steps[currentIndex - 1]);
                }}
              >
                Précédent
              </Button>
            )}
            
            <div className="flex-1" />
            
            {state.step === 'preview' ? (
              <Button 
                onClick={startRendering}
                disabled={!engineReady || state.newsItems.length === 0}
                size="default"
                className="text-sm sm:text-base"
                title={!engineReady ? 'Attendez le chargement du studio' : state.newsItems.length === 0 ? 'Ajoutez des actualités' : 'Générer le journal'}
              >
                {!engineReady ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Chargement...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1 sm:mr-2" />
                    Générer
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const currentIndex = steps.indexOf(state.step as typeof steps[number]);
                  if (currentIndex < steps.length - 1) goToStep(steps[currentIndex + 1]);
                }}
                disabled={!canProceed()}
                className="text-sm sm:text-base"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NewsStudio;
