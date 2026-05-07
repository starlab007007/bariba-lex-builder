/**
 * RadioVillageProTemplate.tsx
 * Template audio-first premium - Radio Village Pro v2.0
 * Workflow 4 étapes: Audio → Photos → Style → Processing
 * Support bilingue FR/Bariba complet
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Upload, Play, Pause,
  ChevronRight, SkipForward, RefreshCw,
  User, Building, Camera, X, Check, Loader2,
  Volume2, Sparkles, BookOpen, Megaphone, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  radioVillageStyles, 
  radioVillageLabels, 
  processingSteps,
  type RadioVillageStyle 
} from '@/data/RadioVillageProData';
import { templateVideoCache } from '@/services/TemplateVideoCache';

// ==========================================
// TYPES
// ==========================================

type Step = 'audio' | 'photos' | 'style' | 'processing';
type Language = 'fr' | 'bariba';

interface RadioVillageProTemplateProps {
  onComplete: (videoBlob: Blob, metadata: VideoMetadata) => void;
  onBack?: () => void;
  language?: Language;
}

interface VideoMetadata {
  duration: number;
  style: string;
  hasPortrait: boolean;
  hasVillage: boolean;
  hasContext: boolean;
  language: Language;
}

// ==========================================
// STYLE ICONS MAPPING
// ==========================================

const styleIcons: Record<string, React.ReactNode> = {
  sagesse: <Sparkles className="w-8 h-8" />,
  histoire: <BookOpen className="w-8 h-8" />,
  actualite: <Megaphone className="w-8 h-8" />,
  celebration: <PartyPopper className="w-8 h-8" />
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export const RadioVillageProTemplate: React.FC<RadioVillageProTemplateProps> = ({
  onComplete,
  onBack,
  language = 'fr'
}) => {
  // Get labels for current language
  const labels = radioVillageLabels[language];
  const styles = Object.values(radioVillageStyles);

  // State
  const [currentStep, setCurrentStep] = useState<Step>('audio');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [photoPortrait, setPhotoPortrait] = useState<string | null>(null);
  const [photoVillage, setPhotoVillage] = useState<string | null>(null);
  const [photoContext, setPhotoContext] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState<string>('sagesse');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // ✅ NEW: Debug info for diagnostics
  const [debugInfo, setDebugInfo] = useState<Record<string, any> | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const maxDuration = 60;
  const minDuration = 30;

  // Cleanup
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);
  
  // ==========================================
  // UTILITY: Get accurate audio duration (handles Infinity)
  // ==========================================
  
  const getAccurateAudioDuration = useCallback(async (blob: Blob, url: string): Promise<number> => {
    console.log('🎵 Getting accurate audio duration...');
    
    // Method 1: AudioContext (most reliable)
    try {
      const audioCtx = new AudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      audioCtx.close();
      
      if (isFinite(duration) && duration > 0) {
        console.log('✅ AudioContext duration:', duration);
        return duration;
      }
    } catch (e) {
      console.warn('⚠️ AudioContext decode failed:', e);
    }
    
    // Method 2: Audio element with seek trick
    return new Promise((resolve) => {
      const audio = new Audio(url);
      
      const handleMetadata = () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          console.log('✅ Audio element duration:', audio.duration);
          cleanup();
          resolve(audio.duration);
        } else {
          // Infinity duration - use seek trick
          console.log('⏳ Using seek trick for Infinity duration...');
          audio.currentTime = 1e101;
        }
      };
      
      const handleTimeUpdate = () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          console.log('✅ Duration after seek:', audio.duration);
          audio.currentTime = 0;
          cleanup();
          resolve(audio.duration);
        }
      };
      
      const handleError = () => {
        console.warn('⚠️ Audio element error');
        cleanup();
        resolve(30); // Fallback to min duration
      };
      
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('durationchange', handleTimeUpdate);
        audio.removeEventListener('error', handleError);
      };
      
      audio.addEventListener('loadedmetadata', handleMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('durationchange', handleTimeUpdate);
      audio.addEventListener('error', handleError);
      
      // Timeout fallback
      setTimeout(() => {
        console.warn('⏰ Duration detection timeout');
        cleanup();
        resolve(30);
      }, 5000);
      
      audio.load();
    });
  }, []);

  // ==========================================
  // AUDIO RECORDING
  // ==========================================

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // ✅ FIX: Cross-device audio MIME type detection (iOS/Safari needs audio/mp4)
      const getCompatibleAudioMimeType = (): string => {
        const MR = window.MediaRecorder;
        if (!MR) return 'audio/webm';
        
        // Safari/iOS prefers MP4
        const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (isSafari || isIOS) {
          if (MR.isTypeSupported?.('audio/mp4')) return 'audio/mp4';
        }
        
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg'
        ];
        
        for (const type of types) {
          if (MR.isTypeSupported?.(type)) return type;
        }
        
        return 'audio/webm';
      };
      
      const audioMimeType = getCompatibleAudioMimeType();
      console.log('🎤 Audio recording format:', audioMimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: audioMimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // ✅ Use actual MIME type from recorder
        const blob = new Blob(audioChunksRef.current, { type: audioMimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        console.log('🎵 Audio recorded:', blob.size, 'bytes, type:', audioMimeType);

        // ✅ FIX: Use accurate duration detection (handles Infinity)
        const duration = await getAccurateAudioDuration(blob, url);
        console.log('📏 Accurate duration:', duration);
        setAudioDuration(duration);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      const startTime = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);
        if (elapsed >= maxDuration) stopRecording();
      }, 1000);

      // Audio level visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 255);
        }
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

    } catch (err: any) {
      console.error('Recording error:', err);
      setError(language === 'fr' 
        ? 'Impossible d\'accéder au microphone' 
        : 'Kɛ̀ microphone tɔ́ɔ́ bàn'
      );
    }
  }, [language, isRecording]);

  const stopRecording = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
  }, [isRecording]);

  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setRecordingTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  // ==========================================
  // AUDIO UPLOAD
  // ==========================================

  const handleAudioUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError(language === 'fr' ? 'Fichier trop volumineux (max 50MB)' : 'File trop grand');
      return;
    }

    const url = URL.createObjectURL(file);
    
    // ✅ FIX: Use accurate duration detection
    try {
      const duration = await getAccurateAudioDuration(file, url);
      console.log('📏 Upload duration:', duration);
      
      if (!isFinite(duration) || duration <= 0) {
        setError(language === 'fr' ? 'Durée audio inconnue' : 'Audio duration unknown');
        URL.revokeObjectURL(url);
        return;
      }
      
      if (duration < minDuration) {
        setError(language === 'fr' ? `Audio trop court (min ${minDuration}s)` : `Audio trop court`);
        URL.revokeObjectURL(url);
        return;
      }
      if (duration > maxDuration) {
        setError(language === 'fr' ? `Audio trop long (max ${maxDuration}s)` : `Audio trop long`);
        URL.revokeObjectURL(url);
        return;
      }

      setAudioBlob(file);
      setAudioUrl(url);
      setAudioDuration(duration);
      setError(null);
    } catch (err) {
      console.error('Audio upload error:', err);
      setError(language === 'fr' ? 'Impossible de lire ce fichier' : 'File non valide');
      URL.revokeObjectURL(url);
    }
  }, [language, getAccurateAudioDuration]);

  // ==========================================
  // AUDIO PLAYBACK
  // ==========================================

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [audioUrl, isPlaying]);

  // ==========================================
  // PHOTO UPLOAD
  // ==========================================

  const handlePhotoUpload = useCallback((type: 'portrait' | 'village' | 'context', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(language === 'fr' ? 'Format image non supporté' : 'Format non valide');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(language === 'fr' ? 'Image trop volumineuse (max 10MB)' : 'Image trop grande');
      return;
    }

    const url = URL.createObjectURL(file);
    setError(null);

    switch (type) {
      case 'portrait': setPhotoPortrait(url); break;
      case 'village': setPhotoVillage(url); break;
      case 'context': setPhotoContext(url); break;
    }
  }, [language]);

  const removePhoto = useCallback((type: 'portrait' | 'village' | 'context') => {
    switch (type) {
      case 'portrait':
        if (photoPortrait) URL.revokeObjectURL(photoPortrait);
        setPhotoPortrait(null);
        break;
      case 'village':
        if (photoVillage) URL.revokeObjectURL(photoVillage);
        setPhotoVillage(null);
        break;
      case 'context':
        if (photoContext) URL.revokeObjectURL(photoContext);
        setPhotoContext(null);
        break;
    }
  }, [photoPortrait, photoVillage, photoContext]);

  // ==========================================
  // UTILITY: Load image
  // ==========================================

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  // ==========================================
  // UTILITY: Get compatible video MIME type
  // ==========================================

  const getCompatibleVideoMimeType = useCallback((): string => {
    const MR = window.MediaRecorder;
    if (!MR) return 'video/webm';
    
    // Safari/iOS prefers MP4
    const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (isSafari || isIOS) {
      if (MR.isTypeSupported?.('video/mp4')) return 'video/mp4';
    }
    
    // Prefer VP8 (more compatible) then VP9
    const types = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of types) {
      if (MR.isTypeSupported?.(type)) return type;
    }
    
    return 'video/webm';
  }, []);

  // ==========================================
  // PROCESSING - Real Video Generation
  // ==========================================

  const startProcessing = useCallback(async () => {
    if (!audioBlob || !audioUrl) return;
    
    // ✅ Generate run ID for debugging
    const runId = `rvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    console.log(`🚀 [${runId}] Starting Radio Village Pro generation...`);
    
    // ✅ Validate duration before starting
    if (!isFinite(audioDuration) || audioDuration <= 0) {
      console.error(`❌ [${runId}] Invalid audioDuration:`, audioDuration);
      setError(language === 'fr' 
        ? 'Durée audio invalide. Veuillez réenregistrer.' 
        : 'Audio duration bàn. Sɔ́ɔ̀n tɔ́ɔ́.');
      return;
    }
    
    setDebugInfo(null);
    setProcessingProgress(0);
    setProcessingMessage(language === 'fr' ? 'Préparation...' : 'Sɔ́ɔ̀n tɔ́ɔ́...');

    try {
      // ===== CHECK CACHE FIRST =====
      const cacheKey = await templateVideoCache.generateCacheKey({
        templateId: 'radio_village_pro',
        audioBlob,
        style: selectedStyle,
        photos: [photoPortrait, photoVillage, photoContext],
        language,
        duration: audioDuration
      });
      
      console.log(`🔍 [${runId}] Checking cache for:`, cacheKey);
      
      const cached = await templateVideoCache.get(cacheKey);
      if (cached && cached.blob.size > 1000) { // ✅ Validate cached blob size
        console.log(`✅ [${runId}] Cache hit! Using cached video (${cached.blob.size} bytes)`);
        setProcessingProgress(100);
        setProcessingMessage(language === 'fr' ? 'Vidéo en cache!' : 'Video tɛ̀rɛ̀ cache!');
        
        const metadata: VideoMetadata = {
          duration: audioDuration,
          style: selectedStyle,
          hasPortrait: !!photoPortrait,
          hasVillage: !!photoVillage,
          hasContext: !!photoContext,
          language
        };
        
        setTimeout(() => onComplete(cached.blob, metadata), 500);
        return;
      }
      
      console.log(`💫 [${runId}] No cache, generating new video...`);

      // 1. Create canvas for video rendering
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d')!;

      // 2. Load photos if available
      setProcessingProgress(10);
      setProcessingMessage(language === 'fr' ? 'Chargement des images...' : 'Photos tɔ́ɔ́ bàn...');
      
      const photos: (HTMLImageElement | null)[] = [];
      for (const src of [photoPortrait, photoVillage, photoContext]) {
        if (src) {
          try {
            photos.push(await loadImage(src));
          } catch {
            photos.push(null);
          }
        } else {
          photos.push(null);
        }
      }

      // 3. Prepare audio
      setProcessingProgress(20);
      setProcessingMessage(language === 'fr' ? 'Préparation audio...' : 'Audio sɔ́ɔ̀n...');
      
      const audio = document.createElement('audio');
      audio.src = audioUrl;
      audio.crossOrigin = 'anonymous';
      audio.muted = false;
      audio.volume = 1;

      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Audio load failed'));
        audio.load();
      });

      // 4. Setup MediaRecorder with compatible format
      setProcessingProgress(30);
      setProcessingMessage(language === 'fr' ? 'Configuration vidéo...' : 'Video sɔ́ɔ̀n...');
      
      const mimeType = getCompatibleVideoMimeType();
      console.log(`📹 [${runId}] Using video format:`, mimeType);
      
      // Capture canvas stream at 30fps
      const canvasStream = canvas.captureStream(30);
      
      // ✅ Verify canvas stream has video tracks
      const videoTracks = canvasStream.getVideoTracks();
      console.log(`📹 [${runId}] Canvas video tracks:`, videoTracks.length);
      if (videoTracks.length === 0) {
        throw new Error('Canvas has no video tracks');
      }
      
      // Create audio context to capture audio
      const audioContext = new AudioContext();
      await audioContext.resume(); // ✅ Ensure context is not suspended
      
      const source = audioContext.createMediaElementSource(audio);
      const dest = audioContext.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioContext.destination); // Also play through speakers
      
      // ✅ Verify audio stream has tracks
      const audioTracks = dest.stream.getAudioTracks();
      console.log(`🔊 [${runId}] Audio tracks:`, audioTracks.length);
      
      // Combine canvas video + audio into single stream
      const combinedStream = new MediaStream([
        ...videoTracks,
        ...audioTracks
      ]);
      
      console.log(`📹 [${runId}] Combined stream tracks:`, combinedStream.getTracks().length);

      const chunks: Blob[] = [];
      let chunkCount = 0;
      
      // ✅ Try to create MediaRecorder, with fallback
      let recorder: MediaRecorder;
      let actualMimeType = mimeType;
      
      try {
        recorder = new MediaRecorder(combinedStream, { 
          mimeType,
          videoBitsPerSecond: 2500000 // 2.5 Mbps
        });
      } catch (recorderError) {
        console.warn(`⚠️ [${runId}] MediaRecorder failed with ${mimeType}, trying without mimeType`);
        actualMimeType = '';
        recorder = new MediaRecorder(combinedStream, {
          videoBitsPerSecond: 2500000
        });
        actualMimeType = recorder.mimeType || 'video/webm';
      }
      
      console.log(`📹 [${runId}] MediaRecorder created with mimeType:`, actualMimeType);

      // ✅ FIX: Create Promise for onstop BEFORE starting recorder
      let resolveRecorderStop: (chunks: Blob[]) => void;
      const waitForRecorderStop = new Promise<Blob[]>((resolve) => {
        resolveRecorderStop = resolve;
      });
      
      // ✅ Attach ALL event handlers BEFORE recorder.start()
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          chunkCount++;
          console.log(`📦 [${runId}] Chunk ${chunkCount}: ${e.data.size} bytes`);
        }
      };
      
      recorder.onstop = () => {
        console.log(`🏁 [${runId}] MediaRecorder stopped. Chunks: ${chunks.length}, Total size: ${chunks.reduce((acc, c) => acc + c.size, 0)}`);
        resolveRecorderStop([...chunks]);
      };
      
      recorder.onerror = (e: any) => {
        console.error(`❌ [${runId}] MediaRecorder error:`, e?.error?.message || e);
        setDebugInfo(prev => ({
          ...prev,
          recorderError: e?.error?.message || String(e),
          recorderState: recorder.state
        }));
      };

      // 5. Animation loop - draw frames
      const selectedPresetData = radioVillageStyles[selectedStyle];
      let animationFrame = 0;
      let isRecording = true;

      const drawFrame = () => {
        if (!isRecording) return;
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, selectedPresetData?.colors.primary || '#1a1a2e');
        gradient.addColorStop(1, selectedPresetData?.colors.secondary || '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw photos with Ken Burns effect (subtle zoom/pan)
        const activePhoto = photos.find(p => p !== null);
        if (activePhoto) {
          const scale = 1.05 + Math.sin(animationFrame * 0.01) * 0.05;
          const offsetX = Math.sin(animationFrame * 0.005) * 20;
          const offsetY = Math.cos(animationFrame * 0.007) * 15;
          
          ctx.save();
          ctx.globalAlpha = 0.6;
          const imgAspect = activePhoto.width / activePhoto.height;
          const canvasAspect = canvas.width / canvas.height;
          
          let drawW, drawH;
          if (imgAspect > canvasAspect) {
            drawH = canvas.height * scale;
            drawW = drawH * imgAspect;
          } else {
            drawW = canvas.width * scale;
            drawH = drawW / imgAspect;
          }
          
          const x = (canvas.width - drawW) / 2 + offsetX;
          const y = (canvas.height - drawH) / 2 + offsetY;
          ctx.drawImage(activePhoto, x, y, drawW, drawH);
          ctx.restore();
        }

        // Waveform visualization
        const waveY = canvas.height * 0.5;
        const barCount = 40;
        const barWidth = canvas.width / (barCount * 2);
        
        ctx.fillStyle = selectedPresetData?.colors.accent || '#fbbf24';
        for (let i = 0; i < barCount; i++) {
          const height = 30 + Math.sin((animationFrame + i * 10) * 0.1) * 60 + Math.random() * 20;
          const x = (canvas.width / 2) + (i - barCount / 2) * barWidth * 2;
          ctx.fillRect(x, waveY - height / 2, barWidth, height);
        }

        // Template badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 32px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎙️ Radio Village', canvas.width / 2, 80);
        
        // Style name
        ctx.font = '24px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const styleName = language === 'fr' ? selectedPresetData?.name : selectedPresetData?.nameBariba;
        ctx.fillText(styleName || 'Sagesse', canvas.width / 2, 120);

        animationFrame++;
        if (isRecording) {
          requestAnimationFrame(drawFrame);
        }
      };

      // 6. Start recording and playing with ROBUST audio playback handling
      setProcessingProgress(40);
      setProcessingMessage(language === 'fr' ? 'Génération en cours...' : 'Tɛ̀rɛ̀ tɔ́ɔ́...');
      
      recorder.start(100); // Collect chunks every 100ms
      drawFrame();
      
      // ✅ FIX: Robust audio.play() with fallback for autoplay restrictions
      console.log('🔊 Starting audio playback...');
      let audioStarted = false;
      
      try {
        await audio.play();
        audioStarted = true;
        console.log('✅ Audio playing via audio.play()');
      } catch (playError: any) {
        console.warn('⚠️ audio.play() failed:', playError?.message);
        
        // If autoplay blocked, try AudioContext approach
        if (playError?.name === 'NotAllowedError' || !audioStarted) {
          console.log('🔄 Trying AudioContext fallback...');
          
          try {
            const audioCtx = new AudioContext();
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            const sourceNode = audioCtx.createBufferSource();
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(audioCtx.destination);
            
            // Manually track time for progress
            const startedAt = audioCtx.currentTime;
            const duration = audioBuffer.duration;
            
            sourceNode.start();
            audioStarted = true;
            console.log('✅ Audio playing via AudioContext');
            
            // Override audio events with manual tracking
            audio.dispatchEvent(new Event('play'));
            
            // Simulate currentTime updates
            const timeInterval = setInterval(() => {
              const elapsed = audioCtx.currentTime - startedAt;
              Object.defineProperty(audio, 'currentTime', { value: elapsed, configurable: true });
              Object.defineProperty(audio, 'duration', { value: duration, configurable: true });
              
              if (elapsed >= duration) {
                clearInterval(timeInterval);
                audio.dispatchEvent(new Event('ended'));
              }
            }, 100);
            
          } catch (ctxError) {
            console.error('❌ AudioContext fallback also failed:', ctxError);
            throw new Error(language === 'fr' 
              ? 'Impossible de lire l\'audio. Veuillez réessayer.'
              : 'Audio kɛ̀ bàn. Sɔ́ɔ̀n tɔ́ɔ́.');
          }
        }
      }
      
      if (!audioStarted) {
        throw new Error(language === 'fr' 
          ? 'Impossible de démarrer la génération audio.'
          : 'Audio tɛ̀rɛ̀ kɛ̀ bàn.');
      }

      // 7. Progress updates during recording with timeout safety
      let lastProgressTime = Date.now();
      const progressInterval = setInterval(() => {
        const currentTime = (audio as any).currentTime || 0;
        const duration = (audio as any).duration || audioDuration;
        
        if (currentTime && duration && duration > 0) {
          const progress = 40 + (currentTime / duration) * 50;
          setProcessingProgress(Math.min(90, progress));
          lastProgressTime = Date.now();
          
          const stepIndex = Math.floor((currentTime / duration) * processingSteps.length);
          if (processingSteps[stepIndex]) {
            setProcessingMessage(
              language === 'fr' 
                ? processingSteps[stepIndex].messageFr 
                : processingSteps[stepIndex].messageBa
            );
          }
        }
        
        // ✅ Safety: If no progress for 5s, force complete
        if (Date.now() - lastProgressTime > 5000) {
          console.warn('⚠️ Audio progress stalled, forcing completion');
          audio.dispatchEvent(new Event('ended'));
        }
      }, 500);

      // 8. Wait for audio to finish with PROPER MediaRecorder stop handling
      console.log(`⏳ [${runId}] Waiting for audio (${audioDuration}s)...`);
      
      // ✅ Event handlers already attached above - just use waitForRecorderStop
      
      await Promise.race([
        new Promise<void>((resolve) => {
          audio.onended = async () => {
            console.log(`🏁 [${runId}] Audio ended normally`);
            isRecording = false;
            clearInterval(progressInterval);
            
            // ✅ Request final data before stopping
            if (recorder.state === 'recording' && typeof recorder.requestData === 'function') {
              console.log(`📤 [${runId}] Requesting final data...`);
              recorder.requestData();
              await new Promise(r => setTimeout(r, 200)); // Wait for last chunk
            }
            
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            resolve();
          };
        }),
        // Timeout fallback based on audio duration + 8s buffer
        new Promise<void>((resolve) => {
          setTimeout(async () => {
            console.log(`⏰ [${runId}] Timeout reached, stopping recorder`);
            isRecording = false;
            clearInterval(progressInterval);
            
            if (recorder.state === 'recording') {
              if (typeof recorder.requestData === 'function') {
                recorder.requestData();
                await new Promise(r => setTimeout(r, 200));
              }
              recorder.stop();
            }
            resolve();
          }, (audioDuration + 8) * 1000);
        })
      ]);
      
      // ✅ Wait for recorder.onstop to fire and get final chunks
      const finalChunks = await Promise.race([
        waitForRecorderStop,
        new Promise<Blob[]>((resolve) => setTimeout(() => resolve([...chunks]), 1000))
      ]);
      
      console.log(`📊 [${runId}] Final chunks collected: ${finalChunks.length}`);

      // 9. Create final video blob
      setProcessingProgress(95);
      setProcessingMessage(language === 'fr' ? 'Finalisation...' : 'Kɔ̀rɔ̀ tɔ́ɔ́...');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const videoBlob = new Blob(finalChunks, { type: actualMimeType || mimeType });
      console.log(`✅ [${runId}] Video generated:`, videoBlob.size, 'bytes, type:', actualMimeType || mimeType);

      // Cleanup
      audioContext.close();
      
      // ✅ CRITICAL: Validate blob is not empty
      if (videoBlob.size === 0 || finalChunks.length === 0) {
        console.error(`❌ [${runId}] Video blob is EMPTY!`);
        
        // Store debug info for user
        setDebugInfo({
          runId,
          userAgent: navigator.userAgent,
          mimeType: actualMimeType || mimeType,
          chunksReceived: chunkCount,
          finalChunks: finalChunks.length,
          audioDuration,
          audioSize: audioBlob.size,
          timestamp: new Date().toISOString()
        });
        
        setError(language === 'fr' 
          ? 'La vidéo générée est vide (0 chunk). Veuillez réessayer.' 
          : 'Video tɛ̀rɛ̀ bàn (0 chunk). Sɔ́ɔ̀n tɔ́ɔ́.');
        setCurrentStep('style');
        return;
      }
      
      // ✅ Validate minimum size (at least 10KB)
      if (videoBlob.size < 10000) {
        console.warn(`⚠️ [${runId}] Video blob very small:`, videoBlob.size);
        
        setDebugInfo({
          runId,
          userAgent: navigator.userAgent,
          mimeType: actualMimeType || mimeType,
          blobSize: videoBlob.size,
          chunksReceived: chunkCount,
          audioDuration,
          timestamp: new Date().toISOString()
        });
        
        setError(language === 'fr' 
          ? 'La vidéo générée est trop petite. Veuillez réessayer.' 
          : 'Video tɛ̀rɛ̀ bàn. Sɔ́ɔ̀n tɔ́ɔ́.');
        setCurrentStep('style');
        return;
      }

      // ===== STORE IN CACHE (only valid blobs) =====
      const finalCacheKey = await templateVideoCache.generateCacheKey({
        templateId: 'radio_village_pro',
        audioBlob,
        style: selectedStyle,
        photos: [photoPortrait, photoVillage, photoContext],
        language,
        duration: audioDuration
      });
      
      await templateVideoCache.set(finalCacheKey, videoBlob, {
        duration: audioDuration,
        style: selectedStyle,
        hasPortrait: !!photoPortrait,
        hasVillage: !!photoVillage,
        hasContext: !!photoContext,
        language
      });
      console.log(`💾 [${runId}] Video cached for future use`);

      // 10. Complete
      setProcessingProgress(100);
      setProcessingMessage(language === 'fr' ? 'Terminé!' : 'À tɛ̀rɛ̀!');

      const metadata: VideoMetadata = {
        duration: audioDuration,
        style: selectedStyle,
        hasPortrait: !!photoPortrait,
        hasVillage: !!photoVillage,
        hasContext: !!photoContext,
        language
      };

      console.log(`✅ [${runId}] Generation complete, calling onComplete`);
      setTimeout(() => onComplete(videoBlob, metadata), 500);

    } catch (error: any) {
      console.error(`❌ [${runId}] Video generation failed:`, error);
      
      setDebugInfo({
        runId,
        error: error?.message || String(error),
        userAgent: navigator.userAgent,
        audioDuration,
        timestamp: new Date().toISOString()
      });
      
      setError(language === 'fr' 
        ? 'Erreur lors de la génération vidéo. Veuillez réessayer.' 
        : 'Video tɛ̀rɛ̀ bàn. Sɔ́ɔ̀n tɔ́ɔ́.'
      );
      setCurrentStep('style'); // Go back to style selection
    }
  }, [audioBlob, audioUrl, audioDuration, selectedStyle, photoPortrait, photoVillage, photoContext, language, onComplete, loadImage, getCompatibleVideoMimeType]);

  // ==========================================
  // NAVIGATION
  // ==========================================

  // ✅ FIX: Stricter canProceed validation
  const canProceed = audioBlob && isFinite(audioDuration) && audioDuration >= minDuration && audioDuration <= maxDuration;

  const goToNext = () => {
    switch (currentStep) {
      case 'audio': if (canProceed) setCurrentStep('photos'); break;
      case 'photos': setCurrentStep('style'); break;
      case 'style': setCurrentStep('processing'); startProcessing(); break;
    }
  };

  // ==========================================
  // UTILS
  // ==========================================

  // ✅ FIX: Safe formatTime that handles Infinity/NaN
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '--:--';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepNumber = () => {
    return { audio: 1, photos: 2, style: 3, processing: 4 }[currentStep];
  };

  const selectedPreset = radioVillageStyles[selectedStyle];

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="text-white/70 hover:text-white">
            ← {labels.back}
          </Button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎙️</span>
          <h1 className="text-xl font-bold">{labels.title}</h1>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                step === getStepNumber()
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 scale-110 shadow-lg shadow-orange-500/30"
                  : step < getStepNumber()!
                    ? "bg-green-500"
                    : "bg-white/20"
              )}
            >
              {step < getStepNumber()! ? <Check className="w-4 h-4" /> : step}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm"
          >
            {error}
            
            {/* ✅ NEW: Diagnostic panel for debugging */}
            {debugInfo && (
              <details className="mt-3 border-t border-red-500/20 pt-3">
                <summary className="cursor-pointer text-xs text-red-400 hover:text-red-300">
                  {language === 'fr' ? '🔧 Diagnostic technique' : '🔧 Technical Diagnostic'}
                </summary>
                <div className="mt-2 bg-black/30 rounded p-2 text-xs font-mono text-white/70 max-h-48 overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                    // Simple feedback
                    const btn = document.activeElement as HTMLButtonElement;
                    if (btn) btn.textContent = language === 'fr' ? '✅ Copié!' : '✅ Copied!';
                  }}
                  className="mt-2 px-3 py-1 bg-white/10 rounded text-xs hover:bg-white/20 transition-colors"
                >
                  {language === 'fr' ? '📋 Copier' : '📋 Copy'}
                </button>
              </details>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: AUDIO */}
          {currentStep === 'audio' && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{labels.recordMessage}</h2>
                <p className="text-white/60">{labels.duration}: {minDuration}s - {maxDuration}s</p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                {!audioBlob ? (
                  <div className="space-y-6">
                    {!isRecording ? (
                      <>
                        <button
                          onClick={startRecording}
                          className="w-full py-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-lg shadow-red-500/30"
                        >
                          <Mic className="w-6 h-6" />
                          {labels.recordMessage}
                        </button>

                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-px bg-white/20" />
                          <span className="text-white/40">{language === 'fr' ? 'ou' : 'tàá'}</span>
                          <div className="flex-1 h-px bg-white/20" />
                        </div>

                        <label className="block w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl font-bold text-lg text-center cursor-pointer hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/30">
                          <div className="flex items-center justify-center gap-3">
                            <Upload className="w-6 h-6" />
                            {labels.uploadAudio}
                          </div>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleAudioUpload}
                            className="hidden"
                          />
                        </label>
                      </>
                    ) : (
                      <div className="space-y-6 text-center">
                        {/* Recording visualization */}
                        <div className="relative w-40 h-40 mx-auto">
                          <div
                            className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
                            style={{ animationDuration: '1.5s' }}
                          />
                          <div
                            className="absolute inset-2 rounded-full bg-red-500/30 transition-transform"
                            style={{ transform: `scale(${1 + audioLevel * 0.3})` }}
                          />
                          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-red-500/50">
                            <Mic className="w-12 h-12 text-white" />
                          </div>
                        </div>

                        <div className="text-4xl font-mono font-bold text-red-400">
                          {formatTime(recordingTime)} / {formatTime(maxDuration)}
                        </div>

                        <button
                          onClick={stopRecording}
                          className="py-4 px-8 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
                        >
                          <Square className="w-5 h-5 fill-current" />
                          {labels.stop}
                        </button>

                        {recordingTime >= minDuration && (
                          <p className="text-green-400 text-sm">✓ {labels.minimumReached}</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Check className="w-10 h-10 text-white" />
                    </div>

                    <div>
                      <p className="text-xl font-bold text-green-400">{labels.audioRecorded}</p>
                      <p className="text-white/60 mt-1">{labels.duration}: {formatTime(audioDuration)}</p>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={togglePlayback}
                        className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                      </button>
                      <Volume2 className="w-5 h-5 text-white/40" />
                    </div>

                    <button
                      onClick={resetRecording}
                      className="py-3 px-6 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {labels.reRecord}
                    </button>
                  </div>
                )}
              </div>

              {canProceed && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button
                    onClick={goToNext}
                    className="w-full py-6 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-lg rounded-2xl hover:scale-[1.02] transition-transform"
                  >
                    {labels.continue}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* STEP 2: PHOTOS */}
          {currentStep === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{labels.addPhotos}</h2>
                <p className="text-white/60">{labels.optional}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { type: 'portrait' as const, icon: <User className="w-8 h-8" />, label: labels.portrait, photo: photoPortrait },
                  { type: 'village' as const, icon: <Building className="w-8 h-8" />, label: labels.village, photo: photoVillage },
                  { type: 'context' as const, icon: <Camera className="w-8 h-8" />, label: labels.context, photo: photoContext }
                ].map(({ type, icon, label, photo }) => (
                  <div key={type} className="relative aspect-square">
                    <label className={cn(
                      "absolute inset-0 rounded-2xl border-2 border-dashed cursor-pointer transition-all overflow-hidden",
                      photo ? "border-green-400" : "border-white/30 hover:border-white/50 hover:bg-white/5"
                    )}>
                      {photo ? (
                        <img src={photo} alt={label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-white/60">
                          {icon}
                          <span className="text-xs text-center px-2">{label}</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(type, e)}
                        className="hidden"
                      />
                    </label>
                    {photo && (
                      <button
                        onClick={() => removePhoto(type)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={goToNext}
                  className="flex-1 py-6 border-white/20 text-white hover:bg-white/10"
                >
                  <SkipForward className="w-5 h-5 mr-2" />
                  {labels.skip}
                </Button>
                <Button
                  onClick={goToNext}
                  className="flex-1 py-6 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold"
                >
                  {labels.continue}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: STYLE */}
          {currentStep === 'style' && (
            <motion.div
              key="style"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">{labels.chooseStyle}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {styles.map(style => (
                  <motion.button
                    key={style.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedStyle(style.id)}
                    className={cn(
                      "relative p-6 rounded-2xl border-2 transition-all text-left overflow-hidden",
                      selectedStyle === style.id
                        ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20"
                        : "border-white/10 bg-white/5 hover:border-white/30"
                    )}
                  >
                    {selectedStyle === style.id && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                          <Check className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    )}

                    <div className={cn(
                      "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                      style.gradient
                    )}>
                      {styleIcons[style.id]}
                    </div>

                    <h3 className="font-bold text-lg">
                      {language === 'fr' ? style.name : style.nameBariba}
                    </h3>
                    <p className="text-sm text-white/60 mt-1">
                      {language === 'fr' ? style.description : style.descriptionBariba}
                    </p>

                    <div
                      className="h-2 rounded-full mt-4"
                      style={{
                        background: `linear-gradient(to right, ${style.colors.primary}, ${style.colors.secondary})`
                      }}
                    />
                  </motion.button>
                ))}
              </div>

              <Button
                onClick={goToNext}
                className="w-full py-6 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold text-lg rounded-2xl hover:scale-[1.02] transition-transform"
              >
                {labels.generateVideo}
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* STEP 4: PROCESSING */}
          {currentStep === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 text-center py-12"
            >
              {processingProgress < 100 ? (
                <>
                  <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold mb-2">{labels.creatingVideo}</h2>
                    <p className="text-white/60">{processingMessage}</p>
                  </div>

                  <div className="max-w-md mx-auto">
                    <Progress value={processingProgress} className="h-3" />
                    <p className="text-sm text-white/60 mt-2">{processingProgress}%</p>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/30"
                  >
                    <Check className="w-16 h-16 text-white" />
                  </motion.div>

                  <div>
                    <h2 className="text-3xl font-bold mb-2 text-green-400">{labels.videoReady}</h2>
                  </div>

                  {/* Style preview badge */}
                  <div
                    className="max-w-sm mx-auto p-4 rounded-2xl border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${selectedPreset?.colors.primary}20, ${selectedPreset?.colors.secondary}20)`
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", selectedPreset?.gradient)}>
                        {styleIcons[selectedStyle]}
                      </div>
                      <div className="text-left">
                        <p className="font-bold">
                          {language === 'fr' ? selectedPreset?.name : selectedPreset?.nameBariba}
                        </p>
                        <p className="text-sm text-white/60">
                          {formatTime(audioDuration)} • {(photoPortrait || photoVillage || photoContext) ? '📷' : '🎙️'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RadioVillageProTemplate;
