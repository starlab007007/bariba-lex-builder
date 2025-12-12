import { useState, useEffect, useCallback, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useVoiceDetection } from './useVoiceDetection';

export interface UseSmartRecorderOptions {
  autoMode?: boolean;
  onRecordingComplete: (audioBase64: string) => void;
  onRecordingStart?: () => void;
  minSpeechDuration?: number; // Minimum duration to consider valid (ms)
}

export interface UseSmartRecorderReturn {
  // State
  isRecording: boolean;
  isListening: boolean; // For auto mode: listening for speech
  isSpeaking: boolean;  // For auto mode: speech detected
  isProcessing: boolean;
  duration: number;
  error: string | null;
  autoMode: boolean;
  sensitivity: number;
  
  // Actions
  startManualRecording: () => Promise<void>;
  stopManualRecording: () => Promise<void>;
  toggleAutoMode: () => Promise<void>;
  setAutoMode: (enabled: boolean) => void;
  setSensitivity: (value: number) => void;
  cancel: () => void;
}

export const useSmartRecorder = ({
  autoMode: initialAutoMode = true,
  onRecordingComplete,
  onRecordingStart,
  minSpeechDuration = 500
}: UseSmartRecorderOptions): UseSmartRecorderReturn => {
  const [autoMode, setAutoModeState] = useState(initialAutoMode);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isAutoRecordingRef = useRef(false);
  
  const {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder();
  
  const {
    isDetecting,
    isSpeaking,
    startDetection,
    stopDetection,
    sensitivity,
    setSensitivity,
    onSpeechStart,
    onSpeechEnd
  } = useVoiceDetection();

  // Auto mode: Start recording when speech is detected
  const handleAutoSpeechStart = useCallback(async () => {
    console.log('[useSmartRecorder] Speech detected, starting recording');
    if (!isRecording && isListening) {
      isAutoRecordingRef.current = true;
      await startRecording();
      onRecordingStart?.();
    }
  }, [isRecording, isListening, startRecording, onRecordingStart]);

  // Auto mode: Stop recording when silence is detected
  const handleAutoSpeechEnd = useCallback(async (speechDuration: number) => {
    console.log('[useSmartRecorder] Silence detected after', speechDuration, 'ms');
    if (isRecording && isListening && speechDuration >= minSpeechDuration && isAutoRecordingRef.current) {
      setIsProcessing(true);
      const audioBase64 = await stopRecording();
      setIsProcessing(false);
      isAutoRecordingRef.current = false;
      
      if (audioBase64) {
        console.log('[useSmartRecorder] Auto-sending audio');
        onRecordingComplete(audioBase64);
      }
    }
  }, [isRecording, isListening, minSpeechDuration, stopRecording, onRecordingComplete]);

  // Register VAD callbacks
  useEffect(() => {
    onSpeechStart(handleAutoSpeechStart);
    onSpeechEnd(handleAutoSpeechEnd);
  }, [onSpeechStart, onSpeechEnd, handleAutoSpeechStart, handleAutoSpeechEnd]);

  // Toggle auto listening mode
  const toggleAutoMode = useCallback(async () => {
    if (isListening) {
      console.log('[useSmartRecorder] Stopping auto listening');
      stopDetection();
      if (isRecording) {
        cancelRecording();
      }
      setIsListening(false);
      isAutoRecordingRef.current = false;
    } else if (autoMode) {
      console.log('[useSmartRecorder] Starting auto listening');
      try {
        await startDetection();
        setIsListening(true);
      } catch (err) {
        console.error('[useSmartRecorder] Failed to start detection:', err);
      }
    }
  }, [isListening, autoMode, stopDetection, isRecording, cancelRecording, startDetection]);

  // Manual mode handlers
  const startManualRecording = useCallback(async () => {
    if (!autoMode) {
      await startRecording();
      onRecordingStart?.();
    }
  }, [autoMode, startRecording, onRecordingStart]);

  const stopManualRecording = useCallback(async () => {
    if (!autoMode && isRecording) {
      setIsProcessing(true);
      const audioBase64 = await stopRecording();
      setIsProcessing(false);
      
      if (audioBase64) {
        onRecordingComplete(audioBase64);
      }
    }
  }, [autoMode, isRecording, stopRecording, onRecordingComplete]);

  const setAutoMode = useCallback((enabled: boolean) => {
    // Stop any ongoing recording/listening when switching modes
    if (isListening) {
      stopDetection();
      setIsListening(false);
    }
    if (isRecording) {
      cancelRecording();
    }
    setAutoModeState(enabled);
    isAutoRecordingRef.current = false;
  }, [isListening, isRecording, stopDetection, cancelRecording]);

  const cancel = useCallback(() => {
    if (isListening) {
      stopDetection();
      setIsListening(false);
    }
    if (isRecording) {
      cancelRecording();
    }
    isAutoRecordingRef.current = false;
  }, [isListening, isRecording, stopDetection, cancelRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopDetection();
      }
    };
  }, [isListening, stopDetection]);

  return {
    isRecording,
    isListening,
    isSpeaking,
    isProcessing,
    duration,
    error,
    autoMode,
    sensitivity,
    startManualRecording,
    stopManualRecording,
    toggleAutoMode,
    setAutoMode,
    setSensitivity,
    cancel
  };
};
