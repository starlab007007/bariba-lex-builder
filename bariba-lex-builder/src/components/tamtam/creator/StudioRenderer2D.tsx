/**
 * StudioRenderer2D - 2D Fallback Studio Rendering for Village Chronicle
 * Renders a professional TV studio look without WebGL dependencies
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Cloud, CloudRain, Wind, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'windy';
  humidity: number;
}

interface NewsTickerItem {
  id: string;
  title: string;
  isBreaking?: boolean;
}

interface StudioRenderer2DProps {
  villageName: string;
  anchorName?: string;
  anchorPhoto?: string;
  weather?: WeatherData;
  newsItems?: NewsTickerItem[];
  isLive?: boolean;
  currentTime?: string;
  className?: string;
  onAnimationComplete?: () => void;
}

export const StudioRenderer2D: React.FC<StudioRenderer2DProps> = ({
  villageName,
  anchorName = 'Présentateur',
  anchorPhoto,
  weather = { temperature: 28, condition: 'sunny', humidity: 65 },
  newsItems = [],
  isLive = false,
  currentTime,
  className,
  onAnimationComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  // Weather icons
  const WeatherIcon = useCallback(() => {
    const iconClass = "w-8 h-8";
    switch (weather.condition) {
      case 'sunny': return <Sun className={cn(iconClass, "text-yellow-400")} />;
      case 'cloudy': return <Cloud className={cn(iconClass, "text-gray-400")} />;
      case 'rainy': return <CloudRain className={cn(iconClass, "text-blue-400")} />;
      case 'windy': return <Wind className={cn(iconClass, "text-cyan-400")} />;
      default: return <Sun className={cn(iconClass, "text-yellow-400")} />;
    }
  }, [weather.condition]);

  // Draw studio background on canvas
  const drawStudio = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const time = Date.now() * 0.001;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Background gradient (news studio blue)
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0F172A');
    bgGradient.addColorStop(0.5, '#1E3A5F');
    bgGradient.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Animated background grid
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offset = (time * 20) % gridSize;

    for (let x = -offset; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = -offset; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Studio desk (bottom area)
    const deskGradient = ctx.createLinearGradient(0, height * 0.7, 0, height);
    deskGradient.addColorStop(0, '#374151');
    deskGradient.addColorStop(1, '#1F2937');
    ctx.fillStyle = deskGradient;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.bezierCurveTo(width * 0.2, height * 0.7, width * 0.8, height * 0.7, width, height * 0.75);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Desk edge highlight
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.bezierCurveTo(width * 0.2, height * 0.7, width * 0.8, height * 0.7, width, height * 0.75);
    ctx.stroke();

    // Light beams
    ctx.save();
    const beamGradient = ctx.createRadialGradient(
      width / 2, -height * 0.3, 0,
      width / 2, -height * 0.3, height
    );
    beamGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    beamGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
    beamGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // Floating particles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
      const x = ((time * 0.02 + i * 0.1) % 1) * width;
      const y = Math.sin(time + i) * height * 0.1 + height * 0.4;
      const size = 1 + Math.sin(time * 2 + i) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Request next frame
    animationRef.current = requestAnimationFrame(drawStudio);
  }, [dimensions]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          const dpr = window.devicePixelRatio;
          setDimensions({
            width: rect.width * dpr,
            height: rect.height * dpr
          });
          canvasRef.current.width = rect.width * dpr;
          canvasRef.current.height = rect.height * dpr;
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Start animation
  useEffect(() => {
    drawStudio();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawStudio]);

  return (
    <div className={cn("relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden", className)}>
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />

      {/* TV Frame overlay */}
      <div className="absolute inset-0 pointer-events-none border-4 border-slate-700/50 rounded-lg" />

      {/* Logo / Village Name */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 left-4 flex items-center gap-3"
      >
        <div className="flex items-center gap-2 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <span className="text-2xl">📺</span>
          <span className="text-white font-bold text-lg">{villageName} TV</span>
        </div>
        
        {isLive && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full"
          >
            <div className="w-2 h-2 rounded-full bg-white" />
            <span className="text-white text-sm font-bold">EN DIRECT</span>
          </motion.div>
        )}
      </motion.div>

      {/* Weather Widget */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <WeatherIcon />
          <div>
            <div className="flex items-center gap-1 text-white">
              <Thermometer className="w-4 h-4" />
              <span className="text-2xl font-bold">{weather.temperature}°C</span>
            </div>
            <p className="text-white/70 text-xs">{weather.humidity}% humidité</p>
          </div>
        </div>
      </motion.div>

      {/* Time display */}
      <div className="absolute top-4 right-32 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
        <span className="text-white font-mono text-lg">
          {currentTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Virtual Anchor Area (2D Avatar) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute left-1/2 bottom-[30%] -translate-x-1/2"
      >
        <div className="relative">
          {/* Avatar placeholder */}
          {anchorPhoto ? (
            <img
              src={anchorPhoto}
              alt={anchorName}
              className="w-32 h-32 md:w-48 md:h-48 rounded-full object-cover border-4 border-primary shadow-2xl"
            />
          ) : (
            <motion.div
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center border-4 border-white/20 shadow-2xl"
            >
              <span className="text-5xl md:text-7xl">👤</span>
            </motion.div>
          )}
          
          {/* Speaking indicator */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scaleY: [1, 1.5 + i * 0.3, 1],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
                className="w-2 h-4 bg-green-400 rounded-full"
              />
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Lower Third - Anchor Name */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ delay: 0.7, type: 'spring' }}
        className="absolute bottom-20 left-0"
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-3 pr-16 rounded-r-full">
          <p className="text-white font-bold text-lg">{anchorName}</p>
          <p className="text-white/80 text-sm">Présentateur • {villageName}</p>
        </div>
      </motion.div>

      {/* News Ticker */}
      {newsItems.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 backdrop-blur-sm py-2 overflow-hidden">
          <motion.div
            className="flex whitespace-nowrap"
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            {newsItems.map((item, index) => (
              <span key={item.id} className="mx-8 text-white font-medium">
                {item.isBreaking && (
                  <span className="mr-2 px-2 py-0.5 bg-yellow-400 text-black rounded text-xs font-bold">
                    URGENT
                  </span>
                )}
                {item.title}
                {index < newsItems.length - 1 && <span className="ml-8">•</span>}
              </span>
            ))}
          </motion.div>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-primary/30 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-primary/30 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-primary/30 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-primary/30 rounded-br-xl" />
      </div>
    </div>
  );
};

export default StudioRenderer2D;
