import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mic, Video, Camera, Check, Play, Pause, 
  RotateCcw, Volume2, VolumeX, Send, Loader2,
  SplitSquareVertical, Maximize2, ArrowLeft
} from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OriginalPost {
  id: string;
  audio_url: string;
  media_url?: string;
  transcript_fr?: string;
  transcript_ba?: string;
  user_name?: string;
  user_avatar?: string;
}

interface DuoModeProps {
  isOpen: boolean;
  onClose: () => void;
  originalPost: OriginalPost;
  onComplete: (data: {
    audio_url: string;
    media_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    response_to_post_id: string;
    duration_seconds: number;
  }) => Promise<void>;
}

type SplitLayout = 'vertical' | 'horizontal' | 'pip';

export const DuoMode: React.FC<DuoModeProps> = ({
  isOpen,
  onClose,
  originalPost,
  onComplete
}) => {
  const { currentLang } = useTamTamLanguage();
  const { toast } = useToast();

  // States
  const [phase, setPhase] = useState<'preview' | 'record' | 'review'>('preview');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [layout, setLayout] = useState<SplitLayout>('vertical');
  const [isOriginalPlaying, setIsOriginalPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [syncOffset, setSyncOffset] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Refs
  const originalVideoRef = useRef<HTMLVideoElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize camera
  useEffect(() => {
    if (isOpen && phase !== 'review') {
      initCamera();
    }
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, phase, isFrontCamera]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? 'user' : 'environment' },
        audio: true
      });
      streamRef.current = stream;
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('[DuoMode] Camera error:', err);
      toast({ title: "Erreur caméra", variant: "destructive" });
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const flipCamera = () => {
    stopStream();
    setIsFrontCamera(!isFrontCamera);
  };

  const playOriginal = () => {
    const mediaElement = originalPost.media_url 
      ? originalVideoRef.current 
      : originalAudioRef.current;
    
    if (mediaElement) {
      if (isOriginalPlaying) {
        mediaElement.pause();
      } else {
        mediaElement.currentTime = 0;
        mediaElement.play();
      }
      setIsOriginalPlaying(!isOriginalPlaying);
    }
  };

  const startDuoRecording = async () => {
    if (!streamRef.current) {
      await initCamera();
    }

    try {
      // Start playing original
      const mediaElement = originalPost.media_url 
        ? originalVideoRef.current 
        : originalAudioRef.current;
      
      if (mediaElement) {
        mediaElement.currentTime = 0;
        mediaElement.play();
        setIsOriginalPlaying(true);
      }

      // Start recording user
      const mediaRecorder = new MediaRecorder(streamRef.current!, {
        mimeType: 'video/webm'
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setPhase('review');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Timer for duration and progress
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(elapsed);
        
        // Max 60 seconds
        if (elapsed >= 60) {
          stopDuoRecording();
        }
      }, 100);

      setPhase('record');
      triggerFeedback('notification');
    } catch (err) {
      console.error('[DuoMode] Recording error:', err);
      toast({ title: "Erreur d'enregistrement", variant: "destructive" });
    }
  };

  const stopDuoRecording = () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Stop original media
    const mediaElement = originalPost.media_url 
      ? originalVideoRef.current 
      : originalAudioRef.current;
    if (mediaElement) {
      mediaElement.pause();
      setIsOriginalPlaying(false);
    }

    // Stop recording
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    triggerFeedback('success');
  };

  const handleSubmit = async () => {
    if (!recordedBlob) return;
    
    setIsSubmitting(true);

    try {
      const fileName = `duo_${originalPost.id}_${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, recordedBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      await onComplete({
        audio_url: urlData.publicUrl,
        media_url: urlData.publicUrl,
        response_to_post_id: originalPost.id,
        duration_seconds: Math.floor(recordingDuration)
      });

      toast({ title: "✅ Duo publié !" });
      handleClose();
    } catch (err: any) {
      console.error('[DuoMode] Submit error:', err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordedBlob(null);
    setPhase('preview');
    setIsRecording(false);
    onClose();
  };

  const retryRecording = () => {
    setRecordedBlob(null);
    setPhase('preview');
    setRecordingDuration(0);
  };

  if (!isOpen) return null;

  const hasVideo = !!originalPost.media_url;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30">
        <div className="ios-glass-dark mx-3 mt-3 rounded-2xl px-4 py-3 flex items-center justify-between">
          <button onClick={handleClose} className="p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="w-5 h-5 text-primary" />
            <span className="text-white font-medium">
              {currentLang === 'ba' ? 'Duo kpindu' : 'Mode Duo'}
            </span>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500">
              <div className="w-2 h-2 rounded-full bg-white rec-indicator" />
              <span className="text-white text-sm">{recordingDuration.toFixed(1)}s</span>
            </div>
          )}
          
          {!isRecording && <div className="w-16" />}
        </div>
      </div>

      {/* Layout selector */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {(['vertical', 'horizontal', 'pip'] as SplitLayout[]).map(l => (
          <motion.button
            key={l}
            whileTap={{ scale: 0.9 }}
            onClick={() => setLayout(l)}
            className={`px-3 py-1.5 rounded-full text-sm ${
              layout === l ? 'bg-primary text-white' : 'bg-white/20 text-white/70'
            }`}
          >
            {l === 'vertical' ? '⬛⬜' : l === 'horizontal' ? '⬛\n⬜' : '🖼️'}
          </motion.button>
        ))}
      </div>

      {/* Split screen container */}
      <div className={`absolute inset-0 pt-28 pb-32 ${
        layout === 'vertical' 
          ? 'flex flex-row' 
          : layout === 'horizontal' 
            ? 'flex flex-col' 
            : 'relative'
      }`}>
        {/* Original content */}
        <div className={`relative ${
          layout === 'vertical' 
            ? 'w-1/2 h-full' 
            : layout === 'horizontal' 
              ? 'w-full h-1/2' 
              : 'absolute inset-0'
        } bg-gray-900 overflow-hidden`}>
          {hasVideo ? (
            <video
              ref={originalVideoRef}
              src={originalPost.media_url}
              className="w-full h-full object-cover"
              muted={isMuted}
              loop
              playsInline
            />
          ) : (
            <>
              <audio
                ref={originalAudioRef}
                src={originalPost.audio_url}
                loop
              />
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                <motion.div
                  animate={isOriginalPlaying ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center"
                >
                  <Volume2 className="w-10 h-10 text-white" />
                </motion.div>
                {originalPost.transcript_fr && (
                  <p className="mt-4 text-white/80 text-sm text-center px-4 max-w-[200px]">
                    "{originalPost.transcript_fr.slice(0, 50)}..."
                  </p>
                )}
              </div>
            </>
          )}
          
          {/* Original label */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/50 text-white text-xs">
            {originalPost.user_name || 'Original'}
          </div>
        </div>

        {/* User camera / recorded video */}
        <div className={`relative ${
          layout === 'vertical' 
            ? 'w-1/2 h-full' 
            : layout === 'horizontal' 
              ? 'w-full h-1/2' 
              : 'absolute bottom-4 right-4 w-32 h-48 rounded-xl overflow-hidden border-2 border-white/30 shadow-xl'
        } bg-gray-900 overflow-hidden`}>
          {phase === 'review' && recordedBlob ? (
            <video
              ref={recordedVideoRef}
              src={URL.createObjectURL(recordedBlob)}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <video
              ref={userVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: isFrontCamera ? 'scaleX(-1)' : 'none' }}
            />
          )}
          
          {/* Your label */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-primary/80 text-white text-xs">
            {currentLang === 'ba' ? 'Ìwọ' : 'Vous'}
          </div>
        </div>

        {/* Divider line */}
        {layout !== 'pip' && (
          <div className={`absolute ${
            layout === 'vertical' 
              ? 'left-1/2 top-0 bottom-0 w-0.5' 
              : 'top-1/2 left-0 right-0 h-0.5'
          } bg-white/30`} />
        )}
      </div>

      {/* Side controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={flipCamera}
          className="ios-float-button w-10 h-10 rounded-full flex items-center justify-center"
        >
          <RotateCcw className="w-5 h-5 text-white" />
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted(!isMuted)}
          className="ios-float-button w-10 h-10 rounded-full flex items-center justify-center"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </motion.button>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-4">
        <div className="ios-glass-dark mx-3 rounded-2xl p-4">
          {phase === 'preview' && (
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={playOriginal}
                className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
              >
                {isOriginalPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-1" />
                )}
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={startDuoRecording}
                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center border-4 border-white/30"
              >
                <div className="w-14 h-14 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
                  <SplitSquareVertical className="w-6 h-6 text-white" />
                </div>
              </motion.button>
              
              <div className="w-14" />
            </div>
          )}

          {phase === 'record' && (
            <div className="flex items-center justify-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={stopDuoRecording}
                className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white"
              >
                <div className="w-8 h-8 rounded-sm bg-red-500" />
              </motion.button>
            </div>
          )}

          {phase === 'review' && (
            <div className="flex items-center justify-between">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={retryRecording}
                className="px-4 py-2 bg-white/20 rounded-full text-white flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{currentLang === 'ba' ? 'Tún' : 'Refaire'}</span>
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-primary rounded-full text-white font-medium flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{currentLang === 'ba' ? 'Tẹ̀jáde' : 'Publier'}</span>
                  </>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DuoMode;
