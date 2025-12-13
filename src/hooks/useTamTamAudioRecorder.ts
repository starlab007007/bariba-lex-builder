import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTamTamAudioRecorderOptions {
  onRecordingComplete?: (audioUrl: string, duration: number) => void;
}

export function useTamTamAudioRecorder(options?: UseTamTamAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
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

    } catch (err) {
      console.error('Error starting recording:', err);
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

        // Create blob
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        if (audioBlob.size < 1000) {
          setIsRecording(false);
          resolve(null);
          return;
        }

        // Upload to Supabase Storage
        setIsUploading(true);
        try {
          const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
          const filePath = `recordings/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('tamtam-audio')
            .upload(filePath, audioBlob, {
              contentType: 'audio/webm',
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
        } catch (err) {
          console.error('Error uploading audio:', err);
          setIsUploading(false);
          setIsRecording(false);
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
  }, []);

  return {
    isRecording,
    isUploading,
    duration,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    reset
  };
}
