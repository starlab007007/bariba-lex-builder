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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Type de news */}
        <div className="space-y-2">
          <Label>Type d'information</Label>
          <div className="grid grid-cols-4 gap-2">
            {(['breaking', 'main', 'announcement', 'weather'] as NewsType[]).map(type => (
              <Button
                key={type}
                variant={formData.type === type ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => setFormData(prev => ({ ...prev, type }))}
              >
                <span className="text-xl mb-1">{newsTypeIcons[type]}</span>
                <span className="text-xs capitalize">
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
      weatherAPI: ''
    },
    newsItems: [],
    broadcastTime: '18:00',
    language: 'bilingual',
    autoBroadcast: false,
    platforms: []
  });

  const [showNewsForm, setShowNewsForm] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('');
  const [finalVideo, setFinalVideo] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize engine
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      try {
        // Ensure canvas has proper internal dimensions
        canvasRef.current.width = 1920;
        canvasRef.current.height = 1080;
        
        engineRef.current = createVillageChronicleEngine(canvasRef.current);
        console.log('[NewsStudio] Engine initialized successfully');
      } catch (error) {
        console.error('[NewsStudio] Engine init failed:', error);
      }
    }

    return () => {
      engineRef.current?.dispose();
    };
  }, []);

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

  // Start/stop preview based on step
  useEffect(() => {
    if (engineRef.current) {
      if (state.step === 'preview' && !finalVideo) {
        engineRef.current.setVillageInfo(state.village, state.newsItems, state.anchorPhoto);
        engineRef.current.startPreview();
        setIsPlaying(true);
      } else {
        engineRef.current.stopPreview();
        setIsPlaying(false);
      }
    }
  }, [state.step, finalVideo]);

  const addNewsItem = (news: NewsItem) => {
    setState(prev => ({
      ...prev,
      newsItems: [...prev.newsItems, news]
    }));
    setShowNewsForm(false);
    toast({
      title: 'Information ajoutée',
      description: `"${news.title}" a été ajouté au journal.`
    });
  };

  const deleteNewsItem = (id: string) => {
    setState(prev => ({
      ...prev,
      newsItems: prev.newsItems.filter(n => n.id !== id)
    }));
  };

  const startRendering = async () => {
    if (!engineRef.current) return;

    setState(prev => ({ ...prev, step: 'rendering' }));

    try {
      const inputs: VillageChronicleInputs = {
        village: state.village,
        newsItems: state.newsItems,
        anchorVoice: state.anchorVoice,
        anchorPhoto: state.anchorPhoto,
        broadcastTime: state.broadcastTime,
        language: state.language,
        duration: 5
      };

      const video = await engineRef.current.render(inputs, (progress, stage) => {
        setRenderProgress(progress);
        setRenderStage(stage);
      });

      setFinalVideo(video);
      setState(prev => ({ ...prev, step: 'complete' }));

      toast({
        title: 'Journal créé !',
        description: 'Votre journal télévisé est prêt.'
      });
    } catch (error) {
      console.error('Render error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de créer le journal.'
      });
      setState(prev => ({ ...prev, step: 'preview' }));
    }
  };

  const downloadVideo = () => {
    if (!finalVideo) return;
    
    const url = URL.createObjectURL(finalVideo);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_${state.village.name}_${new Date().toISOString().split('T')[0]}.webm`;
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

  // Publish to video feed
  const publishToVideoFeed = async () => {
    if (!finalVideo) return;
    
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
        placeholderCanvas.width = 1920;
        placeholderCanvas.height = 1080;
        const ctx = placeholderCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1e3a5f';
          ctx.fillRect(0, 0, 1920, 1080);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 72px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`📺 ${state.village.name} TV`, 960, 540);
        }
        const dataUrl = placeholderCanvas.toDataURL('image/jpeg', 0.8);
        const res = await fetch(dataUrl);
        thumbnail = await res.blob();
      }
    } catch (e) {
      console.error('Thumbnail generation failed:', e);
      thumbnail = new Blob([], { type: 'image/jpeg' });
    }

    const result = await publishVideo({
      video: finalVideo,
      thumbnail,
      title: `Journal de ${state.village.name} - ${new Date().toLocaleDateString('fr-FR')}`,
      description: `Les dernières actualités de ${state.village.name}. ${state.newsItems.length} informations présentées.`,
      templateId: 'village-chronicle',
      templateName: 'Village Chronicle',
      duration: 300 // 5 minutes
    });

    if (result.success) {
      toast({
        title: '🎉 Publié dans le feed!',
        description: 'Votre journal est maintenant visible par tous.'
      });
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
      onPhotoChange={file => setState(prev => ({ ...prev, anchorPhoto: file }))}
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
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 relative">
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="w-full h-full object-contain"
          />

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

          {/* Weather widget */}
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center gap-2 text-white">
              <Sun className="w-6 h-6 text-yellow-400" />
              <span className="text-xl font-bold">28°C</span>
            </div>
          </div>

          {/* Play/Pause overlay */}
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
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Newspaper className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{state.newsItems.length}</p>
          <p className="text-sm text-muted-foreground">Informations</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">~5</p>
          <p className="text-sm text-muted-foreground">Minutes</p>
        </Card>
        <Card className="p-4 text-center">
          <Eye className="w-8 h-8 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{state.language === 'bilingual' ? '2' : '1'}</p>
          <p className="text-sm text-muted-foreground">Langue{state.language === 'bilingual' ? 's' : ''}</p>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Newspaper className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Village Chronicle</h1>
              <p className="text-white/80">Studio de Journal TV Automatisé</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {state.step !== 'rendering' && state.step !== 'complete' && (
        <div className="bg-card border-b">
          <div className="max-w-4xl mx-auto py-4 px-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step}>
                  <button
                    onClick={() => goToStep(step)}
                    className={`flex items-center gap-2 ${
                      state.step === step 
                        ? 'text-primary font-semibold' 
                        : steps.indexOf(state.step as typeof steps[number]) > index
                          ? 'text-primary/60'
                          : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      state.step === step 
                        ? 'bg-primary text-primary-foreground' 
                        : steps.indexOf(state.step as typeof steps[number]) > index
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="hidden sm:inline">{stepLabels[step]}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
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

        {/* Navigation */}
        {state.step !== 'rendering' && state.step !== 'complete' && (
          <div className="flex gap-3 mt-6">
            {state.step !== 'setup' && (
              <Button
                variant="outline"
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
                disabled={!canProceed()}
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Générer le Journal
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const currentIndex = steps.indexOf(state.step as typeof steps[number]);
                  if (currentIndex < steps.length - 1) goToStep(steps[currentIndex + 1]);
                }}
                disabled={!canProceed()}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NewsStudio;
