import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Video, Mic, BarChart3, Camera, Check, Upload, Smile } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useFrenchSTT } from '@/hooks/useFrenchSTT';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
}

const mediaTypes = [
  { type: 'audio', icon: Mic, label: 'audio', color: 'from-blue-500 to-blue-600' },
  { type: 'photo', icon: Image, label: 'photo', color: 'from-emerald-500 to-emerald-600' },
  { type: 'video', icon: Video, label: 'video', color: 'from-purple-500 to-purple-600' },
  { type: 'poll', icon: BarChart3, label: 'poll', color: 'from-orange-500 to-orange-600' },
];

const emojis = ['😊', '😂', '❤️', '🎉', '🤔', '😢', '🙏', '💪', '🔥', '✨'];

export const TamTamCreatePost: React.FC<TamTamCreatePostProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { t, currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  const baribaSTT = useBaribaSTT();
  const frenchSTT = useFrenchSTT();
  
  const [selectedType, setSelectedType] = useState<string>('audio');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'type' | 'record' | 'media' | 'preview'>('type');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
      setStep('record');
    }
  };

  const [transcriptionFailed, setTranscriptionFailed] = useState(false);

  const handleRecordingComplete = async (base64: string) => {
    console.log('[TamTamCreatePost] Recording complete, audio length:', base64.length);
    setAudioBase64(base64);
    setTranscriptionFailed(false);
    
    // Auto-transcribe - NON-BLOCKING (continue even if it fails)
    let transcriptionResult: string | null = null;
    
    // Try Bariba STT first
    try {
      console.log('[TamTamCreatePost] Trying Bariba STT...');
      const result = await baribaSTT.transcribe(base64);
      if (result?.transcription) {
        transcriptionResult = result.transcription;
        console.log('[TamTamCreatePost] Bariba STT success:', transcriptionResult);
      }
    } catch (err: any) {
      console.warn('[TamTamCreatePost] Bariba STT failed:', err.message);
    }

    // Fallback to French STT if Bariba failed
    if (!transcriptionResult) {
      try {
        console.log('[TamTamCreatePost] Trying French STT fallback...');
        // French STT uses Web Speech API which needs a different approach
        // For now, just mark as failed and continue
        console.log('[TamTamCreatePost] French STT not available for base64 audio');
      } catch (err: any) {
        console.warn('[TamTamCreatePost] French STT fallback failed:', err.message);
      }
    }

    // Set transcript if we got one
    if (transcriptionResult) {
      setTranscript(transcriptionResult);
      toast({
        title: "✅ Transcription réussie",
        description: "Votre audio a été transcrit automatiquement"
      });
      
      // Try translation (also non-blocking)
      try {
        const { byT5TranslationService } = await import('@/services/ByT5TranslationService');
        
        if (currentLang === 'ba') {
          const transResult = await byT5TranslationService.translate(
            transcriptionResult,
            'bariba',
            'french'
          );
          console.log('[TamTamCreatePost] ByT5 Translation:', transResult.translation);
        } else {
          const transResult = await byT5TranslationService.translate(
            transcriptionResult,
            'french',
            'bariba'
          );
          console.log('[TamTamCreatePost] ByT5 Translation:', transResult.translation);
        }
      } catch (transErr) {
        console.warn('[TamTamCreatePost] ByT5 translation error (non-blocking):', transErr);
      }
    } else {
      // Transcription failed - but we can still publish!
      setTranscriptionFailed(true);
      toast({
        title: "⚠️ Transcription non disponible",
        description: "Vous pouvez quand même publier votre audio"
      });
    }
    
    // Always proceed to preview - transcription is optional!
    setStep('preview');
  };

  const handleSubmit = async () => {
    if (!audioBase64) {
      toast({ title: "Audio requis", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload audio to Supabase Storage
      const audioBlob = base64ToBlob(audioBase64, 'audio/webm');
      const audioFileName = `post_${Date.now()}.webm`;
      
      const { data: audioData, error: audioError } = await supabase.storage
        .from('tamtam-audio')
        .upload(audioFileName, audioBlob, { contentType: 'audio/webm' });

      if (audioError) throw audioError;

      const { data: audioUrl } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(audioFileName);

      // Upload media if exists
      let mediaUrl: string | undefined;
      if (mediaFile && mediaPreview) {
        const mediaFileName = `media_${Date.now()}.${mediaFile.name.split('.').pop()}`;
        const { data: mediaData, error: mediaError } = await supabase.storage
          .from('tamtam-audio')
          .upload(mediaFileName, mediaFile);

        if (!mediaError && mediaData) {
          const { data: url } = supabase.storage
            .from('tamtam-audio')
            .getPublicUrl(mediaFileName);
          mediaUrl = url.publicUrl;
        }
      }

      await onSubmit({
        audio_url: audioUrl.publicUrl,
        media_type: selectedType,
        media_url: mediaUrl,
        transcript_fr: currentLang === 'fr' ? transcript : undefined,
        transcript_ba: currentLang === 'ba' ? transcript : undefined,
        feeling_emoji: selectedEmoji || undefined,
        duration_seconds: Math.round(audioBase64.length / 10000) // Rough estimate
      });

      // Reset state
      setAudioBase64(null);
      setMediaFile(null);
      setMediaPreview(null);
      setTranscript('');
      setSelectedEmoji(null);
      setTranscriptionFailed(false);
      setStep('type');
      onClose();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
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
          <h3 className="text-lg font-semibold text-gray-800">
            {t('newPost')}
          </h3>
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
                  {mediaTypes.map(({ type, icon: Icon, label, color }) => (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedType(type);
                        if (type === 'photo' || type === 'video') {
                          fileInputRef.current?.click();
                        } else {
                          setStep('record');
                        }
                      }}
                      className={`p-6 rounded-3xl flex flex-col items-center gap-3 ${
                        selectedType === type 
                          ? `bg-gradient-to-br ${color} text-white shadow-lg` 
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      <Icon className="w-10 h-10" />
                      <span className="font-medium">{t(label)}</span>
                    </motion.button>
                  ))}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={selectedType === 'photo' ? 'image/*' : 'video/*'}
                  capture={selectedType === 'photo' ? 'environment' : undefined}
                  onChange={handleMediaSelect}
                  className="hidden"
                />
              </motion.div>
            )}

            {/* Step 2: Record Audio */}
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
                  <p className="text-gray-500 mb-4">{t('recordAudio')}</p>
                <SmartVoiceRecorder
                  onRecordingComplete={handleRecordingComplete}
                  language={currentLang === 'ba' ? 'bariba' : 'french'}
                />
                </div>
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
                        ? '⚠️ Sans transcription automatique' 
                        : 'Prêt à publier'}
                    </p>
                  </div>
                  <Check className={`w-6 h-6 ${transcriptionFailed ? 'text-amber-500' : 'text-emerald-500'}`} />
                </div>

                {/* Transcript */}
                {transcript ? (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Transcription</p>
                    <p className="text-gray-700">{transcript}</p>
                  </div>
                ) : transcriptionFailed ? (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-sm text-amber-600">
                      La transcription automatique n'est pas disponible. 
                      Votre audio sera publié sans texte.
                    </p>
                  </div>
                ) : null}

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
                        onClick={() => setSelectedEmoji(emoji === selectedEmoji ? null : emoji)}
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

        {/* Footer */}
        {step === 'preview' && (
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={() => setStep('record')}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium"
            >
              Refaire
            </button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  {t('loading')}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  {t('send')}
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
