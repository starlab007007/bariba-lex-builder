import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceDetectionReturn {
  isDetecting: boolean;
  isSpeaking: boolean;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  onSpeechStart: (callback: () => void) => void;
  onSpeechEnd: (callback: (duration: number) => void) => void;
  sensitivity: number;
  setSensitivity: (value: number) => void;
}

export const useVoiceDetection = (): UseVoiceDetectionReturn => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sensitivity, setSensitivity] = useState(50); // 0-100

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const speechStartCallbackRef = useRef<(() => void) | null>(null);
  const speechEndCallbackRef = useRef<((duration: number) => void) | null>(null);
  
  const speechStartTimeRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  
  // VAD parameters
  const SILENCE_DURATION = 1500; // 1.5 seconds of silence to end speech
  const MIN_SPEECH_DURATION = 300; // Minimum 300ms of speech to be valid

  const onSpeechStart = useCallback((callback: () => void) => {
    speechStartCallbackRef.current = callback;
  }, []);

  const onSpeechEnd = useCallback((callback: (duration: number) => void) => {
    speechEndCallbackRef.current = callback;
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    
    // Threshold based on sensitivity (higher sensitivity = lower threshold)
    const threshold = 30 - (sensitivity / 100) * 25; // Range: 5-30

    const isCurrentlySpeaking = average > threshold;

    if (isCurrentlySpeaking) {
      // Speech detected
      if (!isSpeaking) {
        setIsSpeaking(true);
        speechStartTimeRef.current = Date.now();
        speechStartCallbackRef.current?.();
      }

      // Clear silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    } else {
      // Silence detected
      if (isSpeaking && !silenceTimeoutRef.current) {
        // Start silence timeout
        silenceTimeoutRef.current = window.setTimeout(() => {
          const speechDuration = speechStartTimeRef.current 
            ? Date.now() - speechStartTimeRef.current 
            : 0;

          if (speechDuration >= MIN_SPEECH_DURATION) {
            speechEndCallbackRef.current?.(speechDuration);
          }

          setIsSpeaking(false);
          speechStartTimeRef.current = null;
          silenceTimeoutRef.current = null;
        }, SILENCE_DURATION);
      }
    }

    // Continue analyzing
    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, [isSpeaking, sensitivity]);

  const startDetection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsDetecting(true);
      animationRef.current = requestAnimationFrame(analyzeAudio);

    } catch (error) {
      console.error('Error starting voice detection:', error);
      throw error;
    }
  }, [analyzeAudio]);

  const stopDetection = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsDetecting(false);
    setIsSpeaking(false);
    speechStartTimeRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isDetecting,
    isSpeaking,
    startDetection,
    stopDetection,
    onSpeechStart,
    onSpeechEnd,
    sensitivity,
    setSensitivity
  };
};
