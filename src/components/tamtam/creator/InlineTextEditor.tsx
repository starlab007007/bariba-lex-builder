// src/components/tamtam/creator/InlineTextEditor.tsx
// Inline text editing panel - appears at bottom of screen without hiding preview

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Type,
  Palette,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FONT_PRESETS, COLOR_PRESETS, ANIMATION_PRESETS, TextOverlay } from "./TextOverlayEditor";

interface InlineTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (overlay: TextOverlay) => void;
  onTextChange?: (text: string, style: React.CSSProperties) => void;
  initialOverlay?: Partial<TextOverlay>;
  videoDuration?: number;
  isTextMode?: boolean; // Full-screen text mode (no capture)
}

export default function InlineTextEditor({
  isOpen,
  onClose,
  onSave,
  onTextChange,
  initialOverlay,
  videoDuration = 15,
  isTextMode = false,
}: InlineTextEditorProps) {
  const [text, setText] = useState(initialOverlay?.text || "");
  const [fontPreset, setFontPreset] = useState(initialOverlay?.fontPreset || "classic");
  const [colorPreset, setColorPreset] = useState(initialOverlay?.colorPreset || "white");
  const [animationPreset, setAnimationPreset] = useState(initialOverlay?.animationPreset || "none");
  const [align, setAlign] = useState<"left" | "center" | "right">(initialOverlay?.align || "center");
  const [size, setSize] = useState(initialOverlay?.size || 32);
  const [isBold, setIsBold] = useState(initialOverlay?.isBold || false);
  const [isItalic, setIsItalic] = useState(initialOverlay?.isItalic || false);
  const [activeTab, setActiveTab] = useState<"fonts" | "colors" | "effects">("fonts");

  const getPreviewStyle = useCallback((): React.CSSProperties => {
    const font = FONT_PRESETS.find((f) => f.id === fontPreset) || FONT_PRESETS[0];
    const color = COLOR_PRESETS.find((c) => c.id === colorPreset) || COLOR_PRESETS[0];

    return {
      fontFamily: font.fontFamily,
      fontWeight: isBold ? "900" : font.weight,
      fontStyle: isItalic ? "italic" : "normal",
      fontSize: `${size}px`,
      color: color.text,
      background: color.bg !== "transparent" ? color.bg : undefined,
      WebkitBackgroundClip: color.bg !== "transparent" ? "text" : undefined,
      WebkitTextFillColor: color.bg !== "transparent" ? "transparent" : undefined,
      textShadow: (color as any).glow
        ? `0 0 10px ${color.stroke}, 0 0 20px ${color.stroke}, 0 0 30px ${color.stroke}`
        : color.stroke !== "none"
          ? `2px 2px 4px ${color.stroke}`
          : undefined,
      textAlign: align,
    };
  }, [fontPreset, colorPreset, size, isBold, isItalic, align]);

  // Notify parent of style changes for live preview
  useEffect(() => {
    onTextChange?.(text, getPreviewStyle());
  }, [text, getPreviewStyle, onTextChange]);

  const handleSave = useCallback(() => {
    if (!text.trim() && !isTextMode) {
      onClose();
      return;
    }

    const overlay: TextOverlay = {
      id: initialOverlay?.id || `text-${Date.now()}`,
      text: text.trim(),
      x: initialOverlay?.x ?? 50,
      y: initialOverlay?.y ?? 50,
      fontPreset,
      colorPreset,
      animationPreset,
      align,
      size,
      isBold,
      isItalic,
      startTime: 0,
      endTime: videoDuration,
    };

    onSave(overlay);
    if (!isTextMode) onClose();
  }, [text, fontPreset, colorPreset, animationPreset, align, size, isBold, isItalic, initialOverlay, videoDuration, onSave, onClose, isTextMode]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "absolute left-0 right-0 z-50 bg-black/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10",
          isTextMode ? "bottom-20" : "bottom-0"
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header with close/save */}
        <div className="flex items-center justify-between px-4 py-2">
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
          >
            <X className="h-5 w-5 text-white/80" />
          </button>
          <span className="text-white/80 text-sm font-medium">
            {isTextMode ? "Style du texte" : "Ajouter du texte"}
          </span>
          <button
            onClick={handleSave}
            className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
          >
            <Check className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Floating text input (positioned above this panel) */}
        {!isTextMode && (
          <div className="px-4 pb-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tapez votre texte..."
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-lg placeholder:text-white/40 outline-none"
            />
          </div>
        )}

        {/* Quick formatting bar */}
        <div className="flex items-center justify-center gap-3 px-4 py-2 border-t border-white/10">
          <button
            onClick={() => setAlign("left")}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              align === "left" ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAlign("center")}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              align === "center" ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAlign("right")}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              align === "right" ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-white/20" />
          <button
            onClick={() => setIsBold((v) => !v)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              isBold ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsItalic((v) => !v)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              isItalic ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <Italic className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-white/20" />
          {/* Size slider */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/60">A</span>
            <input
              type="range"
              min="16"
              max="64"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-16 accent-orange-500 h-1"
            />
            <span className="text-sm text-white/80">A</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {[
            { id: "fonts" as const, icon: <Type className="h-4 w-4" />, label: "Polices" },
            { id: "colors" as const, icon: <Palette className="h-4 w-4" />, label: "Couleurs" },
            { id: "effects" as const, icon: <Sparkles className="h-4 w-4" />, label: "Effets" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 transition-colors",
                activeTab === tab.id
                  ? "text-orange-400 border-b-2 border-orange-400"
                  : "text-white/50"
              )}
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content - horizontal scroll */}
        <div className="px-3 py-3 pb-6 safe-area-bottom">
          {activeTab === "fonts" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FONT_PRESETS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setFontPreset(font.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 rounded-xl border transition-all min-w-[70px]",
                    fontPreset === font.id
                      ? "bg-orange-500/30 border-orange-400"
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <span
                    className="text-white text-base block text-center"
                    style={{ fontFamily: font.fontFamily, fontWeight: font.weight }}
                  >
                    Aa
                  </span>
                  <span className="text-[9px] text-white/50 block text-center mt-0.5">{font.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "colors" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setColorPreset(color.id)}
                  className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-xl border-2 transition-all overflow-hidden",
                    colorPreset === color.id
                      ? "border-orange-400 scale-110"
                      : "border-white/20"
                  )}
                  style={{
                    background: color.bg !== "transparent" ? color.bg : color.text,
                    boxShadow: (color as any).glow ? `0 0 12px ${color.stroke}` : undefined,
                  }}
                >
                  {color.bg === "transparent" && (
                    <span
                      className="text-lg font-bold flex items-center justify-center w-full h-full"
                      style={{ color: color.text === "#FFFFFF" ? "#000" : "#FFF" }}
                    >
                      A
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {activeTab === "effects" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {ANIMATION_PRESETS.map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => setAnimationPreset(anim.id)}
                  className={cn(
                    "flex-shrink-0 px-3 py-2 rounded-xl border transition-all min-w-[70px]",
                    animationPreset === anim.id
                      ? "bg-orange-500/30 border-orange-400"
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <span className="text-white text-xs block text-center">{anim.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export for use in FullscreenCreator
export { FONT_PRESETS, COLOR_PRESETS, ANIMATION_PRESETS };
