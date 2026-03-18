import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Camera, Image, Send, Loader2, Volume2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TamTamStoryCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

export const TamTamStoryCreator: React.FC<TamTamStoryCreatorProps> = ({
  isOpen,
  onClose,
  onStoryCreated
}) => {
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      tamtamFeedback.play('record');
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
      
      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
        description: currentLang === 'ba' ? 'Kò lè bẹ̀rẹ̀ ìgbàsílẹ̀' : 'Impossible de démarrer l\'enregistrement',
        variant: 'destructive'
      });
    }
  }, [currentLang, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      tamtamFeedback.play('success');
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      tamtamFeedback.play('success');
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (!audioBlob) {
      toast({
        title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
        description: currentLang === 'ba' ? 'Jọ̀wọ́ ṣe ìgbàsílẹ̀ ohùn kan' : 'Veuillez enregistrer un audio',
        variant: 'destructive'
      });
      return;
    }
    
    setIsUploading(true);
    tamtamFeedback.play('send');
    
    try {
      const timestamp = Date.now();
      
      // Upload audio
      const audioFileName = `stories/audio_${timestamp}.webm`;
      const { error: audioError } = await supabase.storage
        .from('tamtam-audio')
        .upload(audioFileName, audioBlob);
      
      if (audioError) throw audioError;
      
      const { data: audioUrlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(audioFileName);
      
      // Upload photo if exists
      let photoUrl = null;
      if (photoFile) {
        const photoFileName = `stories/photo_${timestamp}.${photoFile.name.split('.').pop()}`;
        const { error: photoError } = await supabase.storage
          .from('tamtam-audio')
          .upload(photoFileName, photoFile);
        
        if (!photoError) {
          const { data: photoUrlData } = supabase.storage
            .from('tamtam-audio')
            .getPublicUrl(photoFileName);
          photoUrl = photoUrlData.publicUrl;
        }
      }
      
      // Calculate expiration (24 hours from now)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      // Insert story
      const { error: insertError } = await supabase
        .from('tamtam_stories')
        .insert({
          audio_url: audioUrlData.publicUrl,
          photo_url: photoUrl,
          duration_seconds: recordingDuration,
          expires_at: expiresAt,
        });
      
      if (insertError) throw insertError;
      
      toast({
        title: currentLang === 'ba' ? 'Ìtàn ti jáde!' : 'Story publiée !',
        description: currentLang === 'ba' ? 'Ìtàn rẹ yóò wà fún wákàtí 24' : 'Votre story sera visible pendant 24h',
      });
      
      // Speak confirmation
      speakCurrentLang(currentLang === 'ba' 
        ? 'Ìtàn rẹ ti jáde!'
        : 'Votre story a été publiée!'
      );
      
      onStoryCreated();
      onClose();
      
    } catch (error) {
      console.error('Error publishing story:', error);
      toast({
        title: currentLang === 'ba' ? 'Àṣìṣe' : 'Erreur',
        description: currentLang === 'ba' ? 'Kò lè fi ìtàn sílẹ̀' : 'Impossible de publier la story',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, photoFile, recordingDuration, currentLang, toast, speakCurrentLang, onStoryCreated, onClose]);

  const handleClose = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRecordingDuration(0);
    onClose();
  }, [isRecording, stopRecording, onClose]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-white font-bold text-lg">
              {currentLang === 'ba' ? 'Ṣẹ̀dá Ìtàn' : 'Créer une Story'}
            </h2>
            <div className="w-10" />
          </div>

          {/* Photo Preview */}
          <div className="flex-1 flex items-center justify-center relative">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Story preview" 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-64 h-64 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center gap-4">
                <Camera className="w-16 h-16 text-white/60" />
                <p className="text-white/60 text-center px-4">
                  {currentLang === 'ba' ? 'Fi àwòrán kun (kò pọn dandan)' : 'Ajoutez une photo (optionnel)'}
                </p>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <motion.div
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 px-4 py-2 rounded-full flex items-center gap-2"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <div className="w-3 h-3 rounded-full bg-white" />
                <span className="text-white font-bold">{formatDuration(recordingDuration)}</span>
              </motion.div>
            )}
          </div>

          {/* Audio Preview */}
          {audioUrl && !isRecording && (
            <div className="px-4 py-2">
              <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4">
                <button
                  onClick={() => {
                    const audio = new Audio(audioUrl);
                    audio.play();
                  }}
                  className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <Volume2 className="w-6 h-6 text-white" />
                </button>
                <div className="flex-1">
                  <p className="text-white font-medium">
                    {currentLang === 'ba' ? 'Ohùn rẹ' : 'Votre audio'}
                  </p>
                  <p className="text-white/60 text-sm">{formatDuration(recordingDuration)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 space-y-4">
            {/* Photo picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            
            <div className="flex justify-center gap-4">
              {/* Photo button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Image className="w-6 h-6 text-white" />
              </button>

              {/* Record button */}
              <motion.button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isRecording 
                    ? 'bg-red-500' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                {isRecording ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.button>

              {/* Publish button */}
              <button
                onClick={handlePublish}
                disabled={!audioBlob || isUploading}
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  audioBlob && !isUploading
                    ? 'bg-green-500'
                    : 'bg-white/20 opacity-50'
                }`}
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Send className="w-6 h-6 text-white" />
                )}
              </button>
            </div>

            {/* Instructions */}
            <p className="text-white/60 text-center text-sm">
              {isRecording 
                ? (currentLang === 'ba' ? 'Ń gbàsílẹ̀... Tẹ láti dúró' : 'Enregistrement... Appuyez pour arrêter')
                : audioBlob
                  ? (currentLang === 'ba' ? 'Tẹ ➤ láti fi ìtàn sílẹ̀' : 'Appuyez ➤ pour publier')
                  : (currentLang === 'ba' ? 'Tẹ 🎤 láti bẹ̀rẹ̀' : 'Appuyez 🎤 pour commencer')
              }
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
