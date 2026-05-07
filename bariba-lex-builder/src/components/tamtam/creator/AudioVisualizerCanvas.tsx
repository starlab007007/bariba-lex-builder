/**
 * AudioVisualizerCanvas - Real-time Audio Waveform & Spectrum Visualizer
 * Responsive, animated audio visualization with beat detection
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AudioVisualizerCanvasProps {
  isPlaying: boolean;
  style?: 'waveform' | 'spectrum' | 'circular' | 'bars';
  primaryColor?: string;
  secondaryColor?: string;
  className?: string;
  audioContext?: AudioContext | null;
  analyserNode?: AnalyserNode | null;
  tempo?: number;
}

export const AudioVisualizerCanvas: React.FC<AudioVisualizerCanvasProps> = ({
  isPlaying,
  style = 'spectrum',
  primaryColor = '#8B5CF6',
  secondaryColor = '#EC4899',
  className,
  audioContext,
  analyserNode,
  tempo = 120
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 200 });

  // Simulated audio data for demo when no real audio context
  const simulatedDataRef = useRef<number[]>([]);
  const beatPhaseRef = useRef(0);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          setDimensions({
            width: rect.width * window.devicePixelRatio,
            height: rect.height * window.devicePixelRatio
          });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Generate simulated data based on tempo
  const generateSimulatedData = useCallback((frameCount: number) => {
    const bars = 64;
    const data: number[] = [];
    const beatInterval = 60 / tempo;
    const phase = (frameCount / 60) / beatInterval * Math.PI * 2;
    beatPhaseRef.current = phase;

    for (let i = 0; i < bars; i++) {
      const normalizedPos = i / bars;
      // Bass response (low frequencies)
      const bassInfluence = Math.max(0, 1 - normalizedPos * 3) * Math.abs(Math.sin(phase));
      // Mid frequencies
      const midInfluence = Math.exp(-Math.pow((normalizedPos - 0.4) * 4, 2)) * Math.abs(Math.sin(phase * 2 + i * 0.1));
      // High frequencies  
      const highInfluence = normalizedPos * 0.3 * (0.5 + 0.5 * Math.sin(phase * 4 + i * 0.2));
      
      const value = (bassInfluence * 0.6 + midInfluence * 0.3 + highInfluence * 0.1) * 255;
      data.push(Math.min(255, Math.max(0, value + Math.random() * 20)));
    }
    return data;
  }, [tempo]);

  // Draw spectrum bars
  const drawSpectrum = useCallback((ctx: CanvasRenderingContext2D, data: number[] | Uint8Array) => {
    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    const barCount = data.length;
    const barWidth = width / barCount - 2;
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(0.5, secondaryColor);
    gradient.addColorStop(1, '#fff');

    for (let i = 0; i < barCount; i++) {
      const value = data[i] / 255;
      const barHeight = value * height * 0.9;
      const x = i * (barWidth + 2);
      const y = height - barHeight;

      // Glow effect
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 15;
      ctx.fillStyle = gradient;
      
      // Rounded bars
      const radius = Math.min(barWidth / 2, 4);
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0]);
      ctx.fill();
    }

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [dimensions, primaryColor, secondaryColor]);

  // Draw waveform
  const drawWaveform = useCallback((ctx: CanvasRenderingContext2D, data: number[] | Uint8Array) => {
    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 255;
      const y = centerY + (value - 0.5) * height * 0.8;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();

    // Mirror effect
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = secondaryColor;
    ctx.beginPath();
    x = 0;

    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 255;
      const y = centerY - (value - 0.5) * height * 0.6;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }, [dimensions, primaryColor, secondaryColor]);

  // Draw circular visualizer
  const drawCircular = useCallback((ctx: CanvasRenderingContext2D, data: number[] | Uint8Array) => {
    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;

    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 255;
      const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
      
      const barLength = value * radius * 0.8;
      const innerX = centerX + Math.cos(angle) * radius;
      const innerY = centerY + Math.sin(angle) * radius;
      const outerX = centerX + Math.cos(angle) * (radius + barLength);
      const outerY = centerY + Math.sin(angle) * (radius + barLength);

      const gradient = ctx.createLinearGradient(innerX, innerY, outerX, outerY);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, secondaryColor);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
    ctx.strokeStyle = `${primaryColor}40`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [dimensions, primaryColor, secondaryColor]);

  // Draw animated bars (default)
  const drawBars = useCallback((ctx: CanvasRenderingContext2D, data: number[] | Uint8Array) => {
    const { width, height } = dimensions;
    ctx.clearRect(0, 0, width, height);

    const barCount = Math.min(data.length, 32);
    const gap = 4;
    const barWidth = (width - (barCount - 1) * gap) / barCount;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor(i * data.length / barCount);
      const value = data[dataIndex] / 255;
      const barHeight = value * height * 0.85;
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      // Create gradient
      const gradient = ctx.createLinearGradient(x, height, x, y);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(0.6, secondaryColor);
      gradient.addColorStop(1, '#ffffff');

      // Glow effect
      ctx.shadowColor = value > 0.7 ? secondaryColor : primaryColor;
      ctx.shadowBlur = value * 20;
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      // Beat indicator at peak
      if (value > 0.8) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x + barWidth / 2, y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
  }, [dimensions, primaryColor, secondaryColor]);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    let frameCount = 0;

    const render = () => {
      frameCount++;

      let data: number[];

      if (analyserNode && audioContext) {
        // Use real audio data
        const bufferLength = analyserNode.frequencyBinCount;
        const audioData = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(audioData);
        data = Array.from(audioData);
      } else if (isPlaying) {
        // Use simulated data
        data = generateSimulatedData(frameCount);
        simulatedDataRef.current = data;
      } else {
        // Idle state - slight animation
        data = simulatedDataRef.current.map((v, i) => 
          Math.max(10, v * 0.95 + Math.sin(frameCount * 0.05 + i * 0.1) * 5)
        );
        if (data.length === 0) {
          data = new Array(64).fill(10);
        }
      }

      switch (style) {
        case 'waveform':
          drawWaveform(ctx, data);
          break;
        case 'circular':
          drawCircular(ctx, data);
          break;
        case 'bars':
          drawBars(ctx, data);
          break;
        case 'spectrum':
        default:
          drawSpectrum(ctx, data);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, isPlaying, style, analyserNode, audioContext, generateSimulatedData, drawSpectrum, drawWaveform, drawCircular, drawBars]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "relative w-full h-full min-h-[120px] bg-gradient-to-b from-black via-slate-900 to-black rounded-xl overflow-hidden",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {/* Beat pulse overlay */}
      {isPlaying && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: [0, 0.1, 0],
          }}
          transition={{
            duration: 60 / tempo,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `radial-gradient(circle at center, ${primaryColor}30 0%, transparent 70%)`
          }}
        />
      )}

      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, ${primaryColor}20 1px, transparent 1px),
            linear-gradient(to bottom, ${primaryColor}20 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
      </div>
    </motion.div>
  );
};

export default AudioVisualizerCanvas;
