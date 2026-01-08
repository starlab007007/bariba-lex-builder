// src/components/tamtam/creator/TikTokEditingBar.tsx
// Clean, minimal TikTok/Kuaishou-style editing toolbar

import React from "react";
import { motion } from "framer-motion";
import {
  Scissors,
  Volume2,
  VolumeX,
  Copy,
  Trash2,
  Type,
  Music2,
  Sparkles,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

interface TikTokEditingBarProps {
  isMuted?: boolean;
  onSplit?: () => void;
  onToggleSound?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onText?: () => void;
  onMusic?: () => void;
  onEffects?: () => void;
  onTemplate?: () => void;
  onAdjust?: () => void;
  clipCount?: number;
  className?: string;
}

export default function TikTokEditingBar({
  isMuted = false,
  onSplit,
  onToggleSound,
  onDuplicate,
  onDelete,
  onText,
  onMusic,
  onEffects,
  onTemplate,
  onAdjust,
  clipCount = 1,
  className,
}: TikTokEditingBarProps) {
  // Primary editing actions (horizontal bar at bottom)
  const primaryActions: EditAction[] = [
    {
      id: "split",
      icon: <Scissors className="h-5 w-5" />,
      label: "Split",
      onClick: () => onSplit?.(),
    },
    {
      id: "sound",
      icon: isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />,
      label: "Son",
      onClick: () => onToggleSound?.(),
      active: isMuted,
    },
    {
      id: "duplicate",
      icon: <Copy className="h-5 w-5" />,
      label: "Dupliquer",
      onClick: () => onDuplicate?.(),
    },
    {
      id: "delete",
      icon: <Trash2 className="h-5 w-5" />,
      label: "Supprimer",
      onClick: () => onDelete?.(),
    },
  ];

  // Secondary actions (right rail)
  const secondaryActions: EditAction[] = [
    {
      id: "text",
      icon: <Type className="h-5 w-5" />,
      label: "Texte",
      onClick: () => onText?.(),
    },
    {
      id: "music",
      icon: <Music2 className="h-5 w-5" />,
      label: "Musique",
      onClick: () => onMusic?.(),
    },
    {
      id: "effects",
      icon: <Sparkles className="h-5 w-5" />,
      label: "Effets",
      onClick: () => onEffects?.(),
    },
    {
      id: "template",
      icon: <Layers className="h-5 w-5" />,
      label: "Template",
      onClick: () => onTemplate?.(),
    },
    {
      id: "adjust",
      icon: <SlidersHorizontal className="h-5 w-5" />,
      label: "Ajuster",
      onClick: () => onAdjust?.(),
    },
  ];

  return (
    <>
      {/* ===== PRIMARY HORIZONTAL BAR (bottom, above timeline) ===== */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "flex items-center justify-center gap-6 py-3 px-4",
          "bg-gradient-to-t from-black/60 to-transparent",
          className
        )}
      >
        {primaryActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all active:scale-95",
              action.disabled && "opacity-30 pointer-events-none",
              action.active && "text-orange-400"
            )}
          >
            <div
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center",
                "bg-white/10 backdrop-blur-sm border border-white/20",
                "transition-all hover:bg-white/20",
                action.active && "bg-orange-500/20 border-orange-400/50"
              )}
            >
              {action.icon}
            </div>
            <span className="text-[10px] text-white/80 font-medium">{action.label}</span>
          </button>
        ))}

        {/* Clip count badge */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/10 rounded-full px-3 py-1.5">
          <span className="text-xs text-white/60">{clipCount} clip</span>
        </div>
      </motion.div>

      {/* ===== SECONDARY VERTICAL RAIL (right side) ===== */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-40">
        {secondaryActions.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "flex flex-col items-center gap-1 transition-all active:scale-95",
              action.disabled && "opacity-30 pointer-events-none",
              action.active && "text-orange-400"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                "bg-black/50 backdrop-blur-xl border border-white/10",
                "transition-all hover:bg-white/10",
                action.active && "bg-orange-500/20 border-orange-400/50"
              )}
            >
              {action.icon}
            </div>
            <span className="text-[10px] text-white/70 font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </>
  );
}
