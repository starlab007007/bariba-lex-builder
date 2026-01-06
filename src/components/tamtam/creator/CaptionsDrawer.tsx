// src/components/tamtam/creator/CaptionsDrawer.tsx
// Captions/subtitle manager with STT auto-generation, AI enrichment, and styles

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Mic,
  Type,
  Palette,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronUp,
  ChevronDown,
  Play,
  Loader2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export interface Caption {
  id: string;
  text: string;
  text_ba?: string;
  startTime: number;
  endTime: number;
  style: CaptionStyle;
  emoji?: string;
  animation: CaptionAnimation;
}

export interface CaptionStyle {
  color: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  position: "top" | "center" | "bottom";
  align: "left" | "center" | "right";
}

export type CaptionAnimation = "none" | "typewriter" | "fade" | "bounce" | "pop";

const DEFAULT_STYLE: CaptionStyle = {
  color: "#FFFFFF",
  backgroundColor: "rgba(0,0,0,0.6)",
  fontFamily: "Inter",
  fontSize: "medium",
  position: "bottom",
  align: "center",
};

const COLORS = [
  "#FFFFFF",
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
];

const BG_COLORS = [
  "rgba(0,0,0,0.6)",
  "rgba(0,0,0,0.8)",
  "rgba(255,255,255,0.2)",
  "rgba(255,107,107,0.6)",
  "rgba(78,205,196,0.6)",
  "transparent",
];

const FONTS = [
  { id: "Inter", name: "Inter" },
  { id: "Georgia", name: "Serif" },
  { id: "Courier New", name: "Mono" },
  { id: "Comic Sans MS", name: "Fun" },
];

const ANIMATIONS: { id: CaptionAnimation; name: string; emoji: string }[] = [
  { id: "none", name: "Aucune", emoji: "—" },
  { id: "typewriter", name: "Machine", emoji: "⌨️" },
  { id: "fade", name: "Fondu", emoji: "🌫️" },
  { id: "bounce", name: "Rebond", emoji: "🏀" },
  { id: "pop", name: "Pop", emoji: "💥" },
];

interface CaptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  captions: Caption[];
  onCaptionsChange: (captions: Caption[]) => void;
  videoDuration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function CaptionsDrawer({
  isOpen,
  onClose,
  captions,
  onCaptionsChange,
  videoDuration,
  currentTime,
  onSeek,
}: CaptionsDrawerProps) {
  const [activeTab, setActiveTab] = useState<"list" | "generate" | "styles">("list");
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [newCaptionText, setNewCaptionText] = useState("");

  const selectedCaption = captions.find((c) => c.id === selectedCaptionId);

  // Add new caption
  const addCaption = () => {
    if (!newCaptionText.trim()) return;

    const newCaption: Caption = {
      id: `caption-${Date.now()}`,
      text: newCaptionText.trim(),
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, videoDuration),
      style: { ...DEFAULT_STYLE },
      animation: "fade",
    };

    onCaptionsChange([...captions, newCaption]);
    setNewCaptionText("");
    setSelectedCaptionId(newCaption.id);
  };

  // Delete caption
  const deleteCaption = (id: string) => {
    onCaptionsChange(captions.filter((c) => c.id !== id));
    if (selectedCaptionId === id) setSelectedCaptionId(null);
  };

  // Update caption
  const updateCaption = (id: string, updates: Partial<Caption>) => {
    onCaptionsChange(
      captions.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  // Update style
  const updateStyle = (id: string, styleUpdates: Partial<CaptionStyle>) => {
    const caption = captions.find((c) => c.id === id);
    if (!caption) return;
    updateCaption(id, { style: { ...caption.style, ...styleUpdates } });
  };

  // Auto-generate captions with AI
  const generateCaptions = async () => {
    setIsGenerating(true);
    try {
      // For now, create placeholder captions based on video duration
      const numCaptions = Math.ceil(videoDuration / 5);
      const generated: Caption[] = [];

      for (let i = 0; i < numCaptions; i++) {
        generated.push({
          id: `caption-gen-${Date.now()}-${i}`,
          text: `Sous-titre ${i + 1}`,
          startTime: i * 5,
          endTime: Math.min((i + 1) * 5, videoDuration),
          style: { ...DEFAULT_STYLE },
          animation: "fade",
        });
      }

      onCaptionsChange([...captions, ...generated]);
    } catch (error) {
      console.error("Caption generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Enrich with AI emojis
  const enrichWithEmojis = async () => {
    if (captions.length === 0) return;

    setIsEnriching(true);
    try {
      const textsToEnrich = captions.map((c) => c.text).join("\n");

      const { data } = await supabase.functions.invoke("process-template", {
        body: {
          action: "generate_captions",
          inputText: textsToEnrich,
        },
      });

      if (data?.result) {
        // Parse and add emojis to captions
        const lines = typeof data.result === "string" 
          ? data.result.split("\n") 
          : [data.result];
        
        const enriched = captions.map((c, idx) => ({
          ...c,
          text: lines[idx] || c.text,
          emoji: extractEmoji(lines[idx] || ""),
        }));

        onCaptionsChange(enriched);
      }
    } catch (error) {
      console.error("Enrichment failed:", error);
    } finally {
      setIsEnriching(false);
    }
  };

  // Extract emoji from text
  const extractEmoji = (text: string): string | undefined => {
    const emojiMatch = text.match(/[\p{Emoji}]/u);
    return emojiMatch?.[0];
  };

  // Move caption up/down
  const moveCaption = (id: string, direction: "up" | "down") => {
    const idx = captions.findIndex((c) => c.id === id);
    if (idx === -1) return;
    
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= captions.length) return;

    const newCaptions = [...captions];
    [newCaptions[idx], newCaptions[newIdx]] = [newCaptions[newIdx], newCaptions[idx]];
    onCaptionsChange(newCaptions);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="absolute inset-x-0 bottom-0 z-50 bg-black/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 max-h-[70vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-orange-400" />
          <h3 className="text-white font-semibold">Sous-titres</h3>
          <span className="text-white/40 text-sm">({captions.length})</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/5">
        {[
          { id: "list", label: "Liste", icon: Type },
          { id: "generate", label: "Auto", icon: Wand2 },
          { id: "styles", label: "Styles", icon: Palette },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all",
              activeTab === tab.id
                ? "bg-orange-500/20 text-orange-400"
                : "text-white/60 hover:text-white/80"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[50vh] p-4">
        {activeTab === "list" && (
          <div className="space-y-3">
            {/* Add new caption */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCaptionText}
                onChange={(e) => setNewCaptionText(e.target.value)}
                placeholder="Nouveau sous-titre..."
                className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-orange-500/50"
                onKeyDown={(e) => e.key === "Enter" && addCaption()}
              />
              <button
                onClick={addCaption}
                disabled={!newCaptionText.trim()}
                className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center disabled:opacity-30"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Captions list */}
            {captions.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <Type className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>Aucun sous-titre</p>
                <p className="text-xs mt-1">Ajoutez-en un ou générez automatiquement</p>
              </div>
            ) : (
              <div className="space-y-2">
                {captions
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((caption, idx) => (
                    <motion.div
                      key={caption.id}
                      layout
                      className={cn(
                        "bg-white/5 rounded-xl p-3 border transition-all cursor-pointer",
                        selectedCaptionId === caption.id
                          ? "border-orange-500/50 bg-orange-500/10"
                          : "border-white/10 hover:border-white/20"
                      )}
                      onClick={() => {
                        setSelectedCaptionId(caption.id);
                        onSeek(caption.startTime);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">
                            {caption.emoji && <span className="mr-1">{caption.emoji}</span>}
                            {caption.text}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {formatTime(caption.startTime)} → {formatTime(caption.endTime)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCaption(caption.id, "up");
                            }}
                            disabled={idx === 0}
                            className="w-6 h-6 rounded bg-white/5 flex items-center justify-center disabled:opacity-30"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCaption(caption.id, "down");
                            }}
                            disabled={idx === captions.length - 1}
                            className="w-6 h-6 rounded bg-white/5 flex items-center justify-center disabled:opacity-30"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCaption(caption.id);
                            }}
                            className="w-6 h-6 rounded bg-red-500/20 text-red-400 flex items-center justify-center"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "generate" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <Wand2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Génération IA</h4>
                  <p className="text-white/60 text-xs">Créez des sous-titres automatiquement</p>
                </div>
              </div>
              <button
                onClick={generateCaptions}
                disabled={isGenerating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" />
                    Transcrire la vidéo
                  </>
                )}
              </button>
            </div>

            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Enrichir avec emojis</h4>
                  <p className="text-white/60 text-xs">Ajoutez des emojis contextuels</p>
                </div>
              </div>
              <button
                onClick={enrichWithEmojis}
                disabled={isEnriching || captions.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isEnriching ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Enrichissement...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Enrichir ({captions.length} sous-titres)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "styles" && selectedCaption && (
          <div className="space-y-4">
            {/* Color picker */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Couleur du texte</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => updateStyle(selectedCaption.id, { color })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedCaption.style.color === color
                        ? "border-white scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Background color */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Fond</label>
              <div className="flex gap-2 flex-wrap">
                {BG_COLORS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => updateStyle(selectedCaption.id, { backgroundColor: bg })}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all",
                      selectedCaption.style.backgroundColor === bg
                        ? "border-white scale-110"
                        : "border-white/20"
                    )}
                    style={{ backgroundColor: bg === "transparent" ? "transparent" : bg }}
                  >
                    {bg === "transparent" && <X className="h-4 w-4 text-white/40 mx-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Taille</label>
              <div className="flex gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateStyle(selectedCaption.id, { fontSize: size })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm transition-all",
                      selectedCaption.style.fontSize === size
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-white/5 text-white/60"
                    )}
                  >
                    {size === "small" ? "Petit" : size === "medium" ? "Moyen" : "Grand"}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Position</label>
              <div className="flex gap-2">
                {(["top", "center", "bottom"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateStyle(selectedCaption.id, { position: pos })}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm transition-all",
                      selectedCaption.style.position === pos
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-white/5 text-white/60"
                    )}
                  >
                    {pos === "top" ? "Haut" : pos === "center" ? "Centre" : "Bas"}
                  </button>
                ))}
              </div>
            </div>

            {/* Alignment */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Alignement</label>
              <div className="flex gap-2">
                {[
                  { id: "left", icon: AlignLeft },
                  { id: "center", icon: AlignCenter },
                  { id: "right", icon: AlignRight },
                ].map((align) => (
                  <button
                    key={align.id}
                    onClick={() => updateStyle(selectedCaption.id, { align: align.id as CaptionStyle["align"] })}
                    className={cn(
                      "flex-1 py-2 rounded-xl flex items-center justify-center transition-all",
                      selectedCaption.style.align === align.id
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-white/5 text-white/60"
                    )}
                  >
                    <align.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Animation */}
            <div>
              <label className="text-white/60 text-xs mb-2 block">Animation</label>
              <div className="grid grid-cols-5 gap-2">
                {ANIMATIONS.map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => updateCaption(selectedCaption.id, { animation: anim.id })}
                    className={cn(
                      "py-2 rounded-xl flex flex-col items-center gap-1 transition-all",
                      selectedCaption.animation === anim.id
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-white/5 text-white/60"
                    )}
                  >
                    <span className="text-lg">{anim.emoji}</span>
                    <span className="text-[10px]">{anim.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-black/50 rounded-2xl p-4 border border-white/10">
              <label className="text-white/60 text-xs mb-2 block">Aperçu</label>
              <div
                className="py-4 rounded-xl text-center"
                style={{
                  backgroundColor: selectedCaption.style.backgroundColor,
                  textAlign: selectedCaption.style.align,
                }}
              >
                <span
                  style={{
                    color: selectedCaption.style.color,
                    fontFamily: selectedCaption.style.fontFamily,
                    fontSize:
                      selectedCaption.style.fontSize === "small"
                        ? "14px"
                        : selectedCaption.style.fontSize === "medium"
                        ? "18px"
                        : "24px",
                  }}
                >
                  {selectedCaption.emoji && <span className="mr-1">{selectedCaption.emoji}</span>}
                  {selectedCaption.text}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "styles" && !selectedCaption && (
          <div className="text-center py-8 text-white/40">
            <Palette className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Sélectionnez un sous-titre</p>
            <p className="text-xs mt-1">pour modifier son style</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
