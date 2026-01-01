import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mic, Check, Loader2, ChevronLeft, Volume2,
  // Patrimoine
  Landmark, BookOpen, Music, MessageSquareQuote, Leaf, Calendar,
  Lock, Users, Globe, Shield, Heart, AlertTriangle, Sparkles,
  // Nouvelles icônes pour "Voix du Village"
  Radio, Users2, HelpCircle, Megaphone, HandHeart, MessageCircle,
  Phone, Wifi, Sun, Moon, Cloud, Zap, Star, Gift, Bell,
  PlayCircle, PauseCircle, RotateCcw, Send, ThumbsUp
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
// 🎯 CONCEPT INNOVANT : "VOIX DU VILLAGE" (Village Voice)
// ═══════════════════════════════════════════════════════════════════════════
// 
// Au lieu de Audio/Photo/Vidéo/Sondage classiques, on propose 2 SUPER-CATÉGORIES
// pensées pour les populations rurales non-lettrées :
//
// 1️⃣ PATRIMOINE - Préserver la culture orale (contes, musique, savoirs)
// 2️⃣ VOIX DU VILLAGE - Communication communautaire simplifiée
//
// La "Voix du Village" permet :
// - Envoyer un message vocal à tout le village
// - Demander de l'aide (urgence, conseil, solidarité)
// - Annoncer un événement (naissance, mariage, décès, fête)
// - Poser une question à la communauté
// - Partager une bonne nouvelle
//
// PRINCIPE : 100% VOCAL, 0 ÉCRITURE, ICÔNES UNIVERSELLES
// ═══════════════════════════════════════════════════════════════════════════

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
  transcript_fr?: string;
  transcript_ba?: string;
  feeling_emoji?: string;
  duration_seconds?: number;
  // Patrimoine
  heritage_type?: HeritageType;
  visibility?: VisibilityLevel;
  sensitivity?: SensitivityLevel;
  consent?: boolean;
  attribution?: string;
  village?: string;
  age_rating?: 'kids' | 'all';
  language?: string;
  // Voix du Village
  village_voice_type?: VillageVoiceType;
  urgency?: UrgencyLevel;
  reach?: ReachLevel;
}

// Types de patrimoine
type HeritageType = 
  | 'heritage_story' | 'heritage_music' | 'heritage_proverb' 
  | 'heritage_history' | 'heritage_knowledge' | 'heritage_event';

// Types de "Voix du Village"
type VillageVoiceType = 
  | 'announce'      // Annonce générale
  | 'help_request'  // Demande d'aide
  | 'celebration'   // Bonne nouvelle / Célébration
  | 'question'      // Question à la communauté
  | 'alert';        // Alerte importante

type VisibilityLevel = 'public' | 'community' | 'vault';
type SensitivityLevel = 'normal' | 'sensitive';
type UrgencyLevel = 'normal' | 'urgent' | 'critical';
type ReachLevel = 'village' | 'commune' | 'region' | 'all';

// Type principal de contenu
type MainContentType = 'patrimoine' | 'village_voice';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

// Les 2 super-catégories principales
const mainCategories: {
  type: MainContentType;
  icon: typeof Landmark;
  title: string;
  titleBa: string;
  subtitle: string;
  gradient: string;
  emoji: string;
}[] = [
  {
    type: 'patrimoine',
    icon: Landmark,
    title: 'Patrimoine',
    titleBa: 'Kpààrà',
    subtitle: 'Contes, musique, savoirs ancestraux',
    gradient: 'from-amber-500 via-yellow-500 to-orange-500',
    emoji: '🏛️'
  },
  {
    type: 'village_voice',
    icon: Radio,
    title: 'Voix du Village',
    titleBa: 'Kùú dɔ̀ɔ̀rɔ̀',
    subtitle: 'Annonces, entraide, célébrations',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    emoji: '📢'
  }
];

// Types de patrimoine
const heritageTypes: {
  type: HeritageType;
  icon: typeof BookOpen;
  label: string;
  labelBa: string;
  emoji: string;
  color: string;
  gradient: string;
  audioPrompt: string;
}[] = [
  {
    type: 'heritage_story',
    icon: BookOpen,
    label: 'Conte',
    labelBa: 'Sìírà',
    emoji: '📖',
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-purple-700',
    audioPrompt: 'Racontez votre conte ou histoire traditionnelle'
  },
  {
    type: 'heritage_music',
    icon: Music,
    label: 'Musique',
    labelBa: 'Dùùrú',
    emoji: '🎵',
    color: 'bg-pink-500',
    gradient: 'from-pink-500 to-rose-600',
    audioPrompt: 'Chantez ou jouez votre musique traditionnelle'
  },
  {
    type: 'heritage_proverb',
    icon: MessageSquareQuote,
    label: 'Proverbe',
    labelBa: 'Sɔ̀ɔ̀rɔ̀',
    emoji: '💬',
    color: 'bg-teal-500',
    gradient: 'from-teal-500 to-cyan-600',
    audioPrompt: 'Dites le proverbe et expliquez sa signification'
  },
  {
    type: 'heritage_history',
    icon: Landmark,
    label: 'Histoire',
    labelBa: 'Kpààrà',
    emoji: '🏛️',
    color: 'bg-amber-600',
    gradient: 'from-amber-600 to-orange-700',
    audioPrompt: 'Racontez l\'histoire de votre village ou famille'
  },
  {
    type: 'heritage_knowledge',
    icon: Leaf,
    label: 'Savoir',
    labelBa: 'Dɔ̀nnìyá',
    emoji: '🌿',
    color: 'bg-green-600',
    gradient: 'from-green-600 to-emerald-700',
    audioPrompt: 'Partagez une connaissance traditionnelle'
  },
  {
    type: 'heritage_event',
    icon: Calendar,
    label: 'Fête',
    labelBa: 'Tìɛ̀rɛ̀',
    emoji: '🎉',
    color: 'bg-red-500',
    gradient: 'from-red-500 to-rose-700',
    audioPrompt: 'Décrivez cette fête ou cérémonie traditionnelle'
  },
];

// Types de "Voix du Village" - INNOVATION PRINCIPALE
const villageVoiceTypes: {
  type: VillageVoiceType;
  icon: typeof Megaphone;
  label: string;
  labelBa: string;
  emoji: string;
  color: string;
  gradient: string;
  audioPrompt: string;
  example: string;
}[] = [
  {
    type: 'announce',
    icon: Megaphone,
    label: 'Annonce',
    labelBa: 'Kùú',
    emoji: '📢',
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-700',
    audioPrompt: 'Faites votre annonce au village',
    example: 'Réunion demain à 8h sous l\'arbre'
  },
  {
    type: 'help_request',
    icon: HandHeart,
    label: 'Aide',
    labelBa: 'Sɔ̀ɔ̀nɔ̀',
    emoji: '🙏',
    color: 'bg-red-500',
    gradient: 'from-red-500 to-rose-700',
    audioPrompt: 'Expliquez de quelle aide vous avez besoin',
    example: 'J\'ai besoin d\'aide pour la récolte'
  },
  {
    type: 'celebration',
    icon: Gift,
    label: 'Joie',
    labelBa: 'Fɛ̀rɛ̀',
    emoji: '🎉',
    color: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-amber-600',
    audioPrompt: 'Partagez votre bonne nouvelle',
    example: 'Naissance, mariage, réussite...'
  },
  {
    type: 'question',
    icon: HelpCircle,
    label: 'Question',
    labelBa: 'Bìká',
    emoji: '❓',
    color: 'bg-purple-500',
    gradient: 'from-purple-500 to-violet-700',
    audioPrompt: 'Posez votre question à la communauté',
    example: 'Qui connaît un bon remède pour...?'
  },
  {
    type: 'alert',
    icon: Bell,
    label: 'Alerte',
    labelBa: 'Gbàrà',
    emoji: '🚨',
    color: 'bg-orange-600',
    gradient: 'from-orange-600 to-red-700',
    audioPrompt: 'Décrivez l\'alerte ou le danger',
    example: 'Attention, route coupée...'
  },
];

// Options de visibilité
const visibilityOptions: {
  level: VisibilityLevel;
  icon: typeof Globe;
  label: string;
  labelBa: string;
  emoji: string;
  color: string;
}[] = [
  { level: 'public', icon: Globe, label: 'Tous', labelBa: 'Gbogbo', emoji: '🌍', color: 'bg-green-500' },
  { level: 'community', icon: Users, label: 'Village', labelBa: 'Kùú', emoji: '🏘️', color: 'bg-blue-500' },
  { level: 'vault', icon: Lock, label: 'Privé', labelBa: 'Àṣírí', emoji: '🔒', color: 'bg-purple-500' },
];

// Options de portée (pour Voix du Village)
const reachOptions: {
  level: ReachLevel;
  icon: typeof Users2;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { level: 'village', icon: Users2, label: 'Mon village', emoji: '🏘️', color: 'bg-emerald-500' },
  { level: 'commune', icon: Users, label: 'Ma commune', emoji: '🏙️', color: 'bg-blue-500' },
  { level: 'region', icon: Globe, label: 'Ma région', emoji: '🗺️', color: 'bg-purple-500' },
  { level: 'all', icon: Wifi, label: 'Tout le monde', emoji: '🌍', color: 'bg-amber-500' },
];

// Emojis de ressenti
const feelingEmojis = ['😊', '🙏', '❤️', '🎉', '💪', '🙌', '✨', '🌟'];

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
  const [mainCategory, setMainCategory] = useState<MainContentType | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [translatedTranscript, setTranslatedTranscript] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<
    'category' | 'heritage-type' | 'heritage-settings' | 
    'village-type' | 'village-settings' | 'record' | 'preview'
  >('category');
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  const [capturedLiveTranscript, setCapturedLiveTranscript] = useState<string>('');
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  
  // ─── États Patrimoine ────────────────────────────────────────────────────
  const [selectedHeritageType, setSelectedHeritageType] = useState<HeritageType | null>(null);
  const [visibility, setVisibility] = useState<VisibilityLevel>('public');
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('normal');
  const [consent, setConsent] = useState<boolean>(false);
  const [attribution, setAttribution] = useState<string>('');
  const [village, setVillage] = useState<string>('');
  const [ageRating, setAgeRating] = useState<'kids' | 'all'>('all');
  
  // ─── États Voix du Village ───────────────────────────────────────────────
  const [selectedVoiceType, setSelectedVoiceType] = useState<VillageVoiceType | null>(null);
  const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
  const [reach, setReach] = useState<ReachLevel>('village');

  // ─── Effets ──────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (liveTranscript && currentLang === 'fr') {
      setCapturedLiveTranscript(liveTranscript);
    }
  }, [liveTranscript, currentLang]);

  // Lecture audio du prompt à l'ouverture de chaque étape
  useEffect(() => {
    if (step === 'category' && isOpen) {
      // Optionnel: lire automatiquement les instructions
      // playAudioPrompt('Que voulez-vous partager ? Touchez une icône.');
    }
  }, [step, isOpen]);

  // ─── Fonctions utilitaires ───────────────────────────────────────────────

  const playAudioPrompt = async (text: string) => {
    setIsPlayingPrompt(true);
    try {
      // Utiliser le TTS pour lire le prompt
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang === 'ba' ? 'fr-FR' : 'fr-FR';
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlayingPrompt(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsPlayingPrompt(false);
    }
  };

  const getCurrentAudioPrompt = (): string => {
    if (mainCategory === 'patrimoine' && selectedHeritageType) {
      return heritageTypes.find(h => h.type === selectedHeritageType)?.audioPrompt || '';
    }
    if (mainCategory === 'village_voice' && selectedVoiceType) {
      return villageVoiceTypes.find(v => v.type === selectedVoiceType)?.audioPrompt || '';
    }
    return 'Enregistrez votre message vocal';
  };

  // ─── Gestionnaires d'événements ──────────────────────────────────────────

  const handleMainCategorySelect = (category: MainContentType) => {
    setMainCategory(category);
    triggerFeedback('notification');
    
    if (category === 'patrimoine') {
      setStep('heritage-type');
    } else {
      setStep('village-type');
    }
  };

  const handleHeritageTypeSelect = (heritageType: HeritageType) => {
    setSelectedHeritageType(heritageType);
    triggerFeedback('notification');
    
    const heritage = heritageTypes.find(h => h.type === heritageType);
    if (heritage) {
      playAudioPrompt(heritage.audioPrompt);
    }
    
    setStep('heritage-settings');
  };

  const handleVoiceTypeSelect = (voiceType: VillageVoiceType) => {
    setSelectedVoiceType(voiceType);
    triggerFeedback('notification');
    
    const voice = villageVoiceTypes.find(v => v.type === voiceType);
    if (voice) {
      playAudioPrompt(voice.audioPrompt);
    }
    
    setStep('village-settings');
  };

  const handleSettingsComplete = () => {
    if (mainCategory === 'patrimoine' && !consent) {
      toast({
        title: "⚠️ Consentement requis",
        description: "Confirmez que vous avez le droit de partager ce contenu",
        variant: "destructive"
      });
      triggerFeedback('error');
      return;
    }
    
    triggerFeedback('success');
    playAudioPrompt(getCurrentAudioPrompt());
    setStep('record');
  };

  const handleRecordingComplete = async (base64: string, duration?: number, recorderLiveTranscript?: string) => {
    console.log('[TamTamCreatePost] Recording complete');
    
    setAudioBase64(base64);
    setAudioDuration(duration || 0);
    setTranscriptionFailed(false);
    triggerFeedback('success');
    
    toast({ title: "🎤 Traitement...", description: "Analyse de votre message" });
    
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
      
      try {
        const translateResult = await transcribeWithTranslation(base64, 'fr');
        if (translateResult.transcription_ba) {
          setTranslatedTranscript(translateResult.transcription_ba);
        }
      } catch (e) {
        console.warn('Translation failed:', e);
      }
      
      toast({ title: "✅ Message prêt", description: "Vérifiez et publiez" });
      setStep('preview');
      return;
    }
    
    const result = await transcribeWithTranslation(base64, sourceLang);
    
    if (result.transcription && result.transcription.length > 0) {
      setTranscript(result.transcription);
      setTranslatedTranscript(sourceLang === 'fr' ? result.transcription_ba : result.transcription_fr);
      toast({ title: "✅ Message prêt" });
    } else if (bestLiveTranscript) {
      setTranscript(bestLiveTranscript);
      toast({ title: "✅ Message enregistré" });
    } else {
      setTranscriptionFailed(true);
      toast({ title: "⚠️ Audio sans texte", description: "Publication vocale uniquement" });
    }
    
    setStep('preview');
  };

  const handleSubmit = async () => {
    if (!audioBase64) {
      toast({ title: "🎤 Audio requis", description: "Enregistrez votre message", variant: "destructive" });
      triggerFeedback('error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Upload audio
      const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
      const audioFileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
      
      const { error: audioError } = await supabase.storage
        .from('tamtam-audio')
        .upload(audioFileName, audioBlob, { contentType: 'audio/webm' });

      if (audioError) throw audioError;

      const { data: audioUrlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(audioFileName);

      // Construire les données du post
      const postData: PostSubmitData = {
        audio_url: audioUrlData.publicUrl,
        media_type: mainCategory === 'patrimoine' 
          ? selectedHeritageType || 'heritage_story' 
          : `village_${selectedVoiceType || 'announce'}`,
        transcript_fr: currentLang === 'fr' ? transcript : translatedTranscript || undefined,
        transcript_ba: currentLang === 'ba' ? transcript : translatedTranscript || undefined,
        feeling_emoji: selectedEmoji || undefined,
        duration_seconds: audioDuration || 0,
        language: currentLang,
        // Patrimoine
        heritage_type: mainCategory === 'patrimoine' ? selectedHeritageType || undefined : undefined,
        visibility: visibility,
        sensitivity: mainCategory === 'patrimoine' ? sensitivity : undefined,
        consent: mainCategory === 'patrimoine' ? consent : true,
        attribution: attribution || undefined,
        village: village || undefined,
        age_rating: mainCategory === 'patrimoine' ? ageRating : undefined,
        // Voix du Village
        village_voice_type: mainCategory === 'village_voice' ? selectedVoiceType || undefined : undefined,
        urgency: mainCategory === 'village_voice' ? urgency : undefined,
        reach: mainCategory === 'village_voice' ? reach : undefined,
      };
      
      await onSubmit(postData);
      
      triggerFeedback('success');
      
      // Message de confirmation vocal
      playAudioPrompt(mainCategory === 'patrimoine' 
        ? 'Votre patrimoine a été partagé avec succès' 
        : 'Votre message a été envoyé au village');
      
      resetPostState();
      onClose();
      
    } catch (err: any) {
      console.error('Submit error:', err);
      triggerFeedback('error');
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPostState = () => {
    setMainCategory(null);
    setAudioBase64(null);
    setAudioDuration(0);
    setTranscript('');
    setTranslatedTranscript('');
    setSelectedEmoji(null);
    setTranscriptionFailed(false);
    setCapturedLiveTranscript('');
    setStep('category');
    // Patrimoine
    setSelectedHeritageType(null);
    setVisibility('public');
    setSensitivity('normal');
    setConsent(false);
    setAttribution('');
    setVillage('');
    setAgeRating('all');
    // Voix du Village
    setSelectedVoiceType(null);
    setUrgency('normal');
    setReach('village');
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  const goBack = () => {
    triggerFeedback('notification');
    switch (step) {
      case 'heritage-type':
      case 'village-type':
        setStep('category');
        break;
      case 'heritage-settings':
        setStep('heritage-type');
        break;
      case 'village-settings':
        setStep('village-type');
        break;
      case 'record':
        setStep(mainCategory === 'patrimoine' ? 'heritage-settings' : 'village-settings');
        break;
      case 'preview':
        setStep('record');
        break;
      default:
        setStep('category');
    }
  };

  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-gradient-to-b from-slate-50 to-white rounded-t-[2rem] min-h-[65vh] max-h-[92vh] flex flex-col shadow-2xl"
      >
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {step !== 'category' && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={goBack}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <ChevronLeft className="w-6 h-6 text-slate-600" />
              </motion.button>
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {step === 'category' && '🎙️ Nouveau message'}
                {step === 'heritage-type' && '🏛️ Patrimoine'}
                {step === 'heritage-settings' && '⚙️ Paramètres'}
                {step === 'village-type' && '📢 Voix du Village'}
                {step === 'village-settings' && '📍 Portée'}
                {step === 'record' && '🎤 Enregistrement'}
                {step === 'preview' && '✅ Aperçu'}
              </h3>
              {isTranscribing && (
                <div className="flex items-center gap-1 text-blue-500 text-sm">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Analyse...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Bouton lecture vocale */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => playAudioPrompt(getCurrentAudioPrompt())}
              disabled={isPlayingPrompt}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isPlayingPrompt ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
              }`}
            >
              <Volume2 className={`w-5 h-5 ${isPlayingPrompt ? 'animate-pulse' : ''}`} />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-slate-500" />
            </motion.button>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            
            {/* ═══════════════════════════════════════════════════════════════
                STEP 1: CHOIX DE LA CATÉGORIE PRINCIPALE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <p className="text-center text-slate-500 text-lg">
                  Que voulez-vous partager ?
                </p>
                
                <div className="space-y-4">
                  {mainCategories.map((cat, index) => {
                    const Icon = cat.icon;
                    return (
                      <motion.button
                        key={cat.type}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleMainCategorySelect(cat.type)}
                        className={`w-full p-6 rounded-3xl bg-gradient-to-r ${cat.gradient} text-white shadow-xl relative overflow-hidden group`}
                      >
                        {/* Décoration animée */}
                        <div className="absolute inset-0 opacity-20">
                          <motion.div 
                            className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full"
                            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                            transition={{ duration: 10, repeat: Infinity }}
                          />
                          <motion.div 
                            className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 8, repeat: Infinity }}
                          />
                        </div>
                        
                        <div className="relative z-10 flex items-center gap-5">
                          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl">
                            {cat.emoji}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-2xl">{cat.title}</span>
                              <span className="text-white/70 text-lg">({cat.titleBa})</span>
                            </div>
                            <p className="text-white/80 mt-1">{cat.subtitle}</p>
                          </div>
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Sparkles className="w-8 h-8 text-white/70" />
                          </motion.div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2A: TYPES DE PATRIMOINE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'heritage-type' && (
              <motion.div
                key="heritage-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-center text-slate-500 mb-2">
                  Quel patrimoine voulez-vous partager ?
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {heritageTypes.map((heritage, index) => (
                    <motion.button
                      key={heritage.type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleHeritageTypeSelect(heritage.type)}
                      className={`p-5 rounded-2xl bg-gradient-to-br ${heritage.gradient} text-white shadow-lg flex flex-col items-center gap-2`}
                    >
                      <span className="text-4xl">{heritage.emoji}</span>
                      <span className="font-bold text-lg">{heritage.label}</span>
                      <span className="text-white/70 text-sm">{heritage.labelBa}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2B: TYPES DE VOIX DU VILLAGE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'village-type' && (
              <motion.div
                key="village-type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-center text-slate-500 mb-2">
                  Quel type de message ?
                </p>
                
                <div className="space-y-3">
                  {villageVoiceTypes.map((voice, index) => (
                    <motion.button
                      key={voice.type}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleVoiceTypeSelect(voice.type)}
                      className={`w-full p-4 rounded-2xl bg-gradient-to-r ${voice.gradient} text-white shadow-lg flex items-center gap-4`}
                    >
                      <span className="text-3xl">{voice.emoji}</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{voice.label}</span>
                          <span className="text-white/70">({voice.labelBa})</span>
                        </div>
                        <p className="text-white/70 text-sm">{voice.example}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 3A: PARAMÈTRES PATRIMOINE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'heritage-settings' && (
              <motion.div
                key="heritage-settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Badge type sélectionné */}
                {selectedHeritageType && (() => {
                  const heritage = heritageTypes.find(h => h.type === selectedHeritageType);
                  if (!heritage) return null;
                  return (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${heritage.gradient} text-white font-medium`}>
                      <span className="text-xl">{heritage.emoji}</span>
                      {heritage.label}
                    </div>
                  );
                })()}

                {/* Visibilité */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Qui peut voir ?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {visibilityOptions.map((opt) => (
                      <motion.button
                        key={opt.level}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setVisibility(opt.level)}
                        className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                          visibility === opt.level 
                            ? `${opt.color} text-white shadow-lg scale-105` 
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sensibilité */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Protéger ce savoir ?
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSensitivity('normal')}
                      className={`flex-1 p-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        sensitivity === 'normal' ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="text-xl">✅</span>
                      <span className="font-medium">Normal</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSensitivity('sensitive')}
                      className={`flex-1 p-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        sensitivity === 'sensitive' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="text-xl">🔐</span>
                      <span className="font-medium">Protégé</span>
                    </motion.button>
                  </div>
                </div>

                {/* Public cible */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Pour qui ?
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAgeRating('all')}
                      className={`flex-1 p-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        ageRating === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="text-xl">👥</span>
                      <span className="font-medium">Tous</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAgeRating('kids')}
                      className={`flex-1 p-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                        ageRating === 'kids' ? 'bg-pink-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="text-xl">👶</span>
                      <span className="font-medium">Enfants</span>
                    </motion.button>
                  </div>
                </div>

                {/* Consentement */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setConsent(!consent)}
                  className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                    consent ? 'bg-green-100 border-2 border-green-500' : 'bg-slate-100 border-2 border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xl ${
                    consent ? 'bg-green-500 text-white' : 'bg-slate-300'
                  }`}>
                    {consent ? '✓' : ''}
                  </div>
                  <span className={`text-sm ${consent ? 'text-green-700' : 'text-slate-600'}`}>
                    ✋ Je confirme avoir le droit de partager ce patrimoine
                  </span>
                </motion.button>

                {/* Bouton continuer */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSettingsComplete}
                  disabled={!consent}
                  className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                    consent 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' 
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  <Mic className="w-6 h-6" />
                  🎤 Enregistrer
                </motion.button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 3B: PARAMÈTRES VOIX DU VILLAGE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'village-settings' && (
              <motion.div
                key="village-settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Badge type sélectionné */}
                {selectedVoiceType && (() => {
                  const voice = villageVoiceTypes.find(v => v.type === selectedVoiceType);
                  if (!voice) return null;
                  return (
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${voice.gradient} text-white font-medium`}>
                      <span className="text-xl">{voice.emoji}</span>
                      {voice.label}
                    </div>
                  );
                })()}

                {/* Portée du message */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Wifi className="w-4 h-4" /> Qui doit entendre ?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {reachOptions.map((opt) => (
                      <motion.button
                        key={opt.level}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setReach(opt.level)}
                        className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                          reach === opt.level 
                            ? `${opt.color} text-white shadow-lg scale-105` 
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Urgence (seulement pour aide et alerte) */}
                {(selectedVoiceType === 'help_request' || selectedVoiceType === 'alert') && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> C'est urgent ?
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setUrgency('normal')}
                        className={`flex-1 p-4 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          urgency === 'normal' ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-2xl">🟢</span>
                        <span className="text-sm font-medium">Normal</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setUrgency('urgent')}
                        className={`flex-1 p-4 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          urgency === 'urgent' ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-2xl">🟠</span>
                        <span className="text-sm font-medium">Urgent</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setUrgency('critical')}
                        className={`flex-1 p-4 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          urgency === 'critical' ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <span className="text-2xl">🔴</span>
                        <span className="text-sm font-medium">Critique</span>
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Bouton continuer */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSettingsComplete}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-lg flex items-center justify-center gap-3 shadow-lg"
                >
                  <Mic className="w-6 h-6" />
                  🎤 Enregistrer mon message
                </motion.button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 4: ENREGISTREMENT
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'record' && (
              <motion.div
                key="record"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Badge contexte */}
                <div className="text-center">
                  {mainCategory === 'patrimoine' && selectedHeritageType && (() => {
                    const heritage = heritageTypes.find(h => h.type === selectedHeritageType);
                    if (!heritage) return null;
                    return (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${heritage.gradient} text-white font-medium mb-3`}>
                        <span className="text-xl">{heritage.emoji}</span>
                        {heritage.label}
                      </div>
                    );
                  })()}
                  
                  {mainCategory === 'village_voice' && selectedVoiceType && (() => {
                    const voice = villageVoiceTypes.find(v => v.type === selectedVoiceType);
                    if (!voice) return null;
                    return (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${voice.gradient} text-white font-medium mb-3`}>
                        <span className="text-xl">{voice.emoji}</span>
                        {voice.label}
                      </div>
                    );
                  })()}
                  
                  <p className="text-slate-500">
                    {getCurrentAudioPrompt()}
                  </p>
                </div>

                {/* Enregistreur */}
                <div className="flex flex-col items-center py-6">
                  <SmartVoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                    language={currentLang === 'ba' ? 'bariba' : 'french'}
                  />
                </div>

                {/* Conseils */}
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-sm text-slate-500 text-center">
                    💡 Parlez clairement et prenez votre temps
                  </p>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 5: PREVIEW
            ═══════════════════════════════════════════════════════════════ */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {mainCategory === 'patrimoine' && selectedHeritageType && (() => {
                    const heritage = heritageTypes.find(h => h.type === selectedHeritageType);
                    if (!heritage) return null;
                    return (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${heritage.gradient} text-white text-sm font-medium`}>
                        <span>{heritage.emoji}</span>
                        {heritage.label}
                      </div>
                    );
                  })()}
                  
                  {mainCategory === 'village_voice' && selectedVoiceType && (() => {
                    const voice = villageVoiceTypes.find(v => v.type === selectedVoiceType);
                    if (!voice) return null;
                    return (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${voice.gradient} text-white text-sm font-medium`}>
                        <span>{voice.emoji}</span>
                        {voice.label}
                      </div>
                    );
                  })()}
                  
                  <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                    visibility === 'public' ? 'bg-green-100 text-green-700' :
                    visibility === 'community' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {visibilityOptions.find(v => v.level === visibility)?.emoji}
                    {visibilityOptions.find(v => v.level === visibility)?.label}
                  </div>
                  
                  {mainCategory === 'village_voice' && (
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
                      📍 {reachOptions.find(r => r.level === reach)?.label}
                    </div>
                  )}
                </div>

                {/* Audio indicator */}
                {audioBase64 && (
                  <div className={`flex items-center gap-4 rounded-2xl p-5 ${
                    mainCategory === 'patrimoine' 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50'
                      : 'bg-gradient-to-r from-emerald-50 to-teal-50'
                  }`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      mainCategory === 'patrimoine'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      <Mic className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-lg">
                        {mainCategory === 'patrimoine' ? '🏛️ Patrimoine' : '📢 Message'}
                      </p>
                      <p className="text-sm text-slate-500">
                        {audioDuration}s enregistré{transcriptionFailed ? ' (sans texte)' : ''}
                      </p>
                    </div>
                    <Check className={`w-8 h-8 ${
                      mainCategory === 'patrimoine' ? 'text-amber-500' : 'text-emerald-500'
                    }`} />
                  </div>
                )}

                {/* Transcript */}
                {transcript && (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-sm text-slate-400 mb-1">📝 Transcription</p>
                    <p className="text-slate-700">{transcript}</p>
                  </div>
                )}

                {/* Emoji selector */}
                <div>
                  <p className="text-sm text-slate-400 mb-2">Comment vous sentez-vous ?</p>
                  <div className="flex flex-wrap gap-2">
                    {feelingEmojis.map(emoji => (
                      <motion.button
                        key={emoji}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedEmoji(emoji === selectedEmoji ? null : emoji);
                          triggerFeedback('notification');
                        }}
                        className={`text-3xl p-2 rounded-xl ${
                          selectedEmoji === emoji ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-slate-50'
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
          <div className="p-4 border-t border-slate-100 flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep('record')}
              className="py-4 px-6 rounded-2xl bg-slate-100 text-slate-600 font-medium flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Refaire
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 ${
                mainCategory === 'patrimoine'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Send className="w-6 h-6" />
                  Envoyer
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TamTamCreatePost;
