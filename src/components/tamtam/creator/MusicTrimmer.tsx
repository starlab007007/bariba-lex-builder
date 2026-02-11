import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MusicTrimmerProps {
  audioUrl: string;
  trackName: string;
  totalDuration: number;
  clipDuration: number;
  startOffset: number;
  onTrimChange: (startOffset: number, trimmedDuration: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export default function MusicTrimmer({
  audioUrl,
  trackName,
  totalDuration,
  clipDuration,
  startOffset: initialOffset,
  onTrimChange,
  onConfirm,
  onBack,
}: MusicTrimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startOffset, setStartOffset] = useState(initialOffset);
  const [isDragging, setIsDragging] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const playStartTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const effectiveDuration = Math.min(clipDuration, totalDuration);
  const maxOffset = Math.max(0, totalDuration - effectiveDuration);

  // Stop any playing audio
  const stopPlayback = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
    setPlayProgress(0);
  }, []);

  // Play the selected portion (with guard against simultaneous plays)
  const playSelection = useCallback((offset: number, dur?: number) => {
    stopPlayback();
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    if (!ctx || !buffer) return;
    if (ctx.state === 'closed') return; // Guard: context already closed

    if (ctx.state === 'suspended') ctx.resume();

    const playDur = dur || effectiveDuration;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0, offset, playDur);
    sourceRef.current = source;
    playStartTimeRef.current = ctx.currentTime;
    setIsPlaying(true);

    const animate = () => {
      const elapsed = ctx.currentTime - playStartTimeRef.current;
      const progress = Math.min(elapsed / playDur, 1);
      setPlayProgress(progress);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setPlayProgress(0);
      }
    };
    animFrameRef.current = requestAnimationFrame(animate);

    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
      setPlayProgress(0);
    };
  }, [effectiveDuration, stopPlayback]);

  // Load audio and extract peaks
  useEffect(() => {
    let cancelled = false;
    const loadAudio = async () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const res = await fetch(audioUrl);
        const arrayBuf = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuf);
        audioBufferRef.current = buffer;
        if (cancelled) return;

        const channelData = buffer.getChannelData(0);
        const numBars = 120;
        const samplesPerBar = Math.floor(channelData.length / numBars);
        const extractedPeaks: number[] = [];
        for (let i = 0; i < numBars; i++) {
          let max = 0;
          const start = i * samplesPerBar;
          for (let j = start; j < start + samplesPerBar && j < channelData.length; j++) {
            const abs = Math.abs(channelData[j]);
            if (abs > max) max = abs;
          }
          extractedPeaks.push(max);
        }
        const peakMax = Math.max(...extractedPeaks, 0.01);
        setPeaks(extractedPeaks.map(p => p / peakMax));
      } catch (e) {
        setPeaks(Array.from({ length: 120 }, () => 0.2 + Math.random() * 0.8));
      }
    };
    loadAudio();
    return () => { cancelled = true; };
  }, [audioUrl]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const barW = w / peaks.length - 1;
    const selStart = (startOffset / totalDuration) * w;
    const selWidth = (effectiveDuration / totalDuration) * w;
    const progressX = selStart + playProgress * selWidth;

    // Draw bars
    for (let i = 0; i < peaks.length; i++) {
      const x = i * (barW + 1);
      const barH = peaks[i] * h * 0.85;
      const y = (h - barH) / 2;
      const inSelection = x >= selStart && x + barW <= selStart + selWidth;

      ctx.fillStyle = inSelection ? '#f97316' : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(barW, 1.5), barH, 1);
      ctx.fill();
    }

    // Selection overlay borders
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.strokeRect(selStart, 0, selWidth, h);

    // Left/right handles
    const handleW = 10;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.roundRect(selStart, 0, handleW, h, [4, 0, 0, 4]);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(selStart + selWidth - handleW, 0, handleW, h, [0, 4, 4, 0]);
    ctx.fill();

    // Handle grip lines
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    for (const hx of [selStart + handleW / 2, selStart + selWidth - handleW / 2]) {
      for (const dy of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.moveTo(hx - 1.5, h / 2 + dy);
        ctx.lineTo(hx + 1.5, h / 2 + dy);
        ctx.stroke();
      }
    }

    // Playback progress line
    if (isPlaying) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, h);
      ctx.stroke();
    }
  }, [peaks, startOffset, totalDuration, effectiveDuration, isPlaying, playProgress]);

  // Drag handling - on canvas only (Play button is outside)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    stopPlayback(); // Stop audio when dragging
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = startOffset;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [startOffset, stopPlayback]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - dragStartXRef.current;
    const dSec = (dx / rect.width) * totalDuration;
    const newOffset = Math.max(0, Math.min(maxOffset, dragStartOffsetRef.current + dSec));
    setStartOffset(newOffset);
    onTrimChange(newOffset, effectiveDuration);
  }, [isDragging, totalDuration, maxOffset, effectiveDuration, onTrimChange]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Auto-preview: play 2.5s of the new position
    setTimeout(() => {
      playSelection(startOffset, Math.min(2.5, effectiveDuration));
    }, 100);
  }, [isDragging, startOffset, effectiveDuration, playSelection]);

  // Toggle play for full selection
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playSelection(startOffset);
    }
  }, [isPlaying, startOffset, playSelection, stopPlayback]);

  // Cleanup - close AudioContext
  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 bg-black/95 flex flex-col z-[100]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{trackName}</p>
          <p className="text-white/50 text-xs">{formatTime(startOffset)} → {formatTime(startOffset + effectiveDuration)} sur {formatTime(totalDuration)}</p>
        </div>
      </div>

      {/* Waveform area - DRAG ONLY, no play button inside */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
        {/* Time labels */}
        <div className="w-full flex justify-between text-white/40 text-xs px-1">
          <span>{formatTime(startOffset)}</span>
          <span>{formatTime(startOffset + effectiveDuration)}</span>
        </div>

        {/* Canvas - drag zone only */}
        <div
          ref={containerRef}
          className="w-full h-24 relative cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Play controls - SEPARATE from drag zone */}
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-orange-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white ml-0.5" />
            )}
          </button>
          <div className="flex flex-col">
            <span className="text-white/70 text-xs">
              {isPlaying ? 'Lecture en cours...' : 'Écouter la sélection'}
            </span>
            <span className="text-orange-400 text-xs font-medium">
              Durée clip : {effectiveDuration}s
            </span>
          </div>
        </div>
      </div>

      {/* Confirm */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onConfirm}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2"
        >
          ✂️ Utiliser cette partie
        </button>
      </div>
    </motion.div>
  );
}
