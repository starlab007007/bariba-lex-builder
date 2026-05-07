import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Cross-browser audio MIME type detection
const getSupportedAudioMimeType = (): string | undefined => {
  const types = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type));
};

const getAudioFileExtension = (mimeType: string): string => {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
};

interface UseTamTamAudioRecorderOptions {
  onRecordingComplete?: (audioUrl: string, duration: number) => void;
}

export function useTamTamAudioRecorder(options?: UseTamTamAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('audio/webm');

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect supported MIME type for cross-browser compatibility
      const mimeType = getSupportedAudioMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      console.log('[useTamTamAudioRecorder] Using mimeType:', mimeType || 'browser default');
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mimeTypeRef.current = mediaRecorder.mimeType || mimeType || 'audio/webm';
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // Update duration every second
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (err: any) {
      console.error('Error starting recording:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permission micro refusée. Autorisez l\'accès dans les paramètres.');
      } else if (err.name === 'NotFoundError') {
        setError('Aucun microphone détecté.');
      } else if (err.name === 'NotSupportedError') {
        setError('Enregistrement non supporté sur ce navigateur.');
      } else {
        setError(err.message || 'Erreur lors de l\'enregistrement');
      }
      throw err;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;
      
      mediaRecorder.onstop = async () => {
        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        // Create blob with correct MIME type
        const mimeType = mimeTypeRef.current;
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        console.log('[useTamTamAudioRecorder] Recording stopped:', { 
          mimeType, 
          size: audioBlob.size, 
          duration: finalDuration 
        });
        
        if (audioBlob.size < 1000) {
          setIsRecording(false);
          setError('Enregistrement trop court');
          resolve(null);
          return;
        }

        // Upload to Supabase Storage
        setIsUploading(true);
        try {
          const extension = getAudioFileExtension(mimeType);
          const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
          const filePath = `recordings/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('tamtam-audio')
            .upload(filePath, audioBlob, {
              contentType: mimeType,
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('tamtam-audio')
            .getPublicUrl(filePath);

          setAudioUrl(publicUrl);
          setIsRecording(false);
          setIsUploading(false);
          
          options?.onRecordingComplete?.(publicUrl, finalDuration);
          resolve(publicUrl);
        } catch (err: any) {
          console.error('Error uploading audio:', err);
          setIsUploading(false);
          setIsRecording(false);
          setError(err.message || 'Erreur lors de l\'upload');
          reject(err);
        }
      };

      mediaRecorder.stop();
    });
  }, [options]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    
    chunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
  }, []);

  const reset = useCallback(() => {
    setAudioUrl(null);
    setDuration(0);
    setError(null);
  }, []);

  return {
    isRecording,
    isUploading,
    duration,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset
  };
}
