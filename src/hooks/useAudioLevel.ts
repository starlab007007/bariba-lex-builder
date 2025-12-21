/**
 * useAudioLevel - Hook pour mesurer le niveau audio du microphone en temps réel
 * Utilise Web Audio API pour analyser le volume
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioLevelReturn {
  level: number; // 0-100
  isActive: boolean;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  isSpeaking: boolean; // true si le niveau est suffisant
}

export const useAudioLevel = (threshold = 15): UseAudioLevelReturn => {
  const [level, setLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const stopMonitoring = useCallback(() => {
    console.log('[useAudioLevel] Stopping monitoring');
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsActive(false);
    setLevel(0);
    setIsSpeaking(false);
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      console.log('[useAudioLevel] Starting audio level monitoring');
      
      // Stop any existing monitoring
      stopMonitoring();
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      // Create audio context and analyser
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsActive(true);
      
      // Start monitoring loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Normalize to 0-100
        const normalizedLevel = Math.min(100, Math.round((average / 128) * 100));
        
        setLevel(normalizedLevel);
        setIsSpeaking(normalizedLevel >= threshold);
        
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      console.log('[useAudioLevel] Monitoring started successfully');
      
    } catch (error) {
      console.error('[useAudioLevel] Error starting monitoring:', error);
      stopMonitoring();
    }
  }, [threshold, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    level,
    isActive,
    startMonitoring,
    stopMonitoring,
    isSpeaking
  };
};
