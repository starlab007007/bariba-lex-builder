import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Image, Video, Mic, BarChart3, Check, Smile, ImageOff, Volume2, 
  Loader2, Plus, BookOpen, Music, MessageSquareQuote, Landmark, 
  Leaf, Calendar, Lock, Users, Globe, Shield, ChevronLeft, 
  Sparkles, Heart, AlertTriangle
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { AudioServicesStatusBar } from '@/components/tamtam/AudioServiceStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useVoiceMenu, VoiceMenuLabels } from '@/hooks/useVoiceMenu';
import { SpeakerButton } from '@/components/tamtam/VoiceMenuItem';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface TamTamCreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: PostSubmitData) => Promise<void>;
  onOpenPoll?: () => void;
}

interface PostSubmitData {
  audio_url: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  transcript_fr?: string;
  transcript_ba?: string;
  feeling_emoji?: string;
  duration_seconds?: number;
  // Nouveaux champs Patrimoine
  heritage_type?: HeritageType;
  visibility?: VisibilityLevel;
  sensitivity?: SensitivityLevel;
  consent?: boolean;
  attribution?: string;
  village?: string;
  age_rating?: 'kids' | 'all';
  language?: string;
}

// Types de contenu Patrimoine
type HeritageType = 
  | 'heritage_story'      // Conte du jour
  | 'heritage_music'      // Musique/Chant traditionnel
  | 'heritage_proverb'    // Proverbe + explication
  | 'heritage_history'    // Histoire du village
  | 'heritage_knowledge'  // Savoirs & techniques
  | 'heritage_event';     // Événement & festival

// Niveaux de visibilité
type VisibilityLevel = 'public' | 'community' | 'vault';

// Niveaux de sensibilité
type SensitivityLevel = 'normal' | 'sensitive';

// Types de médias classiques
type MediaType = 'audio' | 'photo' | 'video' | 'poll' | 'heritage';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const PHOTO_FORMATS = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/bmp,image/svg+xml";
const VIDEO_FORMATS = "video/mp4,video/quicktime,video/x-m4v,video/webm,video/x-msvideo,video/3gpp,video/mpeg,video/ogg";
const MAX_PHOTOS = 3;

// Types de médias principaux (incluant Patrimoine)
const mediaTypes: { 
  type: MediaType; 
  icon: typeof Mic; 
  label: string; 
  labelKey: keyof VoiceMenuLabels; 
  bgColor: string; 
  textColor: string;
  gradient?: string;
}[] = [
  { 
    type: 'audio', 
    icon: Mic, 
    label: 'audio', 
    labelKey: 'audio', 
    bgColor: 'bg-blue-500', 
    textColor: 'text-white',
    gradient: 'from-blue-500 to-blue-600'
  },
  { 
    type: 'photo', 
    icon: Image, 
    label: 'photo', 
    labelKey: 'photo', 
    bgColor: 'bg-emerald-500', 
    textColor: 'text-white',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  { 
    type: 'video', 
    icon: Video, 
    label: 'video', 
    labelKey: 'video', 
    bgColor: 'bg-violet-500', 
    textColor: 'text-white',
    gradient: 'from-violet-500 to-violet-600'
  },
  { 
    type: 'poll', 
    icon: BarChart3, 
    label: 'poll', 
    labelKey: 'poll', 
    bgColor: 'bg-orange-500', 
    textColor: 'text-white',
    gradient: 'from-orange-500 to-orange-600'
  },
  { 
    type: 'heritage', 
    icon: Landmark, 
    label: 'Patrimoine', 
    labelKey: 'heritage' as keyof VoiceMenuLabels, 
    bgColor: 'bg-amber-500', 
    textColor: 'text-white',
    gradient: 'from-amber-500 to-yellow-600'
  },
];

// Types de contenu Patrimoine avec leurs caractéristiques
const heritageTypes: {
  type: HeritageType;
  icon: typeof BookOpen;
  label: string;
  labelFr: string;
  labelBa: string;
  description: string;
  color: string;
  gradient: string;
  prompts: string[]; // Questions guidées pour l'enregistrement
}[] = [
  {
    type: 'heritage_story',
    icon: BookOpen,
    label: 'Conte',
    labelFr: 'Conte du jour',
    labelBa: 'Sìírà',
    description: 'Racontez une histoire traditionnelle',
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-purple-700',
    prompts: [
      "De quel village vient ce conte ?",
      "C'est pour les enfants ou tout public ?",
      "Qui vous l'a raconté ?"
    ]
  },
  {
    type: 'heritage_music',
    icon: Music,
    label: 'Musique',
    labelFr: 'Chant traditionnel',
    labelBa: 'Dùùrú',
    description: 'Partagez un chant ou une musique',
    color: 'bg-pink-500',
    gradient: 'from-pink-500 to-rose-600',
    prompts: [
      "Quel est le nom de ce chant ?",
      "Pour quelle occasion ?",
      "Qui vous l'a appris ?"
    ]
  },
  {
    type: 'heritage_proverb',
    icon: MessageSquareQuote,
    label: 'Proverbe',
    labelFr: 'Proverbe & sagesse',
    labelBa: 'Sɔ̀ɔ̀rɔ̀',
    description: 'Partagez un proverbe avec son explication',
    color: 'bg-teal-500',
    gradient: 'from-teal-500 to-cyan-600',
    prompts: [
      "Dites le proverbe",
      "Quelle est sa signification ?",
      "Quand l'utilise-t-on ?"
    ]
  },
  {
    type: 'heritage_history',
    icon: Landmark,
    label: 'Histoire',
    labelFr: 'Histoire du village',
    labelBa: 'Kpààrà',
    description: 'Racontez l\'histoire de votre village',
    color: 'bg-amber-600',
    gradient: 'from-amber-600 to-orange-700',
    prompts: [
      "De quel village parlez-vous ?",
      "Qui a fondé ce village ?",
      "Quelle est l'origine du nom ?"
    ]
  },
  {
    type: 'heritage_knowledge',
    icon: Leaf,
    label: 'Savoir',
    labelFr: 'Savoirs & techniques',
    labelBa: 'Dɔ̀nnìyá',
    description: 'Partagez une connaissance traditionnelle',
    color: 'bg-green-600',
    gradient: 'from-green-600 to-emerald-700',
    prompts: [
      "Quel type de savoir ?",
      "Comment l'avez-vous appris ?",
      "Est-ce un secret à protéger ?"
    ]
  },
  {
    type: 'heritage_event',
    icon: Calendar,
    label: 'Événement',
    labelFr: 'Événement & festival',
    labelBa: 'Tìɛ̀rɛ̀',
    description: 'Annoncez un événement culturel',
    color: 'bg-red-500',
    gradient: 'from-red-500 to-rose-700',
    prompts: [
      "Quel est cet événement ?",
      "Où et quand ?",
      "Qui peut participer ?"
    ]
  },
];

// Options de visibilité
const visibilityOptions: {
  level: VisibilityLevel;
  icon: typeof Globe;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    level: 'public',
    icon: Globe,
    label: 'Public',
    description: 'Visible par tous',
    color: 'bg-green-500'
  },
  {
    level: 'community',
    icon: Users,
    label: 'Communauté',
    description: 'Mon village uniquement',
    color: 'bg-blue-500'
  },
  {
    level: 'vault',
    icon: Lock,
    label: 'Coffre',
    description: 'Privé / Héritage familial',
    color: 'bg-purple-500'
  },
];

const emojis = ['😊', '😂', '❤️', '🎉', '🤔', '😢', '🙏', '💪', '🔥', '✨'];

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export const TamTamCreatePost: React.FC<TamTamCreatePostProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenPoll
}) => {
  const { t, currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  const { 
    transcribeWithTranslation, 
    health, 
    isTranscribing, 
    liveTranscript, 
    interimTranscript 
  } = useUnifiedAudio();
  const { speakLabel, getLabel } = useVoiceMenu();
  
  // ─── États principaux ────────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<MediaType>('audio');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const [translatedTranscript, setTranslatedTranscript] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'type' | 'heritage-type' | 'heritage-settings' | 'record' | 'media' | 'preview'>('type');
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  const [capturedLiveTranscript, setCapturedLiveTranscript] = useState<string>('');
  
  // ─── États Patrimoine ────────────────────────────────────────────────────
  const [selectedHeritageType, setSelectedHeritageType] = useState<HeritageType | null>(null);
  const [visibility, setVisibility] = useState<VisibilityLevel>('public');
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('normal');
  const [consent, setConsent] = useState<boolean>(false);
  const [attribution, setAttribution] = useState<string>('');
  const [village, setVillage] = useState<string>('');
  const [ageRating, setAgeRating] = useState<'kids' | 'all'>('all');
  const [currentPromptIndex, setCurrentPromptIndex] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Effets ──────────────────────────────────────────────────────────────
  
  // Capture liveTranscript pendant l'enregistrement (pour le français)
  useEffect(() => {
    if (liveTranscript && currentLang === 'fr') {
      setCapturedLiveTranscript(liveTranscript);
    }
  }, [liveTranscript, currentLang]);

  // ─── Gestionnaires d'événements ──────────────────────────────────────────

  const handleTypeSelect = (type: MediaType) => {
    setSelectedType(type);
    triggerFeedback('notification');
    
    if (type === 'poll') {
      onClose();
      onOpenPoll?.();
      return;
    }
    
    if (type === 'heritage') {
      // Aller à la sélection du type de patrimoine
      setStep('heritage-type');
      return;
    }
    
    if (type === 'photo' || type === 'video') {
      fileInputRef.current?.click();
    } else {
      setStep('record');
    }
  };

  const handleHeritageTypeSelect = (heritageType: HeritageType) => {
    setSelectedHeritageType(heritageType);
    triggerFeedback('notification');
    
    // Lire le prompt audio pour guider l'utilisateur
    const heritage = heritageTypes.find(h => h.type === heritageType);
    if (heritage) {
      speakLabel(heritage.labelFr as keyof VoiceMenuLabels);
    }
    
    // Aller aux paramètres de visibilité/consentement
    setStep('heritage-settings');
  };

  const handleHeritageSettingsComplete = () => {
    if (!consent) {
      toast({
        title: "⚠️ Consentement requis",
        description: "Veuillez confirmer que vous avez le droit de partager ce contenu",
        variant: "destructive"
      });
      return;
    }
    
    triggerFeedback('success');
    setStep('record');
  };

  // Gestion de la sélection de médias (photos/vidéos)
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedType === 'photo') {
      const newFiles = [...mediaFiles, ...files].slice(0, MAX_PHOTOS);
      setMediaFiles(newFiles);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      mediaPreviews.forEach(url => URL.revokeObjectURL(url));
      setMediaPreviews(newPreviews);
      
      if (newFiles.length >= MAX_PHOTOS) {
        toast({ title: `📷 Maximum ${MAX_PHOTOS} photos`, description: "Limite de photos atteinte" });
      }
    } else {
      const file = files[0];
      setMediaFiles([file]);
      const url = URL.createObjectURL(file);
      mediaPreviews.forEach(url => URL.revokeObjectURL(url));
      setMediaPreviews([url]);
    }
    
    setStep('record');
  };

  const removePhoto = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    
    URL.revokeObjectURL(mediaPreviews[index]);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaPreviews(newPreviews);
    
    triggerFeedback('notification');
  };

  const addMorePhotos = () => {
    if (mediaFiles.length < MAX_PHOTOS) {
      fileInputRef.current?.click();
    }
  };

  const handleRecordingComplete = async (base64: string, duration?: number, recorderLiveTranscript?: string) => {
    console.log('[TamTamCreatePost] Recording complete');
    
    setAudioBase64(base64);
    setAudioDuration(duration || 0);
    setTranscriptionFailed(false);
    triggerFeedback('success');
    
    toast({ title: "🎤 Traitement audio...", description: "Transcription en cours" });
    
    const allTranscripts = [
      recorderLiveTranscript,
      capturedLiveTranscript,
      liveTranscript,
      interimTranscript
    ].filter(t => t && t.trim().length > 0);
    
    const bestLiveTranscript = allTranscripts.length > 0 
      ? allTranscripts.reduce((a, b) => (a && a.length > (b?.length || 0) ? a : b)) 
      : '';
    
    const sourceLang = currentLang === 'ba' ? 'ba' : 'fr';
    
    if (sourceLang === 'fr' && bestLiveTranscript && bestLiveTranscript.length > 0) {
      setTranscript(bestLiveTranscript);
      setTranscriptionFailed(false);
      
      try {
        const translateResult = await transcribeWithTranslation(base64, 'fr');
        if (translateResult.transcription_ba && translateResult.transcription_ba.length > 0) {
          setTranslatedTranscript(translateResult.transcription_ba);
        }
      } catch (e) {
        console.warn('[TamTamCreatePost] Translation to Bariba failed:', e);
      }
      
      toast({
        title: "✅ Transcription réussie",
        description: `"${bestLiveTranscript.substring(0, 30)}${bestLiveTranscript.length > 30 ? '...' : ''}"`
      });
      setStep('preview');
      return;
    }
    
    const result = await transcribeWithTranslation(base64, sourceLang);
    
    if (result.transcription && result.transcription.length > 0) {
      setTranscript(result.transcription);
      if (sourceLang === 'fr') {
        setTranslatedTranscript(result.transcription_ba);
      } else {
        setTranslatedTranscript(result.transcription_fr);
      }
      toast({
        title: "✅ Transcription réussie",
        description: result.translation_method !== 'none' 
          ? `Audio transcrit et traduit (${result.translation_method})` 
          : "Votre audio a été transcrit"
      });
    } else if (bestLiveTranscript && bestLiveTranscript.length > 0) {
      setTranscript(bestLiveTranscript);
      setTranscriptionFailed(false);
      toast({
        title: "✅ Transcription (Web Speech)",
        description: "Audio transcrit via le navigateur"
      });
    } else {
      setTranscriptionFailed(true);
      setTranscript('');
      toast({
        title: "⚠️ Sans transcription",
        description: "Publication audio sans texte"
      });
    }
    
    setStep('preview');
  };

  const handleSkipAudio = () => {
    if (mediaFiles.length === 0 && selectedType !== 'heritage') {
      toast({ title: "Média requis", description: "Sélectionnez d'abord un média", variant: "destructive" });
      return;
    }
    triggerFeedback('notification');
    setStep('preview');
  };

  const handleSubmit = async () => {
    console.log('[TamTamCreatePost.handleSubmit] Starting submission...');
    
    if (!audioBase64 && selectedType === 'audio') {
      toast({ title: "Audio requis", description: "Veuillez enregistrer un audio", variant: "destructive" });
      return;
    }

    if (!audioBase64 && mediaFiles.length === 0 && selectedType !== 'heritage') {
      toast({ title: "Contenu requis", description: "Ajoutez un audio ou un média", variant: "destructive" });
      return;
    }

    // Vérification spécifique au patrimoine
    if (selectedType === 'heritage' && !audioBase64) {
      toast({ title: "Audio requis", description: "Le patrimoine oral nécessite un enregistrement audio", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      let audioUrl = '';
      let mediaUrl: string | undefined;
      const uploadedMediaUrls: string[] = [];

      // Upload audio
      if (audioBase64) {
        const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
        const audioFileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        
        const { data: audioData, error: audioError } = await supabase.storage
          .from('tamtam-audio')
          .upload(audioFileName, audioBlob, { contentType: 'audio/webm' });

        if (audioError) throw audioError;

        const { data: audioUrlData } = supabase.storage
          .from('tamtam-audio')
          .getPublicUrl(audioFileName);

        audioUrl = audioUrlData.publicUrl;
      }

      // Upload media files
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i];
        const mediaFileName = `media_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        
        const { error: mediaError } = await supabase.storage
          .from('tamtam-audio')
          .upload(mediaFileName, file);

        if (!mediaError) {
          const { data: url } = supabase.storage
            .from('tamtam-audio')
            .getPublicUrl(mediaFileName);
          uploadedMediaUrls.push(url.publicUrl);
        }
      }

      if (uploadedMediaUrls.length > 0) {
        mediaUrl = uploadedMediaUrls.join(',');
      }

      if (!audioUrl && mediaUrl) {
        audioUrl = uploadedMediaUrls[0];
      }

      // Construire les données du post
      const postData: PostSubmitData = {
        audio_url: audioUrl,
        media_type: selectedType === 'heritage' ? selectedHeritageType || 'heritage_story' : selectedType,
        media_url: mediaUrl,
        transcript_fr: currentLang === 'fr' ? transcript : translatedTranscript || undefined,
        transcript_ba: currentLang === 'ba' ? transcript : translatedTranscript || undefined,
        feeling_emoji: selectedEmoji || undefined,
        duration_seconds: audioDuration || 0,
        // Champs Patrimoine
        heritage_type: selectedType === 'heritage' ? selectedHeritageType || undefined : undefined,
        visibility: selectedType === 'heritage' ? visibility : undefined,
        sensitivity: selectedType === 'heritage' ? sensitivity : undefined,
        consent: selectedType === 'heritage' ? consent : undefined,
        attribution: selectedType === 'heritage' && attribution ? attribution : undefined,
        village: selectedType === 'heritage' && village ? village : undefined,
        age_rating: selectedType === 'heritage' ? ageRating : undefined,
        language: currentLang,
      };
      
      console.log('[TamTamCreatePost.handleSubmit] Post data:', postData);
      
      await onSubmit(postData);
      
      triggerFeedback('success');
      resetPostState();
      onClose();
      
    } catch (err: any) {
      console.error('[TamTamCreatePost.handleSubmit] Error:', err);
      triggerFeedback('error');
      toast({ 
        title: "Erreur de publication", 
        description: err.message || 'Une erreur est survenue', 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPostState = () => {
    setAudioBase64(null);
    setAudioDuration(0);
    mediaPreviews.forEach(url => URL.revokeObjectURL(url));
    setMediaFiles([]);
    setMediaPreviews([]);
    setTranscript('');
    setTranslatedTranscript('');
    setSelectedEmoji(null);
    setTranscriptionFailed(false);
    setCapturedLiveTranscript('');
    setStep('type');
    setSelectedType('audio');
    // Reset patrimoine
    setSelectedHeritageType(null);
    setVisibility('public');
    setSensitivity('normal');
    setConsent(false);
    setAttribution('');
    setVillage('');
    setAgeRating('all');
    setCurrentPromptIndex(0);
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const goBack = () => {
    triggerFeedback('notification');
    switch (step) {
      case 'heritage-type':
        setStep('type');
        break;
      case 'heritage-settings':
        setStep('heritage-type');
        break;
      case 'record':
        if (selectedType === 'heritage') {
          setStep('heritage-settings');
        } else {
          setStep('type');
        }
        break;
      case 'preview':
        setStep('record');
        break;
      default:
        setStep('type');
    }
  };

  if (!isOpen) return null;

  // ─── Rendu ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl min-h-[60vh] max-h-[90vh] flex flex-col"
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step !== 'type' && (
              <button
                onClick={goBack}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {step === 'heritage-type' ? 'Type de patrimoine' :
                   step === 'heritage-settings' ? 'Paramètres' :
                   t('newPost')}
                </h3>
                {isTranscribing && (
                  <div className="flex items-center gap-1 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Transcription...</span>
                  </div>
                )}
              </div>
              <AudioServicesStatusBar health={health} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            
            {/* ═══════════════════════════════════════════════════════════════
                STEP 1: SÉLECTION DU TYPE (Audio, Photo, Vidéo, Sondage, Patrimoine)
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-center text-gray-500 mb-6">{t('whatToShare')}</p>
                
                {/* Grille principale 2x2 */}
                <div className="grid grid-cols-2 gap-4">
                  {mediaTypes.slice(0, 4).map(({ type, icon: Icon, label, labelKey, bgColor, textColor, gradient }) => (
                    <div key={type} className="relative">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleTypeSelect(type)}
                        className={`w-full p-6 rounded-3xl flex flex-col items-center gap-3 shadow-md transition-all bg-gradient-to-br ${gradient || bgColor} ${textColor}`}
                      >
                        <Icon className="w-10 h-10" />
                        <span className="font-semibold">{t(label)}</span>
                      </motion.button>
                      <SpeakerButton 
                        labelKey={labelKey}
                        size="sm"
                        className="absolute top-2 right-2"
                      />
                    </div>
                  ))}
                </div>

                {/* Bouton Patrimoine - Mise en avant spéciale */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => handleTypeSelect('heritage')}
                    className="w-full p-5 rounded-3xl flex items-center gap-4 shadow-lg bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-white relative overflow-hidden"
                  >
                    {/* Motif décoratif */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                    </div>
                    
                    <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Landmark className="w-8 h-8" />
                    </div>
                    <div className="relative z-10 flex-1 text-left">
                      <span className="font-bold text-lg">Patrimoine & Culture</span>
                      <p className="text-sm text-white/80">Contes, musique, proverbes, histoire...</p>
                    </div>
                    <Sparkles className="relative z-10 w-6 h-6 animate-pulse" />
                  </motion.button>
                  <SpeakerButton 
                    labelKey={'heritage' as keyof VoiceMenuLabels}
                    size="md"
                    className="absolute top-3 right-3"
                  />
                </motion.div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={selectedType === 'photo' ? PHOTO_FORMATS : VIDEO_FORMATS}
                  capture={selectedType === 'photo' ? 'environment' : undefined}
                  multiple={selectedType === 'photo'}
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2A: SÉLECTION DU TYPE DE PATRIMOINE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'heritage-type' && (
              <motion.div
                key="heritage-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-center text-gray-500 mb-4">
                  Quel type de patrimoine souhaitez-vous partager ?
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {heritageTypes.map((heritage, index) => {
                    const Icon = heritage.icon;
                    return (
                      <motion.button
                        key={heritage.type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleHeritageTypeSelect(heritage.type)}
                        className={`p-4 rounded-2xl flex flex-col items-center gap-2 shadow-md bg-gradient-to-br ${heritage.gradient} text-white relative overflow-hidden`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="font-semibold text-sm">{heritage.label}</span>
                        <span className="text-xs text-white/70">{heritage.labelBa}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2B: PARAMÈTRES DE VISIBILITÉ ET CONSENTEMENT
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'heritage-settings' && selectedHeritageType && (
              <motion.div
                key="heritage-settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Badge du type sélectionné */}
                {(() => {
                  const heritage = heritageTypes.find(h => h.type === selectedHeritageType);
                  if (!heritage) return null;
                  const Icon = heritage.icon;
                  return (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${heritage.gradient} text-white text-sm font-medium`}>
                      <Icon className="w-4 h-4" />
                      {heritage.labelFr}
                    </div>
                  );
                })()}

                {/* Visibilité */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Qui peut voir ce contenu ?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {visibilityOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <motion.button
                          key={opt.level}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setVisibility(opt.level)}
                          className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                            visibility === opt.level 
                              ? `${opt.color} text-white shadow-lg` 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-medium">{opt.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Sensibilité */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Ce contenu est-il sensible ?
                  </label>
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSensitivity('normal')}
                      className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        sensitivity === 'normal' 
                          ? 'bg-green-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">Normal</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSensitivity('sensitive')}
                      className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        sensitivity === 'sensitive' 
                          ? 'bg-amber-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-medium">Sensible</span>
                    </motion.button>
                  </div>
                  {sensitivity === 'sensitive' && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Ce savoir sera protégé et son téléchargement désactivé
                    </p>
                  )}
                </div>

                {/* Public cible */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Public cible
                  </label>
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAgeRating('all')}
                      className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        ageRating === 'all' 
                          ? 'bg-blue-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      <span className="text-sm font-medium">Tout public</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAgeRating('kids')}
                      className={`flex-1 p-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        ageRating === 'kids' 
                          ? 'bg-pink-500 text-white shadow-lg' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Heart className="w-5 h-5" />
                      <span className="text-sm font-medium">Enfants</span>
                    </motion.button>
                  </div>
                </div>

                {/* Attribution (optionnel) */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Attribution (optionnel)
                  </label>
                  <input
                    type="text"
                    value={attribution}
                    onChange={(e) => setAttribution(e.target.value)}
                    placeholder="Qui vous a transmis ce savoir ?"
                    className="w-full p-3 rounded-xl bg-gray-100 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Village (optionnel) */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Village / Commune (optionnel)
                  </label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="D'où vient ce patrimoine ?"
                    className="w-full p-3 rounded-xl bg-gray-100 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Consentement */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConsent(!consent)}
                  className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                    consent 
                      ? 'bg-green-100 border-2 border-green-500' 
                      : 'bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    consent ? 'bg-green-500 text-white' : 'bg-gray-300'
                  }`}>
                    {consent && <Check className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm ${consent ? 'text-green-700' : 'text-gray-600'}`}>
                    Je confirme avoir le droit de partager ce contenu et j'accepte les conditions d'utilisation
                  </span>
                </motion.button>

                {/* Bouton continuer */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleHeritageSettingsComplete}
                  disabled={!consent}
                  className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    consent 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                  Continuer vers l'enregistrement
                </motion.button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 3: ENREGISTREMENT AUDIO
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'record' && (
              <motion.div
                key="record"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Affichage du type patrimoine sélectionné */}
                {selectedType === 'heritage' && selectedHeritageType && (
                  <div className="text-center">
                    {(() => {
                      const heritage = heritageTypes.find(h => h.type === selectedHeritageType);
                      if (!heritage) return null;
                      const Icon = heritage.icon;
                      return (
                        <>
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${heritage.gradient} text-white text-sm font-medium mb-3`}>
                            <Icon className="w-4 h-4" />
                            {heritage.labelFr}
                          </div>
                          <p className="text-gray-500 text-sm">
                            {heritage.prompts[currentPromptIndex] || heritage.description}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Preview médias */}
                {mediaPreviews.length > 0 && (
                  <div className="space-y-2">
                    <div className={`grid gap-2 ${mediaPreviews.length === 1 ? 'grid-cols-1' : mediaPreviews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {mediaPreviews.map((preview, index) => (
                        <div key={index} className="relative rounded-xl overflow-hidden bg-gray-100">
                          {selectedType === 'photo' ? (
                            <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover" />
                          ) : selectedType === 'video' ? (
                            <video src={preview} controls className="w-full h-24" />
                          ) : null}
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {selectedType === 'photo' && mediaFiles.length < MAX_PHOTOS && (
                      <button
                        onClick={addMorePhotos}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 flex items-center justify-center gap-2 hover:bg-gray-50"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une photo ({mediaFiles.length}/{MAX_PHOTOS})
                      </button>
                    )}
                  </div>
                )}

                <div className="text-center">
                  <p className="text-gray-500 mb-4">
                    {selectedType === 'heritage' 
                      ? "🎙️ Enregistrez votre témoignage oral"
                      : mediaFiles.length > 0 
                        ? "Ajoutez un message vocal (optionnel)" 
                        : t('recordAudio')}
                  </p>
                  <SmartVoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                    language={currentLang === 'ba' ? 'bariba' : 'french'}
                  />
                </div>

                {mediaFiles.length > 0 && selectedType !== 'heritage' && (
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSkipAudio}
                      className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium flex items-center justify-center gap-2"
                    >
                      <ImageOff className="w-5 h-5" />
                      {getLabel('skipAudio')}
                    </motion.button>
                    <SpeakerButton labelKey="skipAudio" size="md" />
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 4: PREVIEW & SUBMIT
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Badge patrimoine */}
                {selectedType === 'heritage' && selectedHeritageType && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const heritage = heritageTypes.find(h => h.type === selectedHeritageType);
                      if (!heritage) return null;
                      const Icon = heritage.icon;
                      return (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${heritage.gradient} text-white text-sm font-medium`}>
                          <Icon className="w-4 h-4" />
                          {heritage.labelFr}
                        </div>
                      );
                    })()}
                    <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                      visibility === 'public' ? 'bg-green-100 text-green-700' :
                      visibility === 'community' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {visibility === 'public' && <Globe className="w-3 h-3" />}
                      {visibility === 'community' && <Users className="w-3 h-3" />}
                      {visibility === 'vault' && <Lock className="w-3 h-3" />}
                      {visibilityOptions.find(v => v.level === visibility)?.label}
                    </div>
                    {sensitivity === 'sensitive' && (
                      <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        Protégé
                      </div>
                    )}
                  </div>
                )}

                {/* Media Preview */}
                {mediaPreviews.length > 0 && (
                  <div className={`grid gap-2 ${mediaPreviews.length === 1 ? 'grid-cols-1' : mediaPreviews.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="rounded-xl overflow-hidden bg-gray-100">
                        {selectedType === 'photo' ? (
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover" />
                        ) : selectedType === 'video' ? (
                          <video src={preview} controls className="w-full h-24" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {/* Audio indicator */}
                {audioBase64 && (
                  <div className={`flex items-center gap-3 rounded-2xl p-4 ${
                    selectedType === 'heritage' 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50'
                      : transcriptionFailed 
                        ? 'bg-gradient-to-r from-amber-50 to-orange-50' 
                        : 'bg-gradient-to-r from-blue-50 to-emerald-50'
                  }`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedType === 'heritage'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : transcriptionFailed
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {selectedType === 'heritage' ? 'Patrimoine enregistré' : 'Audio enregistré'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transcriptionFailed 
                          ? '⚠️ Sans transcription' 
                          : `${audioDuration}s - Prêt à publier`}
                      </p>
                    </div>
                    <Check className={`w-6 h-6 ${
                      selectedType === 'heritage' ? 'text-amber-500' :
                      transcriptionFailed ? 'text-amber-500' : 'text-emerald-500'
                    }`} />
                  </div>
                )}

                {/* No audio indicator for media-only */}
                {!audioBase64 && mediaFiles.length > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl p-4 bg-gray-50">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200">
                      {selectedType === 'photo' ? (
                        <Image className="w-6 h-6 text-gray-500" />
                      ) : (
                        <Video className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">
                        {selectedType === 'photo' ? `${mediaFiles.length} Photo${mediaFiles.length > 1 ? 's' : ''}` : 'Vidéo'} sans audio
                      </p>
                      <p className="text-sm text-gray-500">Publication visuelle uniquement</p>
                    </div>
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                )}

                {/* Transcript */}
                {transcript && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Transcription</p>
                    <p className="text-gray-700">{transcript}</p>
                  </div>
                )}

                {/* Attribution info pour patrimoine */}
                {selectedType === 'heritage' && (attribution || village) && (
                  <div className="bg-amber-50 rounded-2xl p-4">
                    {attribution && (
                      <p className="text-sm text-amber-700">
                        <span className="font-medium">Source :</span> {attribution}
                      </p>
                    )}
                    {village && (
                      <p className="text-sm text-amber-700">
                        <span className="font-medium">Village :</span> {village}
                      </p>
                    )}
                  </div>
                )}

                {/* Emoji Selector */}
                <div>
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Smile className="w-4 h-4" />
                    Comment vous sentez-vous ?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emojis.map(emoji => (
                      <motion.button
                        key={emoji}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedEmoji(emoji === selectedEmoji ? null : emoji);
                          triggerFeedback('notification');
                        }}
                        className={`text-2xl p-2 rounded-xl ${
                          selectedEmoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-50'
                        }`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER
        ═══════════════════════════════════════════════════════════════════ */}
        {step === 'preview' && (
          <div className="p-4 border-t border-gray-100 flex gap-3 items-center">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStep('record')}
                className="py-3 px-4 rounded-2xl bg-gray-100 text-gray-600 font-medium"
              >
                {getLabel('cancel')}
              </button>
              <SpeakerButton labelKey="cancel" size="sm" />
            </div>
            <div className="flex items-center gap-1 flex-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-2xl font-medium flex items-center justify-center gap-2 ${
                  selectedType === 'heritage'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                }`}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {selectedType === 'heritage' ? 'Publier le patrimoine' : getLabel('publish')}
                  </>
                )}
              </motion.button>
              <SpeakerButton labelKey="publish" size="md" />
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TamTamCreatePost;
