/**
 * CompactRecorder — Inline audio recorder for PublishStep
 * Minimal design with mic button + duration + playback
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number, url: string) => void;
  className?: string;
}

export function CompactRecorder({ onRecordingComplete, className }: CompactRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const finalDuration = (Date.now() - startTimeRef.current) / 1000;
          const url = URL.createObjectURL(blob);
          setRecordedUrl(url);
          setDuration(finalDuration);
          onRecordingComplete(blob, finalDuration, url);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setDuration(0);
      startTimeRef.current = Date.now();

      timerRef.current = window.setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      if ('vibrate' in navigator) navigator.vibrate(50);
    } catch (err) {
      console.error('[CompactRecorder] Permission denied:', err);
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
    }
  }, [isRecording]);

  const handlePlayback = useCallback(() => {
    if (!recordedUrl) return;
    if (isPlaying && audioElRef.current) {
      audioElRef.current.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(recordedUrl);
      audio.onended = () => setIsPlaying(false);
      audioElRef.current = audio;
      audio.play();
      setIsPlaying(true);
    }
  }, [recordedUrl, isPlaying]);

  const handleReRecord = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setDuration(0);
    setIsPlaying(false);
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
  }, [recordedUrl]);

  // Already recorded state
  if (recordedUrl) {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/30", className)}>
        <button
          onClick={handlePlayback}
          className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
        >
          {isPlaying ? <Pause className="w-5 h-5 text-green-300" /> : <Play className="w-5 h-5 text-green-300 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-200">✅ Voix enregistrée</p>
          <p className="text-xs text-green-200/60">{formatTime(duration)}</p>
        </div>
        <button
          onClick={handleReRecord}
          className="px-3 py-1.5 text-xs text-amber-200/60 hover:text-amber-100 transition-colors flex items-center gap-1 flex-shrink-0"
        >
          <RotateCcw className="w-3 h-3" /> Refaire
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/20">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg flex-shrink-0",
            isRecording
              ? "bg-red-500 hover:bg-red-600 animate-pulse"
              : "bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400"
          )}
        >
          {isRecording ? <Square className="w-5 h-5 text-white fill-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-100">
            {isRecording ? '🔴 Enregistrement...' : '🎙️ Enregistrer ta voix'}
          </p>
          <p className="text-xs text-amber-200/60">
            {isRecording ? formatTime(duration) : 'Raconte ton conte ici'}
          </p>
        </div>

        {isRecording && (
          <motion.div
            className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  );
}
