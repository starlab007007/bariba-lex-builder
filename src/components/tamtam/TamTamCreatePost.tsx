import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Video, Mic, BarChart3, Check, Smile, ImageOff, Volume2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { useAudioServices } from '@/hooks/useAudioServices';
import { AudioServicesStatusBar } from '@/components/tamtam/AudioServiceStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useVoiceMenu, VoiceMenuLabels } from '@/hooks/useVoiceMenu';
import { SpeakerButton } from '@/components/tamtam/VoiceMenuItem';

interface TamTamCreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: {
    audio_url: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    feeling_emoji?: string;
    duration_seconds?: number;
  }) => Promise<void>;
  onOpenPoll?: () => void;
}

// Extended file formats
const PHOTO_FORMATS = "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/bmp,image/svg+xml";
const VIDEO_FORMATS = "video/mp4,video/quicktime,video/x-m4v,video/webm,video/x-msvideo,video/3gpp,video/mpeg,video/ogg";

const mediaTypes: { type: string; icon: typeof Mic; label: string; labelKey: keyof VoiceMenuLabels; color: string }[] = [
  { type: 'audio', icon: Mic, label: 'audio', labelKey: 'audio', color: 'from-blue-500 to-blue-600' },
  { type: 'photo', icon: Image, label: 'photo', labelKey: 'photo', color: 'from-emerald-500 to-emerald-600' },
  { type: 'video', icon: Video, label: 'video', labelKey: 'video', color: 'from-purple-500 to-purple-600' },
  { type: 'poll', icon: BarChart3, label: 'poll', labelKey: 'poll', color: 'from-orange-500 to-orange-600' },
];

const emojis = ['😊', '😂', '❤️', '🎉', '🤔', '😢', '🙏', '💪', '🔥', '✨'];

export const TamTamCreatePost: React.FC<TamTamCreatePostProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenPoll
}) => {
  const { t, currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  const audioServices = useAudioServices();
  const { speakLabel, getLabel } = useVoiceMenu();
  
  const [selectedType, setSelectedType] = useState<string>('audio');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [translatedTranscript, setTranslatedTranscript] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'type' | 'record' | 'media' | 'preview'>('type');
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    triggerFeedback('notification');
    
    if (type === 'poll') {
      // Close this modal and open poll creator
      onClose();
      onOpenPoll?.();
      return;
    }
    
    if (type === 'photo' || type === 'video') {
      fileInputRef.current?.click();
    } else {
      setStep('record');
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
      setStep('record'); // Go to record step (audio is optional)
    }
  };

  const handleRecordingComplete = async (base64: string, duration?: number) => {
    console.log('[TamTamCreatePost] Recording complete, duration:', duration);
    setAudioBase64(base64);
    setAudioDuration(duration || 0);
    setTranscriptionFailed(false);
    triggerFeedback('success');
    
    // Transcribe and translate
    const sourceLang = currentLang === 'ba' ? 'ba' : 'fr';
    const { transcription, translation } = await audioServices.transcribeAndTranslate(base64, sourceLang);
    
    if (transcription) {
      setTranscript(transcription);
      if (translation) {
        setTranslatedTranscript(translation);
      }
      toast({
        title: "✅ Transcription réussie",
        description: translation ? "Audio transcrit et traduit" : "Votre audio a été transcrit"
      });
    } else {
      setTranscriptionFailed(true);
      toast({
        title: "⚠️ Transcription non disponible",
        description: "Vous pouvez quand même publier votre audio"
      });
    }
    
    setStep('preview');
  };

  // Skip audio and go directly to preview (for photo/video only posts)
  const handleSkipAudio = () => {
    if (!mediaFile) {
      toast({ title: "Média requis", description: "Sélectionnez d'abord un média", variant: "destructive" });
      return;
    }
    triggerFeedback('notification');
    setStep('preview');
  };

  const handleSubmit = async () => {
    console.log('[TamTamCreatePost.handleSubmit] Starting submission...');
    
    // For photo/video posts, audio is optional
    if (!audioBase64 && selectedType === 'audio') {
      toast({ title: "Audio requis", description: "Veuillez enregistrer un audio", variant: "destructive" });
      return;
    }

    // For media posts without audio, we still need either audio or media
    if (!audioBase64 && !mediaFile) {
      toast({ title: "Contenu requis", description: "Ajoutez un audio ou un média", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    try {
      let audioUrl = '';
      let mediaUrl: string | undefined;

      // Upload audio if exists
      if (audioBase64) {
        console.log('[TamTamCreatePost.handleSubmit] Uploading audio...');
        const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
        const audioFileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        
        const { data: audioData, error: audioError } = await supabase.storage
          .from('tamtam-audio')
          .upload(audioFileName, audioBlob, { contentType: 'audio/webm' });

        if (audioError) {
          console.error('[TamTamCreatePost.handleSubmit] Audio upload error:', audioError);
          throw audioError;
        }

        const { data: audioUrlData } = supabase.storage
          .from('tamtam-audio')
          .getPublicUrl(audioFileName);

        audioUrl = audioUrlData.publicUrl;
        console.log('[TamTamCreatePost.handleSubmit] Audio URL:', audioUrl);
      }

      // Upload media if exists
      if (mediaFile) {
        console.log('[TamTamCreatePost.handleSubmit] Uploading media...', mediaFile.name);
        const mediaFileName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}.${mediaFile.name.split('.').pop()}`;
        
        const { error: mediaError } = await supabase.storage
          .from('tamtam-audio')
          .upload(mediaFileName, mediaFile);

        if (mediaError) {
          console.warn('[TamTamCreatePost.handleSubmit] Media upload warning:', mediaError.message);
          // Non-blocking - continue without media
        } else {
          const { data: url } = supabase.storage
            .from('tamtam-audio')
            .getPublicUrl(mediaFileName);
          mediaUrl = url.publicUrl;
          console.log('[TamTamCreatePost.handleSubmit] Media URL:', mediaUrl);
        }
      }

      // For media-only posts, we need to generate a placeholder audio
      if (!audioUrl && mediaUrl) {
        // Create a silent audio placeholder or use a generated one
        audioUrl = mediaUrl; // Temporary: use media URL as audio URL
      }

      const postData = {
        audio_url: audioUrl,
        media_type: selectedType,
        media_url: mediaUrl,
        transcript_fr: currentLang === 'fr' ? transcript : translatedTranscript || undefined,
        transcript_ba: currentLang === 'ba' ? transcript : translatedTranscript || undefined,
        feeling_emoji: selectedEmoji || undefined,
        duration_seconds: audioDuration || 0
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
    setMediaFile(null);
    setMediaPreview(null);
    setTranscript('');
    setTranslatedTranscript('');
    setSelectedEmoji(null);
    setTranscriptionFailed(false);
    setStep('type');
    setSelectedType('audio');
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

  if (!isOpen) return null;

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
        className="w-full max-w-lg bg-white rounded-t-3xl min-h-[60vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {t('newPost')}
            </h3>
            <AudioServicesStatusBar health={audioServices.health} />
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
            {/* Step 1: Select Type */}
            {step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <p className="text-center text-gray-500 mb-6">{t('whatToShare')}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {mediaTypes.map(({ type, icon: Icon, label, labelKey, color }) => (
                    <div key={type} className="relative">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleTypeSelect(type)}
                        className={`w-full p-6 rounded-3xl flex flex-col items-center gap-3 ${
                          selectedType === type 
                            ? `bg-gradient-to-br ${color} text-white shadow-lg` 
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        <Icon className="w-10 h-10" />
                        <span className="font-medium">{t(label)}</span>
                      </motion.button>
                      {/* Speaker button for voice accessibility */}
                      <SpeakerButton 
                        labelKey={labelKey}
                        size="sm"
                        className="absolute top-2 right-2"
                      />
                    </div>
                  ))}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={selectedType === 'photo' ? PHOTO_FORMATS : VIDEO_FORMATS}
                  capture={selectedType === 'photo' ? 'environment' : undefined}
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </motion.div>
            )}

            {/* Step 2: Record Audio (optional for photo/video) */}
            {step === 'record' && (
              <motion.div
                key="record"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Media Preview */}
                {mediaPreview && (
                  <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                    {selectedType === 'photo' ? (
                      <img src={mediaPreview} alt="Preview" className="w-full max-h-48 object-cover" />
                    ) : selectedType === 'video' ? (
                      <video src={mediaPreview} controls className="w-full max-h-48" />
                    ) : null}
                  </div>
                )}

                <div className="text-center">
                  <p className="text-gray-500 mb-4">
                    {mediaFile 
                      ? "Ajoutez un message vocal (optionnel)" 
                      : t('recordAudio')}
                  </p>
                  <SmartVoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                    language={currentLang === 'ba' ? 'bariba' : 'french'}
                  />
                </div>

                {/* Skip audio button for photo/video with voice support */}
                {mediaFile && (
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

            {/* Step 3: Preview & Submit */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Media Preview */}
                {mediaPreview && (
                  <div className="rounded-2xl overflow-hidden bg-gray-100">
                    {selectedType === 'photo' ? (
                      <img src={mediaPreview} alt="Preview" className="w-full max-h-48 object-cover" />
                    ) : selectedType === 'video' ? (
                      <video src={mediaPreview} controls className="w-full max-h-48" />
                    ) : null}
                  </div>
                )}

                {/* Audio indicator */}
                {audioBase64 && (
                  <div className={`flex items-center gap-3 rounded-2xl p-4 ${
                    transcriptionFailed 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50' 
                      : 'bg-gradient-to-r from-blue-50 to-emerald-50'
                  }`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      transcriptionFailed
                        ? 'bg-gradient-to-br from-amber-500 to-amber-600'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Audio enregistré</p>
                      <p className="text-sm text-gray-500">
                        {transcriptionFailed 
                          ? '⚠️ Sans transcription' 
                          : `${audioDuration}s - Prêt à publier`}
                      </p>
                    </div>
                    <Check className={`w-6 h-6 ${transcriptionFailed ? 'text-amber-500' : 'text-emerald-500'}`} />
                  </div>
                )}

                {/* No audio indicator for media-only */}
                {!audioBase64 && mediaFile && (
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
                        {selectedType === 'photo' ? 'Photo' : 'Vidéo'} sans audio
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

        {/* Footer with voice-accessible buttons */}
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
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2"
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
                    {getLabel('publish')}
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
