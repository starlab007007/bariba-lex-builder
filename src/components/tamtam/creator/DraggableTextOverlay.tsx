// src/components/tamtam/creator/DraggableTextOverlay.tsx
// Draggable text overlay component for repositioning text with touch/mouse

import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FONT_PRESETS, COLOR_PRESETS, TextOverlay } from "./TextOverlayEditor";
import { GripVertical, Trash2, Edit3 } from "lucide-react";

interface DraggableTextOverlayProps {
  overlay: TextOverlay;
  containerRef: React.RefObject<HTMLDivElement>;
  currentTime?: number;
  isEditing?: boolean;
  onPositionChange?: (id: string, x: number, y: number) => void;
  onEdit?: (overlay: TextOverlay) => void;
  onDelete?: (id: string) => void;
}

export default function DraggableTextOverlay({
  overlay,
  containerRef,
  currentTime,
  isEditing = false,
  onPositionChange,
  onEdit,
  onDelete,
}: DraggableTextOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const font = FONT_PRESETS.find((f) => f.id === overlay.fontPreset) || FONT_PRESETS[0];
  const color = COLOR_PRESETS.find((c) => c.id === overlay.colorPreset) || COLOR_PRESETS[0];

  // Check if visible based on time
  if (currentTime !== undefined) {
    if (overlay.startTime !== undefined && currentTime < overlay.startTime) return null;
    if (overlay.endTime !== undefined && currentTime > overlay.endTime) return null;
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isEditing || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: overlay.x,
      startY: overlay.y,
    };
    
    setIsDragging(true);
    
    // Capture pointer for smooth tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isEditing, containerRef, overlay.x, overlay.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
    
    const newX = Math.max(5, Math.min(95, dragStartRef.current.startX + deltaX));
    const newY = Math.max(5, Math.min(95, dragStartRef.current.startY + deltaY));
    
    onPositionChange?.(overlay.id, newX, newY);
  }, [isDragging, containerRef, overlay.id, onPositionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [isDragging]);

  const handleTap = useCallback(() => {
    if (isEditing && !isDragging) {
      setShowControls(prev => !prev);
    }
  }, [isEditing, isDragging]);

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${overlay.x}%`,
    top: `${overlay.y}%`,
    transform: "translate(-50%, -50%)",
    fontFamily: font.fontFamily,
    fontWeight: overlay.isBold ? "900" : font.weight,
    fontStyle: overlay.isItalic ? "italic" : "normal",
    fontSize: `${overlay.size}px`,
    color: color.text,
    textAlign: overlay.align,
    textShadow: (color as any).glow
      ? `0 0 10px ${color.stroke}, 0 0 20px ${color.stroke}`
      : color.stroke !== "none"
        ? `2px 2px 4px ${color.stroke}`
        : undefined,
    whiteSpace: "pre-wrap",
    maxWidth: "80%",
    cursor: isEditing ? (isDragging ? "grabbing" : "grab") : "default",
    userSelect: "none",
    touchAction: "none",
  };

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: isDragging ? 1.05 : 1,
        boxShadow: isDragging ? "0 8px 32px rgba(0,0,0,0.3)" : "none"
      }}
      style={style}
      className={cn(
        "transition-shadow",
        isEditing && "ring-2 ring-orange-400/50 rounded-lg px-2 py-1",
        isDragging && "ring-orange-500 z-50"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleTap}
    >
      {/* Drag handle indicator */}
      {isEditing && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
          <GripVertical className="h-3 w-3 text-white/60" />
          <span className="text-[10px] text-white/60">Glisser</span>
        </div>
      )}

      {/* Text content */}
      {overlay.text}

      {/* Edit/Delete controls */}
      {isEditing && showControls && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(overlay);
            }}
            className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg"
          >
            <Edit3 className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(overlay.id);
            }}
            className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
          >
            <Trash2 className="h-4 w-4 text-white" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ✅ Inline preview overlay (for live editing - draggable)
export function DraggablePreviewOverlay({
  text,
  style,
  position,
  containerRef,
  onPositionChange,
}: {
  text: string;
  style: React.CSSProperties;
  position: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  onPositionChange?: (x: number, y: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: position.x,
      startY: position.y,
    };
    
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [containerRef, position.x, position.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStartRef.current.y) / rect.height) * 100;
    
    const newX = Math.max(5, Math.min(95, dragStartRef.current.startX + deltaX));
    const newY = Math.max(5, Math.min(95, dragStartRef.current.startY + deltaY));
    
    onPositionChange?.(newX, newY);
  }, [isDragging, containerRef, onPositionChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [isDragging]);

  if (!text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: isDragging ? 1.05 : 1 
      }}
      className={cn(
        "absolute z-40 cursor-grab select-none touch-none transition-all",
        isDragging && "cursor-grabbing ring-2 ring-orange-400 rounded-lg shadow-xl"
      )}
      style={{
        ...style,
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: "translate(-50%, -50%)",
        maxWidth: "80%",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Drag indicator ring */}
      <div className={cn(
        "absolute inset-0 -m-2 rounded-lg border-2 border-dashed border-white/30 pointer-events-none",
        isDragging && "border-orange-400"
      )} />
      
      {text}
    </motion.div>
  );
}
