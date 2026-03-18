/**
 * KuaishouCaptureMode.tsx
 * Mode capture vidéo avec effets temps réel Kuaishou et guidance
 * Version: 2.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  FlipHorizontal, 
  Sparkles, 
  Timer, 
  X, 
  Pause, 
  Play,
  Square,
  Music,
  Wand2,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { KuaishouTemplateConfig, TemplateSegment, VideoSegment } from '@/types/KuaishouTypes';
import { CaptureEngine } from '@/engines/CaptureEngine';
import { KuaishouEffectsOverlay } from './KuaishouEffects';
import { TemplateStepNavigator } from './TemplateStepNavigator';

interface KuaishouCaptureModeProps {
  template: KuaishouTemplateConfig;
  currentSegment: TemplateSegment;
  segmentIndex: number;
  totalSegments: number;
  onCapture: (segment: VideoSegment) => void;
  onSkip?: () => void;
  onBack: () => void;
}

type CaptureState = 'preview' | 'countdown' | 'recording' | 'paused';

export const KuaishouCaptureMode: React.FC<KuaishouCaptureModeProps> = ({
  template,
  currentSegment,
  segmentIndex,
  totalSegments,
  onCapture,
  onSkip,
  onBack
}) => {
  const [captureState, setCaptureState] = useState<CaptureState>('preview');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [activeEffects, setActiveEffects] = useState<string[]>(['beauty', 'stabilization']);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const captureEngineRef = useRef<CaptureEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const maxDuration = currentSegment.maxDuration || currentSegment.duration;
  const minDuration = currentSegment.minDuration || 3;

  // Initialize camera with HD quality
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 24 },
            facingMode: isFrontCamera ? 'user' : 'environment'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Initialize capture engine for recording
        captureEngineRef.current = new CaptureEngine();
        await captureEngineRef.current.initializeCamera(isFrontCamera ? 'user' : 'environment');
        
        // Apply default effects
        activeEffects.forEach(effect => {
          captureEngineRef.current?.enableEffect(effect);
        });
      } catch (error) {
        console.error('Camera init error:', error);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      captureEngineRef.current?.destroy();
    };
  }, [isFrontCamera]);

  // Handle camera flip with haptic feedback
  const handleFlipCamera = useCallback(async () => {
    if (navigator.vibrate) navigator.vibrate(30);
    setIsFrontCamera(prev => !prev);
    await captureEngineRef.current?.switchCamera();
  }, []);

  // Toggle flash/torch
  const handleToggleFlash = useCallback(async () => {
    if (navigator.vibrate) navigator.vibrate(20);
    
    // Try to toggle flash via CaptureEngine
    const result = await captureEngineRef.current?.toggleFlash();
    if (result !== undefined) {
      setFlashEnabled(result);
      return;
    }
    
    // Fallback: try to toggle torch on the stream directly
    const stream = videoRef.current?.srcObject as MediaStream;
    if (stream) {
      try {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if ('torch' in capabilities) {
          const newFlashState = !flashEnabled;
          await track.applyConstraints({
            advanced: [{ torch: newFlashState } as any]
          });
          setFlashEnabled(newFlashState);
        }
      } catch (err) {
        console.warn('Flash not supported:', err);
      }
    }
  }, [flashEnabled]);

  // Toggle effect
  const toggleEffect = useCallback((effect: string) => {
    setActiveEffects(prev => {
      if (prev.includes(effect)) {
        captureEngineRef.current?.disableEffect(effect);
        return prev.filter(e => e !== effect);
      } else {
        captureEngineRef.current?.enableEffect(effect);
        return [...prev, effect];
      }
    });
  }, []);

  // Start countdown
  const startCountdown = useCallback(() => {
    setCaptureState('countdown');
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start recording using the video stream directly
  const startRecording = useCallback(async () => {
    setCaptureState('recording');
    setRecordingTime(0);
    recordedChunksRef.current = [];

    const stream = videoRef.current?.srcObject as MediaStream;
    if (!stream) {
      console.error('No stream available');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
      ? 'video/webm;codecs=vp9' 
      : 'video/webm';

    mediaRecorderRef.current = new MediaRecorder(stream, { 
      mimeType,
      videoBitsPerSecond: 5000000 
    });

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorderRef.current.start(100); // collect data every 100ms

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return prev + 0.1;
      });
    }, 100);
  }, [maxDuration]);

  // Stop recording and create segment
  const stopRecording = useCallback(async () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Wait for final data
      await new Promise<void>((resolve) => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = () => resolve();
        } else {
          resolve();
        }
      });
    }

    // Create video segment from recorded chunks
    if (recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      
      const segment: VideoSegment = {
        id: `segment_${Date.now()}`,
        blob,
        duration: recordingTime,
        timestamp: Date.now(),
        effects: activeEffects as any[]
      };

      onCapture(segment);
    }
    
    setCaptureState('preview');
    setRecordingTime(0);
  }, [onCapture, recordingTime, activeEffects]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (captureState === 'recording') {
      setCaptureState('paused');
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
    } else if (captureState === 'paused') {
      setCaptureState('recording');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 0.1;
        });
      }, 100);
    }
  }, [captureState, maxDuration, stopRecording]);

  const progressPercent = (recordingTime / maxDuration) * 100;
  const canStop = recordingTime >= minDuration;

  // Check if template has Kuaishou native effects
  const hasKuaishouEffects = template.kuaishouEffects && (
    template.kuaishouEffects.sparkles?.enabled ||
    template.kuaishouEffects.warmGlow?.enabled ||
    template.kuaishouEffects.beatGlow?.enabled ||
    template.kuaishouEffects.progressBar?.enabled
  );

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera Preview */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: isFrontCamera ? 'scaleX(-1)' : 'none' }}
        />

        {/* Kuaishou Effects Overlay */}
        {hasKuaishouEffects && template.kuaishouEffects && (
          <KuaishouEffectsOverlay
            effects={template.kuaishouEffects}
            currentTime={recordingTime}
            duration={maxDuration}
            isRecording={captureState === 'recording' || captureState === 'paused'}
          />
        )}

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-white">
              <X className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-black/50 text-white">
                {segmentIndex + 1}/{totalSegments}
              </Badge>
              {template.kuaishouEffects && (
                <Badge variant="secondary" className="bg-amber-500/80 text-white">
                  🐴 Premium
                </Badge>
              )}
              <Badge variant="secondary" className="bg-primary/80 text-primary-foreground">
                {maxDuration}s max
              </Badge>
            </div>

            <Button variant="ghost" size="icon" onClick={handleFlipCamera} className="text-white">
              <FlipHorizontal className="w-6 h-6" />
            </Button>
          </div>

          {/* Recording Progress */}
          {(captureState === 'recording' || captureState === 'paused') && (
            <div className="mt-4">
              <Progress value={progressPercent} className="h-1" />
              <div className="flex justify-between mt-1 text-xs text-white/80">
                <span>{recordingTime.toFixed(1)}s</span>
                <span className={recordingTime >= minDuration ? 'text-green-400' : 'text-white/60'}>
                  min: {minDuration}s
                </span>
                <span>{maxDuration}s</span>
              </div>
            </div>
          )}
        </div>

        {/* Guidance Overlay */}
        {currentSegment.guidance && captureState === 'preview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-20 left-4 right-4 z-10"
          >
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-4 text-center">
              <p className="text-white font-medium">{currentSegment.guidance.text}</p>
            </div>
          </motion.div>
        )}

        {/* Countdown Overlay */}
        <AnimatePresence>
          {captureState === 'countdown' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/50"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="w-32 h-32 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-6xl font-bold text-primary-foreground">{countdown}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording Indicator */}
        <AnimatePresence>
          {captureState === 'recording' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
            >
              <div className="flex items-center gap-2 bg-red-500 rounded-full px-4 py-1">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-3 h-3 rounded-full bg-white"
                />
                <span className="text-white font-medium">REC</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Beat Indicator */}
        {currentSegment.guidance?.beatIndicator && template.music && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 60 / template.music.bpm }}
              className="w-4 h-4 rounded-full bg-primary"
            />
          </div>
        )}

        {/* Effects Panel */}
        <AnimatePresence>
          {showEffectsPanel && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="absolute right-4 top-1/4 z-10 bg-black/70 backdrop-blur-sm rounded-xl p-2"
            >
              {['beauty', 'stabilization', 'hdr'].map(effect => (
                <Button
                  key={effect}
                  variant={activeEffects.includes(effect) ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => toggleEffect(effect)}
                  className="w-full justify-start mb-1"
                >
                  {effect === 'beauty' && <Sparkles className="w-4 h-4 mr-2" />}
                  {effect === 'stabilization' && <Camera className="w-4 h-4 mr-2" />}
                  {effect === 'hdr' && <Wand2 className="w-4 h-4 mr-2" />}
                  {effect.charAt(0).toUpperCase() + effect.slice(1)}
                </Button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Side Controls - Camera Controls */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
          {/* Flash Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFlash}
            className={`text-white rounded-full w-12 h-12 ${flashEnabled ? 'bg-yellow-500' : 'bg-black/50'}`}
            title={flashEnabled ? 'Flash activé' : 'Flash désactivé'}
          >
            {flashEnabled ? (
              <Flashlight className="w-6 h-6" />
            ) : (
              <FlashlightOff className="w-6 h-6" />
            )}
          </Button>

          {/* Camera Flip */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFlipCamera}
            className="text-white rounded-full bg-black/50 w-12 h-12"
            title={isFrontCamera ? 'Caméra arrière' : 'Caméra frontale'}
          >
            <SwitchCamera className="w-6 h-6" />
          </Button>
          
          {/* Effects */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEffectsPanel(prev => !prev)}
            className={`text-white rounded-full w-12 h-12 ${showEffectsPanel ? 'bg-primary' : 'bg-black/50'}`}
          >
            <Sparkles className="w-6 h-6" />
          </Button>
          
          {template.music && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white rounded-full bg-black/50 w-12 h-12"
            >
              <Music className="w-6 h-6" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={startCountdown}
            className="text-white rounded-full bg-black/50 w-12 h-12"
            disabled={captureState !== 'preview'}
          >
            <Timer className="w-6 h-6" />
          </Button>
        </div>

        {/* Left Controls - Camera Label */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 text-center shadow-lg border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <SwitchCamera className="w-4 h-4 text-white/80" />
              <p className="text-white text-sm font-semibold">
                {isFrontCamera ? 'Front' : 'Back'}
              </p>
            </div>
            {flashEnabled && (
              <div className="flex items-center gap-1 text-yellow-400 text-xs font-medium mt-1">
                <Flashlight className="w-3 h-3" />
                <span>Flash ON</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black/80 backdrop-blur-sm p-6">
        <div className="flex items-center justify-center gap-8">
          {/* Skip Button */}
          {onSkip && captureState === 'preview' && (
            <Button variant="ghost" onClick={onSkip} className="text-white">
              Passer
            </Button>
          )}

          {/* Main Capture Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (captureState === 'preview') {
                startCountdown();
              } else if (captureState === 'recording' && canStop) {
                stopRecording();
              } else if (captureState === 'paused' && canStop) {
                stopRecording();
              }
            }}
            disabled={captureState === 'countdown' || (captureState === 'recording' && !canStop)}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              captureState === 'recording' 
                ? 'bg-red-500' 
                : captureState === 'paused'
                ? 'bg-yellow-500'
                : 'bg-white'
            } ${captureState === 'countdown' ? 'opacity-50' : ''}`}
          >
            {captureState === 'preview' && (
              <div className="w-16 h-16 rounded-full bg-red-500" />
            )}
            {captureState === 'recording' && (
              <Square className="w-8 h-8 text-white fill-white" />
            )}
            {captureState === 'paused' && (
              <Square className="w-8 h-8 text-white fill-white" />
            )}
          </motion.button>

          {/* Pause/Resume Button */}
          {(captureState === 'recording' || captureState === 'paused') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePause}
              className="text-white bg-black/50 rounded-full w-14 h-14"
            >
              {captureState === 'recording' ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>
          )}
        </div>

        {/* Min duration hint */}
        {captureState === 'recording' && !canStop && (
          <p className="text-center text-white/60 text-sm mt-2">
            Continue jusqu'à {minDuration}s minimum
          </p>
        )}
      </div>
    </div>
  );
};

export default KuaishouCaptureMode;
