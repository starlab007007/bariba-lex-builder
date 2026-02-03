/**
 * Animation Preview Component
 * Real-time preview of the animated story
 */

import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Download, Share2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AnimationPreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isPlaying: boolean;
  isRendering: boolean;
  progress: number;
  message: string;
  onPlay: () => void;
  onPause: () => void;
  onExport: () => void;
  onShare: () => void;
  onReset: () => void;
}

export function AnimationPreview({
  canvasRef,
  isPlaying,
  isRendering,
  progress,
  message,
  onPlay,
  onPause,
  onExport,
  onShare,
  onReset
}: AnimationPreviewProps) {
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handleCanvasClick = () => {
    if (isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  if (isRendering) {
    return (
      <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-gradient-to-b from-amber-950 to-black">
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="w-full h-full object-cover opacity-50"
        />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center px-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            </div>
            
            <h3 className="text-lg font-medium text-amber-100 mb-2">
              🌟 Magie en cours...
            </h3>
            
            <Progress 
              value={progress * 100} 
              className="w-full max-w-xs mx-auto h-2 bg-amber-950"
            />
            
            <p className="text-sm text-amber-200/60 mt-2">
              {message || `${Math.round(progress * 100)}%`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-black"
      onClick={handleCanvasClick}
    >
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        className="w-full h-full object-cover"
      />
      
      {/* Controls overlay */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              className="text-white hover:bg-white/20"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Nouveau
            </Button>
          </div>
        </div>

        {/* Center play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              isPlaying ? onPause() : onPlay(); 
            }}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all",
              "bg-amber-500/80 hover:bg-amber-500 backdrop-blur-sm",
              isPlaying && "bg-white/30 hover:bg-white/40"
            )}
          >
            {isPlaying ? (
              <Pause className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-black ml-1" />
            )}
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress bar */}
          <div className="mb-4">
            <Progress 
              value={progress * 100} 
              className="w-full h-1 bg-white/20"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={(e) => { e.stopPropagation(); onShare(); }}
              className="flex-1 max-w-32 bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            <Button
              size="lg"
              onClick={(e) => { e.stopPropagation(); onExport(); }}
              className="flex-1 max-w-32 bg-amber-500 text-black hover:bg-amber-400"
            >
              <Download className="w-4 h-4 mr-2" />
              Sauver
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
