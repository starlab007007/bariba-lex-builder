// src/components/tamtam/creator/EditingToolbar.tsx
// Editing tools for unified live editing interface

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Volume2,
  VolumeX,
  Type,
  Music2,
  Undo2,
  Redo2,
  Sliders,
  Timer,
  Sparkles,
  Crop,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditingToolbarProps {
  hasCapture: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isMuted: boolean;
  volume: number;
  onUndo: () => void;
  onRedo: () => void;
  onSplit: () => void;
  onTrim: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onAddCaptions: () => void;
  onAddMusic: () => void;
  onAdjust: () => void;
  onSpeed: () => void;
  onEffects: () => void;
  className?: string;
}

export default function EditingToolbar({
  hasCapture,
  canUndo,
  canRedo,
  isMuted,
  volume,
  onUndo,
  onRedo,
  onSplit,
  onTrim,
  onToggleMute,
  onVolumeChange,
  onAddCaptions,
  onAddMusic,
  onAdjust,
  onSpeed,
  onEffects,
  className,
}: EditingToolbarProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  if (!hasCapture) return null;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Undo/Redo at top */}
      <div className="flex gap-1 mb-2">
        <ToolButton
          icon={<Undo2 className="h-4 w-4" />}
          label="Annuler"
          onClick={onUndo}
          disabled={!canUndo}
          small
        />
        <ToolButton
          icon={<Redo2 className="h-4 w-4" />}
          label="Refaire"
          onClick={onRedo}
          disabled={!canRedo}
          small
        />
      </div>

      {/* Main editing tools */}
      <ToolButton
        icon={<Scissors className="h-5 w-5" />}
        label="Couper"
        onClick={onSplit}
      />
      
      <ToolButton
        icon={<Crop className="h-5 w-5" />}
        label="Rogner"
        onClick={onTrim}
      />
      
      <div className="relative">
        <ToolButton
          icon={isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          label={isMuted ? "Muet" : `${volume}%`}
          onClick={onToggleMute}
          onLongPress={() => setShowVolumeSlider(true)}
          active={isMuted}
        />
        
        {/* Volume popup */}
        <AnimatePresence>
          {showVolumeSlider && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl rounded-xl p-3 border border-white/10 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                  className="w-24 accent-orange-500"
                />
                <span className="text-xs text-white/80 w-6">{volume}%</span>
                <button
                  onClick={() => setShowVolumeSlider(false)}
                  className="text-white/40 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <ToolButton
        icon={<Type className="h-5 w-5" />}
        label="Texte"
        onClick={onAddCaptions}
      />
      
      <ToolButton
        icon={<Music2 className="h-5 w-5" />}
        label="Musique"
        onClick={onAddMusic}
      />
      
      <ToolButton
        icon={<Sliders className="h-5 w-5" />}
        label="Ajuster"
        onClick={onAdjust}
      />
      
      <ToolButton
        icon={<Timer className="h-5 w-5" />}
        label="Vitesse"
        onClick={onSpeed}
      />
      
      <ToolButton
        icon={<Sparkles className="h-5 w-5" />}
        label="Effets"
        onClick={onEffects}
      />
    </div>
  );
}

// Tool Button Component
interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  small?: boolean;
  onLongPress?: () => void;
}

function ToolButton({ icon, label, onClick, disabled, active, small, onLongPress }: ToolButtonProps) {
  const timerRef = React.useRef<number | null>(null);

  const handlePointerDown = () => {
    if (onLongPress) {
      timerRef.current = window.setTimeout(() => {
        onLongPress();
      }, 500);
    }
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      onClick={onClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        small ? "px-2 py-1" : "px-1 py-2",
        disabled
          ? "opacity-30 cursor-not-allowed"
          : active
            ? "text-orange-400"
            : "text-white/80 hover:text-white"
      )}
    >
      <div
        className={cn(
          "rounded-full flex items-center justify-center transition-all",
          small
            ? "w-8 h-8 bg-white/10"
            : "w-10 h-10 bg-black/40 backdrop-blur-xl border border-white/10",
          active && "bg-orange-500/20 border-orange-500/50"
        )}
      >
        {icon}
      </div>
      <span className={cn("font-medium", small ? "text-[8px]" : "text-[10px]")}>{label}</span>
    </button>
  );
}
