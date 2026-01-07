// src/components/tamtam/creator/MiniTimeline.tsx
// Compact timeline for unified live editing interface

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Scissors, Volume2, VolumeX, Trash2, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MiniTimelineSegment {
  id: string;
  duration: number;
  startTime: number;
  endTime: number;
  isMuted: boolean;
  volume: number;
  type: "video" | "photo" | "audio";
  thumbnailUrl?: string;
  blob?: Blob; // Media blob for upload
}

interface MiniTimelineProps {
  segments: MiniTimelineSegment[];
  activeSegmentId: string | null;
  currentTime: number;
  totalDuration: number;
  onSelectSegment: (id: string) => void;
  onSplit: (segmentId: string, time: number) => void;
  onTrim: (segmentId: string, start: number, end: number) => void;
  onVolumeChange: (segmentId: string, volume: number) => void;
  onToggleMute: (segmentId: string) => void;
  onDelete: (segmentId: string) => void;
  onDuplicate: (segmentId: string) => void;
  onSeek: (time: number) => void;
  className?: string;
}

export default function MiniTimeline({
  segments,
  activeSegmentId,
  currentTime,
  totalDuration,
  onSelectSegment,
  onSplit,
  onTrim,
  onVolumeChange,
  onToggleMute,
  onDelete,
  onDuplicate,
  onSeek,
  className,
}: MiniTimelineProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState<string | null>(null);
  const [trimMode, setTrimMode] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const activeSegment = segments.find(s => s.id === activeSegmentId);
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || totalDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(percent * totalDuration);
  };

  const handleSplit = () => {
    if (activeSegmentId && currentTime > 0) {
      onSplit(activeSegmentId, currentTime);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between px-2 pb-2 gap-1">
        {/* Left: Segment info */}
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Center: Quick tools */}
        <div className="flex items-center gap-1">
          <QuickActionBtn
            icon={<Scissors className="h-4 w-4" />}
            label="Split"
            onClick={handleSplit}
            disabled={!activeSegmentId || currentTime <= 0}
          />
          <QuickActionBtn
            icon={activeSegment?.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            label="Son"
            onClick={() => activeSegmentId && onToggleMute(activeSegmentId)}
            active={activeSegment?.isMuted}
            disabled={!activeSegmentId}
            onLongPress={() => activeSegmentId && setShowVolumeSlider(activeSegmentId)}
          />
          <QuickActionBtn
            icon={<Copy className="h-4 w-4" />}
            label="Dupliquer"
            onClick={() => activeSegmentId && onDuplicate(activeSegmentId)}
            disabled={!activeSegmentId}
          />
          <QuickActionBtn
            icon={<Trash2 className="h-4 w-4" />}
            label="Supprimer"
            onClick={() => activeSegmentId && onDelete(activeSegmentId)}
            disabled={!activeSegmentId || segments.length <= 1}
            destructive
          />
        </div>

        {/* Right: Segments counter */}
        <div className="flex items-center gap-1 text-xs text-white/60">
          <span>{segments.length}</span>
          <span>clip{segments.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Timeline Track - More transparent/visible */}
      <div
        ref={timelineRef}
        className="relative h-16 rounded-xl overflow-hidden cursor-pointer"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
        }}
        onClick={handleTimelineClick}
      >
        {/* Segments */}
        <div className="absolute inset-0 flex">
          {segments.map((seg, idx) => {
            const segStart = seg.startTime;
            const segWidth = totalDuration > 0 ? ((seg.endTime - seg.startTime) / totalDuration) * 100 : 100 / segments.length;
            const isActive = seg.id === activeSegmentId;

            return (
              <motion.div
                key={seg.id}
                className={cn(
                  "relative h-full transition-all",
                  idx < segments.length - 1 && "border-r-2 border-white/20"
                )}
                style={{ 
                  width: `${segWidth}%`,
                  background: isActive 
                    ? 'linear-gradient(180deg, rgba(249,115,22,0.4) 0%, rgba(249,115,22,0.2) 100%)'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)',
                  boxShadow: isActive ? 'inset 0 0 0 2px rgba(249,115,22,0.8)' : 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSegment(seg.id);
                }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Segment thumbnail or color */}
                {seg.thumbnailUrl ? (
                  <img
                    src={seg.thumbnailUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className={cn(
                    "absolute inset-0",
                    seg.type === "video" 
                      ? "bg-gradient-to-b from-blue-400/30 via-purple-400/20 to-transparent" 
                      : seg.type === "photo" 
                        ? "bg-gradient-to-b from-green-400/30 via-teal-400/20 to-transparent" 
                        : "bg-gradient-to-b from-orange-400/30 via-red-400/20 to-transparent"
                  )} />
                )}

                {/* Mute indicator */}
                {seg.isMuted && (
                  <div className="absolute top-1 right-1">
                    <VolumeX className="h-3 w-3 text-white/60" />
                  </div>
                )}

                {/* Segment index */}
                <div className="absolute bottom-1 left-1 text-[10px] text-white/60 font-medium">
                  {idx + 1}
                </div>

                {/* Trim handles (if in trim mode) */}
                {trimMode === seg.id && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-orange-500/80 cursor-ew-resize flex items-center justify-center">
                      <ChevronLeft className="h-3 w-3" />
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-orange-500/80 cursor-ew-resize flex items-center justify-center">
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Playhead - More visible */}
        <motion.div
          className="absolute top-0 bottom-0 w-1 z-10"
          style={{ 
            left: `${progressPercent}%`,
            background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(249,115,22,0.4)',
          }}
          animate={{ left: `${progressPercent}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Playhead handle - Larger */}
          <div 
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg"
            style={{
              background: 'linear-gradient(180deg, #fff 0%, #f97316 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          />
          <div 
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full shadow-lg"
            style={{
              background: 'linear-gradient(180deg, #f97316 0%, #fff 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          />
        </motion.div>
      </div>

      {/* Volume Slider Popup */}
      {showVolumeSlider && activeSegment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-black/90 backdrop-blur-xl rounded-xl p-3 border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-white/60" />
            <input
              type="range"
              min="0"
              max="100"
              value={activeSegment.volume}
              onChange={(e) => onVolumeChange(activeSegment.id, parseInt(e.target.value))}
              className="w-32 accent-orange-500"
            />
            <span className="text-sm text-white/80 w-8">{activeSegment.volume}%</span>
            <button
              onClick={() => setShowVolumeSlider(null)}
              className="text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Quick Action Button
interface QuickActionBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
  onLongPress?: () => void;
}

function QuickActionBtn({ icon, label, onClick, disabled, active, destructive, onLongPress }: QuickActionBtnProps) {
  const timerRef = useRef<number | null>(null);

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
        "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all",
        disabled
          ? "opacity-30 cursor-not-allowed"
          : active
            ? "bg-orange-500/30 text-orange-400"
            : destructive
              ? "hover:bg-red-500/20 text-white/80 hover:text-red-400"
              : "hover:bg-white/10 text-white/80"
      )}
    >
      {icon}
      <span className="text-[9px]">{label}</span>
    </button>
  );
}
