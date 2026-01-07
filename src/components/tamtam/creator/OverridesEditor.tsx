// ============================================================
// OVERRIDES EDITOR - Kuaishou-style simplified editor (6 buttons max)
// Shows only the allowed overrides after template is applied
// ============================================================

import React, { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Music, 
  Type, 
  MessageSquare, 
  Image, 
  RefreshCw, 
  Sparkles, 
  Sticker, 
  Check,
  ChevronRight,
  Play,
  Pause
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdvancedTemplate, KSEOverride } from "./AdvancedTemplateData";
import { kEngine, TemplateManifest, BoundAsset } from "./TemplateEngine";

interface OverridesEditorProps {
  template: AdvancedTemplate;
  manifest: TemplateManifest;
  boundAssets: Record<string, BoundAsset>;
  isOpen: boolean;
  previewCanvasRef?: React.RefObject<HTMLCanvasElement>;
  onOverride: (action: KSEOverride, data?: any) => void;
  onPublish: () => void;
  onBack: () => void;
}

interface OverrideButton {
  id: KSEOverride;
  icon: React.ReactNode;
  label: string;
  label_ba?: string;
}

const OVERRIDE_BUTTONS: OverrideButton[] = [
  { id: "music", icon: <Music className="h-5 w-5" />, label: "Musique", label_ba: "Dↄn" },
  { id: "text", icon: <Type className="h-5 w-5" />, label: "Texte", label_ba: "Sɛbɛn" },
  { id: "subtitles", icon: <MessageSquare className="h-5 w-5" />, label: "Sous-titres", label_ba: "Kuma" },
  { id: "cover", icon: <Image className="h-5 w-5" />, label: "Couverture", label_ba: "Fɔtɔ" },
  { id: "change", icon: <RefreshCw className="h-5 w-5" />, label: "Changer", label_ba: "Yɛlɛma" },
  { id: "enhance", icon: <Sparkles className="h-5 w-5" />, label: "Améliorer", label_ba: "Ɲuman" },
  { id: "stickers", icon: <Sticker className="h-5 w-5" />, label: "Stickers", label_ba: "Ja" },
];

const OverridesEditor: React.FC<OverridesEditorProps> = ({
  template,
  manifest,
  boundAssets,
  isOpen,
  previewCanvasRef,
  onOverride,
  onPublish,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<KSEOverride | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get allowed overrides from template or manifest
  const allowedOverrides = manifest.overrides || template.engine?.overrides || [
    'music', 'text', 'subtitles', 'cover', 'change', 'stickers'
  ];

  // Filter buttons to only show allowed overrides (max 6)
  const visibleButtons = OVERRIDE_BUTTONS
    .filter(btn => allowedOverrides.includes(btn.id))
    .slice(0, 6);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      kEngine.pause();
    } else {
      kEngine.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Handle override button click
  const handleOverrideClick = useCallback((action: KSEOverride) => {
    setActiveDrawer(action);
    onOverride(action);
  }, [onOverride]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 safe-area-inset-top">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Retour
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl">{template.emoji}</span>
          <span className="text-white font-medium text-sm">{template.label_fr}</span>
        </div>

        <button
          onClick={onPublish}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-sm aspect-[9/16] rounded-3xl overflow-hidden bg-white/5 border border-white/10">
          {/* K-Engine preview canvas */}
          <canvas
            ref={previewCanvasRef || canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Play/Pause overlay */}
          <button
            onClick={togglePlayback}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white ml-1" />
              )}
            </div>
          </button>

          {/* Template badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1.5">
            <span>{template.emoji}</span>
            <span>{template.label_fr}</span>
          </div>

          {/* Duration badge */}
          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/80 text-xs">
            ⏱️ {manifest.duration}s
          </div>

          {/* Hint text */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <div className="inline-block px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white/70 text-xs">
              Clique sur les sous-titres pour modifier
            </div>
          </div>
        </div>
      </div>

      {/* Overrides Toolbar */}
      <div className="px-4 py-4 border-t border-white/10 safe-area-inset-bottom">
        <div className="flex justify-center gap-3 mb-4">
          {visibleButtons.map((btn) => (
            <motion.button
              key={btn.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleOverrideClick(btn.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all",
                activeDrawer === btn.id
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {btn.icon}
              <span className="text-xs font-medium">{btn.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Post timing hint (like Kuaishou) */}
        <div className="text-center text-white/50 text-xs">
          📍 Post visible pendant 24 heures
        </div>
      </div>

      {/* Drawers for each override (simplified) */}
      {activeDrawer === "music" && (
        <MusicDrawer onClose={() => setActiveDrawer(null)} />
      )}
      {activeDrawer === "text" && (
        <TextDrawer onClose={() => setActiveDrawer(null)} />
      )}
      {activeDrawer === "subtitles" && (
        <SubtitlesDrawer onClose={() => setActiveDrawer(null)} />
      )}
    </motion.div>
  );
};

// Simple drawer components (placeholders - can be expanded)
const MusicDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ y: "100%" }}
    animate={{ y: 0 }}
    exit={{ y: "100%" }}
    className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl rounded-t-3xl p-4 border-t border-white/10"
  >
    <div className="flex items-center justify-between mb-4">
      <span className="text-white font-bold">🎵 Musique</span>
      <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <X className="h-4 w-4 text-white" />
      </button>
    </div>
    <div className="text-white/60 text-sm text-center py-8">
      Bibliothèque musicale à venir
    </div>
  </motion.div>
);

const TextDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ y: "100%" }}
    animate={{ y: 0 }}
    exit={{ y: "100%" }}
    className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl rounded-t-3xl p-4 border-t border-white/10"
  >
    <div className="flex items-center justify-between mb-4">
      <span className="text-white font-bold">📝 Texte</span>
      <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <X className="h-4 w-4 text-white" />
      </button>
    </div>
    <textarea
      placeholder="Ajouter du texte..."
      className="w-full h-32 rounded-xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/40 outline-none resize-none"
    />
    <button className="w-full mt-4 py-3 rounded-xl bg-white text-black font-bold">
      Ajouter
    </button>
  </motion.div>
);

const SubtitlesDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ y: "100%" }}
    animate={{ y: 0 }}
    exit={{ y: "100%" }}
    className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl rounded-t-3xl p-4 border-t border-white/10"
  >
    <div className="flex items-center justify-between mb-4">
      <span className="text-white font-bold">💬 Sous-titres</span>
      <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <X className="h-4 w-4 text-white" />
      </button>
    </div>
    <div className="flex gap-2 mb-4">
      <button className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm">Auto (ASR)</button>
      <button className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm">Manuel</button>
    </div>
    <div className="text-white/60 text-sm text-center py-4">
      Clique sur une ligne de sous-titre pour la modifier
    </div>
  </motion.div>
);

export default OverridesEditor;
