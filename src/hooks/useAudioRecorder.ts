import { useState, useRef, useCallback, useEffect } from 'react';
import { getSupportedAudioMimeType, getAudioBlobType, getRecorderTimeslice } from '@/lib/audioMimeUtils';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<MediaStream | null>;
  stopRecording: () => Promise<string | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  getAudioBase64: () => Promise<string | null>;
  getStream: () => MediaStream | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Expose the current stream for sharing with useAudioLevel
  const getStream = useCallback((): MediaStream | null => {
    return streamRef.current;
  }, []);

  const startRecording = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Relaxed constraints with `ideal` + fallback to bare `{ audio: true }`
      // for old Android / Safari iOS that throw OverconstrainedError otherwise.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: { ideal: 16000 },
            channelCount: { ideal: 1 },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...({
              googHighpassFilter: true,
              googTypingNoiseDetection: true,
              googAudioMirroring: false,
            } as any),
          }
        });
      } catch (constraintErr: any) {
        console.warn('[useAudioRecorder] constraints rejected, retrying with { audio: true }', constraintErr?.name);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;
      chunksRef.current = [];

      // Safe MediaRecorder construction — fall back to browser default
      // if the chosen mimeType is rejected (Safari iOS < 14.5, etc.).
      const mimeType = getSupportedAudioMimeType();
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch (mrErr) {
        console.warn('[useAudioRecorder] MediaRecorder mimeType rejected, using default', mrErr);
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log('[useAudioRecorder] Chunk received:', e.data.size, 'bytes, total chunks:', chunksRef.current.length);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: getAudioBlobType() });
        const url = URL.createObjectURL(blob);
        console.log('[useAudioRecorder] Recording stopped, blob size:', blob.size, 'bytes');
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob: blob,
          audioUrl: url,
        }));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(getRecorderTimeslice());

      // Start duration timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTime) / 1000)
        }));
      }, 1000);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
      }));

      // Return stream for sharing with useAudioLevel
      return stream;

    } catch (error: any) {
      console.error('Error starting recording:', error);
      let friendly = error?.message || 'Impossible d\'accéder au microphone';
      const name = error?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        friendly = 'Micro refusé. Active l\'autorisation micro dans les réglages du navigateur.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        friendly = 'Aucun micro détecté sur cet appareil.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        friendly = 'Le micro est utilisé par une autre application. Ferme-la et réessaye.';
      } else if (name === 'OverconstrainedError') {
        friendly = 'Micro non compatible avec les réglages demandés.';
      }
      setState(prev => ({ ...prev, error: friendly }));
      return null;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) {
        // Request final chunk before stopping
        try { recorder.requestData(); } catch (_) { /* not all browsers support */ }

        // Override onstop to do BOTH: update state (audioBlob/audioUrl) AND resolve base64
        recorder.onstop = async () => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          if (chunksRef.current.length > 0) {
            const blob = new Blob(chunksRef.current, { type: getAudioBlobType() });
            const url = URL.createObjectURL(blob);
            console.log('[useAudioRecorder] Created blob:', blob.size, 'bytes from', chunksRef.current.length, 'chunks');
            // CRITICAL: update state so audioBlob is available for the consumer
            setState(prev => ({
              ...prev,
              isRecording: false,
              isPaused: false,
              audioBlob: blob,
              audioUrl: url,
            }));
            const base64 = await blobToBase64(blob);
            console.log('[useAudioRecorder] Base64 length:', base64.length);
            resolve(base64);
          } else {
            console.warn('[useAudioRecorder] No chunks available');
            setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
            resolve(null);
          }
        };

        // If paused, must resume briefly so stop() flushes data on some browsers
        if (recorder.state === 'paused') {
          try { recorder.resume(); } catch (_) {}
        }
        recorder.stop();
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setState(prev => ({ ...prev, isRecording: false, isPaused: false }));
        resolve(null);
      }
    });
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isRecording, state.isPaused]);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    chunksRef.current = [];

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
    });
  }, [state.isRecording]);

  const getAudioBase64 = useCallback(async (): Promise<string | null> => {
    if (!state.audioBlob) return null;
    return await blobToBase64(state.audioBlob);
  }, [state.audioBlob]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    getAudioBase64,
    getStream,
  };
};

// Helper function to convert Blob to Base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
