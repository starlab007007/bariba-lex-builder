// src/components/tamtam/creator/TextOverlayEditor.tsx
// TikTok/Kuaishou-style text overlay editor with smart fonts

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Palette,
  Type,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// TikTok/Kuaishou-style font presets
export const FONT_PRESETS = [
  { id: "classic", name: "Classique", fontFamily: "system-ui, -apple-system, sans-serif", weight: "600" },
  { id: "bold", name: "Bold", fontFamily: "system-ui, -apple-system, sans-serif", weight: "900" },
  { id: "script", name: "Script", fontFamily: "'Dancing Script', cursive", weight: "400" },
  { id: "mono", name: "Mono", fontFamily: "'JetBrains Mono', monospace", weight: "500" },
  { id: "serif", name: "Serif", fontFamily: "Georgia, 'Times New Roman', serif", weight: "600" },
  { id: "display", name: "Display", fontFamily: "'Bebas Neue', Impact, sans-serif", weight: "400" },
  { id: "handwritten", name: "Main", fontFamily: "'Caveat', cursive", weight: "500" },
  { id: "neon", name: "Néon", fontFamily: "'Orbitron', sans-serif", weight: "600" },
] as const;

// Color presets
export const COLOR_PRESETS = [
  { id: "white", bg: "transparent", text: "#FFFFFF", stroke: "#000000" },
  { id: "black", bg: "transparent", text: "#000000", stroke: "#FFFFFF" },
  { id: "gradient1", bg: "linear-gradient(135deg, #667eea, #764ba2)", text: "#FFFFFF", stroke: "none" },
  { id: "gradient2", bg: "linear-gradient(135deg, #f093fb, #f5576c)", text: "#FFFFFF", stroke: "none" },
  { id: "gradient3", bg: "linear-gradient(135deg, #4facfe, #00f2fe)", text: "#FFFFFF", stroke: "none" },
  { id: "neon-pink", bg: "transparent", text: "#ff00ff", stroke: "#ff00ff", glow: true },
  { id: "neon-cyan", bg: "transparent", text: "#00ffff", stroke: "#00ffff", glow: true },
  { id: "gold", bg: "linear-gradient(135deg, #f5af19, #f12711)", text: "#FFFFFF", stroke: "none" },
  { id: "sunset", bg: "linear-gradient(135deg, #fa709a, #fee140)", text: "#FFFFFF", stroke: "none" },
  { id: "ocean", bg: "linear-gradient(135deg, #667eea, #764ba2)", text: "#FFFFFF", stroke: "none" },
] as const;

// Text animation presets
export const ANIMATION_PRESETS = [
  { id: "none", name: "Aucune", effect: null },
  { id: "typewriter", name: "Machine", effect: "typewriter" },
  { id: "bounce", name: "Rebond", effect: "bounce" },
  { id: "fade", name: "Fondu", effect: "fade" },
  { id: "slide", name: "Glisse", effect: "slide" },
  { id: "zoom", name: "Zoom", effect: "zoom" },
  { id: "glow", name: "Lueur", effect: "glow" },
  { id: "shake", name: "Secouer", effect: "shake" },
] as const;

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // 0-100%
  y: number; // 0-100%
  fontPreset: string;
  colorPreset: string;
  animationPreset: string;
  align: "left" | "center" | "right";
  size: number; // 12-72
  isBold: boolean;
  isItalic: boolean;
  startTime?: number;
  endTime?: number;
}

interface TextOverlayEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (overlay: TextOverlay) => void;
  initialOverlay?: Partial<TextOverlay>;
  videoDuration?: number;
}

export default function TextOverlayEditor({
  open,
  onClose,
  onSave,
  initialOverlay,
  videoDuration = 15,
}: TextOverlayEditorProps) {
  const [text, setText] = useState(initialOverlay?.text || "");
  const [fontPreset, setFontPreset] = useState(initialOverlay?.fontPreset || "classic");
  const [colorPreset, setColorPreset] = useState(initialOverlay?.colorPreset || "white");
  const [animationPreset, setAnimationPreset] = useState(initialOverlay?.animationPreset || "none");
  const [align, setAlign] = useState<"left" | "center" | "right">(initialOverlay?.align || "center");
  const [size, setSize] = useState(initialOverlay?.size || 32);
  const [isBold, setIsBold] = useState(initialOverlay?.isBold || false);
  const [isItalic, setIsItalic] = useState(initialOverlay?.isItalic || false);
  const [activeTab, setActiveTab] = useState<"fonts" | "colors" | "effects">("fonts");

  const selectedFont = FONT_PRESETS.find((f) => f.id === fontPreset) || FONT_PRESETS[0];
  const selectedColor = COLOR_PRESETS.find((c) => c.id === colorPreset) || COLOR_PRESETS[0];

  const handleSave = useCallback(() => {
    if (!text.trim()) {
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
    onClose();
  }, [text, fontPreset, colorPreset, animationPreset, align, size, isBold, isItalic, initialOverlay, videoDuration, onSave, onClose]);

  const getPreviewStyle = (): React.CSSProperties => {
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
      padding: "8px 16px",
      borderRadius: "8px",
    };
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center">
            <X className="h-6 w-6 text-white/80" />
          </button>
          <span className="text-white font-semibold">Ajouter du texte</span>
          <button
            onClick={handleSave}
            className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-full"
          >
            <Check className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="min-h-[60px] max-w-[90%] break-words"
            style={getPreviewStyle()}
          >
            {text || "Tapez votre texte..."}
          </div>
        </div>

        {/* Text input */}
        <div className="px-4 pb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tapez votre texte ici..."
            autoFocus
            className="w-full bg-white/5 border border-white/20 rounded-2xl px-4 py-3 text-white text-lg placeholder:text-white/40 outline-none resize-none min-h-[80px]"
            rows={2}
          />
        </div>

        {/* Quick formatting bar */}
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-white/10">
          <button
            onClick={() => setAlign("left")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              align === "left" ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <AlignLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setAlign("center")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              align === "center" ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <AlignCenter className="h-5 w-5" />
          </button>
          <button
            onClick={() => setAlign("right")}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              align === "right" ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <AlignRight className="h-5 w-5" />
          </button>
          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() => setIsBold((v) => !v)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isBold ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <Bold className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsItalic((v) => !v)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isItalic ? "bg-orange-500" : "bg-white/10"
            )}
          >
            <Italic className="h-5 w-5" />
          </button>
          <div className="w-px h-6 bg-white/20" />
          {/* Size slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">A</span>
            <input
              type="range"
              min="16"
              max="64"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value))}
              className="w-20 accent-orange-500"
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
                "flex-1 flex items-center justify-center gap-2 py-3 transition-colors",
                activeTab === tab.id
                  ? "text-orange-400 border-b-2 border-orange-400"
                  : "text-white/60"
              )}
            >
              {tab.icon}
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4 pb-8 safe-area-bottom overflow-x-auto">
          {activeTab === "fonts" && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {FONT_PRESETS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setFontPreset(font.id)}
                  className={cn(
                    "flex-shrink-0 px-4 py-3 rounded-xl border transition-all min-w-[80px]",
                    fontPreset === font.id
                      ? "bg-orange-500/20 border-orange-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <span
                    className="text-white text-lg block text-center"
                    style={{ fontFamily: font.fontFamily, fontWeight: font.weight }}
                  >
                    Aa
                  </span>
                  <span className="text-[10px] text-white/60 block text-center mt-1">{font.name}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "colors" && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setColorPreset(color.id)}
                  className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-xl border-2 transition-all overflow-hidden",
                    colorPreset === color.id
                      ? "border-orange-400 scale-110"
                      : "border-white/20"
                  )}
                  style={{
                    background: color.bg !== "transparent" ? color.bg : color.text,
                    boxShadow: (color as any).glow ? `0 0 15px ${color.stroke}` : undefined,
                  }}
                >
                  {color.bg === "transparent" && (
                    <span
                      className="text-xl font-bold block w-full h-full flex items-center justify-center"
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
            <div className="flex gap-3 overflow-x-auto pb-2">
              {ANIMATION_PRESETS.map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => setAnimationPreset(anim.id)}
                  className={cn(
                    "flex-shrink-0 px-4 py-3 rounded-xl border transition-all min-w-[80px]",
                    animationPreset === anim.id
                      ? "bg-orange-500/20 border-orange-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <span className="text-white text-sm block text-center">{anim.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export a simple overlay renderer
export function TextOverlayRenderer({
  overlay,
  containerWidth,
  containerHeight,
  currentTime,
}: {
  overlay: TextOverlay;
  containerWidth: number;
  containerHeight: number;
  currentTime?: number;
}) {
  const font = FONT_PRESETS.find((f) => f.id === overlay.fontPreset) || FONT_PRESETS[0];
  const color = COLOR_PRESETS.find((c) => c.id === overlay.colorPreset) || COLOR_PRESETS[0];

  // Check if visible based on time
  if (currentTime !== undefined) {
    if (overlay.startTime !== undefined && currentTime < overlay.startTime) return null;
    if (overlay.endTime !== undefined && currentTime > overlay.endTime) return null;
  }

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
    pointerEvents: "none",
    whiteSpace: "pre-wrap",
    maxWidth: "80%",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={style}
    >
      {overlay.text}
    </motion.div>
  );
}
