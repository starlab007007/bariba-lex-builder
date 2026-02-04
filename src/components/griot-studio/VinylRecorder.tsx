/**
 * VinylRecorder v1.0
 * Animated vinyl disc for audio recording
 * Voice-first design with circular progress and haptic feedback
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Mic, Square, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VinylRecorderProps {
  avatarUrl?: string | null;
  maxDuration?: number;
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onAvatarCapture?: () => void;
  disabled?: boolean;
  accentColor?: string;
}

export function VinylRecorder({
  avatarUrl,
  maxDuration = 60,
  onRecordingComplete,
  onAvatarCapture,
  disabled = false,
  accentColor = '#FFD700'
}: VinylRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const discControls = useAnimation();

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress (0-1)
  const progress = Math.min(duration / maxDuration, 1);
  
  // SVG circle calculations
  const size = 200;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Start vinyl rotation animation
  useEffect(() => {
    if (isRecording) {
      discControls.start({
        rotate: 360,
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'linear'
        }
      });
    } else {
      discControls.stop();
    }
  }, [isRecording, discControls]);

  // Timer for duration tracking
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
        
        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, maxDuration]);

  // Haptic feedback
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (disabled) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      chunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const finalDuration = (Date.now() - startTimeRef.current) / 1000;
          onRecordingComplete(audioBlob, finalDuration);
        }
      };
      
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setDuration(0);
      setPermissionDenied(false);
      vibrate(50);
      
    } catch (error) {
      console.error('[VinylRecorder] Permission denied:', error);
      setPermissionDenied(true);
      vibrate([100, 50, 100]);
    }
  }, [disabled, onRecordingComplete, vibrate]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      vibrate([50, 30, 50]);
    }
  }, [isRecording, vibrate]);

  // Toggle recording
  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Vinyl Disc Container */}
      <div className="relative">
        {/* Progress Ring */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isRecording ? '#EF4444' : accentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease'
            }}
          />
        </svg>

        {/* Vinyl Disc */}
        <motion.div
          animate={discControls}
          className={cn(
            "relative w-[200px] h-[200px] rounded-full",
            "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
            "border-4 border-gray-700",
            "shadow-2xl shadow-black/50",
            disabled && "opacity-50"
          )}
          style={{
            background: `
              radial-gradient(circle at 50% 50%, 
                transparent 0%, 
                transparent 30%, 
                rgba(0,0,0,0.3) 31%, 
                transparent 32%,
                transparent 45%,
                rgba(0,0,0,0.2) 46%,
                transparent 47%,
                transparent 60%,
                rgba(0,0,0,0.15) 61%,
                transparent 62%,
                transparent 75%,
                rgba(0,0,0,0.1) 76%,
                transparent 77%
              ),
              linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)
            `
          }}
        >
          {/* Grooves effect */}
          <div className="absolute inset-4 rounded-full border border-gray-600/30" />
          <div className="absolute inset-8 rounded-full border border-gray-600/20" />
          <div className="absolute inset-12 rounded-full border border-gray-600/10" />
          
          {/* Center Label */}
          <div 
            className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-20 h-20 rounded-full overflow-hidden",
              "border-2 shadow-inner",
              isRecording ? "border-red-500" : "border-amber-400"
            )}
            style={{ borderColor: isRecording ? '#EF4444' : accentColor }}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Narrateur"
                className="w-full h-full object-cover"
              />
            ) : (
              <button
                onClick={onAvatarCapture}
                className={cn(
                  "w-full h-full flex items-center justify-center",
                  "bg-gradient-to-br from-amber-900/80 to-amber-950",
                  "hover:from-amber-800/80 hover:to-amber-900",
                  "transition-colors"
                )}
              >
                <Camera className="w-6 h-6 text-amber-200/60" />
              </button>
            )}
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <motion.div
              className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Tonearm */}
        <motion.div
          className="absolute -right-4 -top-4 origin-[calc(100%-12px)_12px]"
          animate={{
            rotate: isRecording ? 25 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-24 h-2 bg-gradient-to-r from-gray-600 to-gray-400 rounded-full" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-400" />
        </motion.div>
      </div>

      {/* Time Display */}
      <div className="text-center">
        <p className="text-3xl font-mono font-bold text-white">
          {formatTime(duration)}
        </p>
        <p className="text-sm text-amber-200/60">
          / {formatTime(maxDuration)}
        </p>
      </div>

      {/* Record Button */}
      <button
        onClick={handleToggleRecording}
        disabled={disabled}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center",
          "transition-all duration-200 transform active:scale-95",
          "shadow-lg",
          isRecording
            ? "bg-red-500 hover:bg-red-600"
            : "bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isRecording ? (
          <Square className="w-6 h-6 text-white fill-white" />
        ) : (
          <Mic className="w-7 h-7 text-white" />
        )}
      </button>

      {/* Labels */}
      <div className="text-center">
        <p className="text-sm font-medium text-amber-100">
          {isRecording ? '🔴 Parle... / Sɔ̀...' : '🎙️ Raconte / Sɔ̀'}
        </p>
        {permissionDenied && (
          <p className="text-xs text-red-400 mt-1">
            ⚠️ Micro non autorisé
          </p>
        )}
      </div>
    </div>
  );
}

export default VinylRecorder;
