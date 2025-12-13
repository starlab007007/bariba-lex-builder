import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseYovoAudioRecorderOptions {
  onRecordingComplete?: (audioUrl: string, duration: number) => void;
}

export function useYovoAudioRecorder(options?: UseYovoAudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
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
      
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accéder au microphone',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const stopRecording = useCallback(async (): Promise<{ url: string; duration: number } | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(null);
        return;
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
        });
        
        setIsRecording(false);
        setIsUploading(true);
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            toast({
              title: 'Erreur',
              description: 'Vous devez être connecté pour enregistrer',
              variant: 'destructive'
            });
            resolve(null);
            return;
          }
          
          const fileName = `${user.id}/${Date.now()}.webm`;
          
          const { data, error } = await supabase.storage
            .from('yovo-audio')
            .upload(fileName, blob, {
              contentType: blob.type,
              upsert: false
            });
          
          if (error) throw error;
          
          const { data: { publicUrl } } = supabase.storage
            .from('yovo-audio')
            .getPublicUrl(data.path);
          
          setAudioUrl(publicUrl);
          setIsUploading(false);
          
          options?.onRecordingComplete?.(publicUrl, finalDuration);
          resolve({ url: publicUrl, duration: finalDuration });
          
        } catch (error) {
          console.error('Error uploading audio:', error);
          toast({
            title: 'Erreur',
            description: 'Impossible de sauvegarder l\'enregistrement',
            variant: 'destructive'
          });
          setIsUploading(false);
          resolve(null);
        }
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.stop();
    });
  }, [options, toast]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setDuration(0);
    chunksRef.current = [];
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
