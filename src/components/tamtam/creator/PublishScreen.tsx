// src/components/tamtam/creator/PublishScreen.tsx
// Fullscreen publish screen with differentiation for text/photo/video

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  MapPin,
  Users,
  Lock,
  Globe,
  Hash,
  Sparkles,
  Palette,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Type,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Caption } from "./CaptionsDrawer";
import { SelectedMusic } from "./MusicDrawer";
import { CaptureEffects } from "./CreatorEffectsData";

interface PublishScreenProps {
  isOpen: boolean;
  mediaType: "video" | "photo" | "text";
  previewUrl: string;
  textContent?: string;
  caption: string;
  effects: CaptureEffects;
  selectedMusic?: SelectedMusic | null;
  captions?: Caption[];
  cssFilter?: string;
  onCaptionChange: (caption: string) => void;
  onPublish: () => Promise<void>;
  onBack: () => void;
  isPublishing?: boolean;
  error?: string | null;
}

type Visibility = "public" | "friends" | "private";

const TEXT_BACKGROUNDS = [
  { id: "gradient-1", style: "bg-gradient-to-br from-orange-500 via-red-500 to-purple-600" },
  { id: "gradient-2", style: "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" },
  { id: "gradient-3", style: "bg-gradient-to-br from-green-400 via-teal-500 to-blue-500" },
  { id: "gradient-4", style: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500" },
  { id: "gradient-5", style: "bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600" },
  { id: "solid-dark", style: "bg-slate-900" },
  { id: "solid-warm", style: "bg-amber-900" },
];

const SUGGESTED_HASHTAGS = [
  "#TamTam",
  "#Bénin",
  "#Bariba",
  "#VillageLife",
  "#AfriqueOuest",
  "#Culture",
  "#Tradition",
  "#Communauté",
];

export default function PublishScreen({
  isOpen,
  mediaType,
  previewUrl,
  textContent,
  caption,
  effects,
  selectedMusic,
  captions,
  cssFilter,
  onCaptionChange,
  onPublish,
  onBack,
  isPublishing = false,
  error,
}: PublishScreenProps) {
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [location, setLocation] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [textBgIndex, setTextBgIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);

  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Toggle video playback
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Add hashtag to caption
  const addHashtag = (tag: string) => {
    if (!caption.includes(tag)) {
      onCaptionChange(caption ? `${caption} ${tag}` : tag);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    await onPublish();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black"
    >
      {/* ===== FULLSCREEN MEDIA PREVIEW ===== */}
      <div className="absolute inset-0">
        {mediaType === "text" ? (
          // TEXT MODE - Colored background with styled text
          <div className={cn("absolute inset-0", TEXT_BACKGROUNDS[textBgIndex].style)}>
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="max-w-lg">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                  <p className="text-white text-2xl md:text-3xl font-semibold text-center leading-relaxed">
                    {textContent || "Votre texte"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : mediaType === "video" ? (
          // VIDEO MODE - Fullscreen video
          <video
            ref={videoRef}
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ filter: cssFilter }}
            playsInline
            loop
            onClick={togglePlay}
          />
        ) : (
          // PHOTO MODE - Fullscreen image
          <img
            src={previewUrl}
            alt="Preview"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ filter: cssFilter }}
          />
        )}

        {/* Gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
      </div>

      {/* ===== HEADER ===== */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-area-top">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button
            onClick={onBack}
            className="h-11 px-4 rounded-full bg-black/40 backdrop-blur-xl flex items-center gap-2 text-white"
          >
            <X className="h-4 w-4" />
            <span className="text-sm">Retour</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-xl">
            {mediaType === "text" ? (
              <Type className="h-4 w-4 text-orange-400" />
            ) : mediaType === "video" ? (
              <Video className="h-4 w-4 text-orange-400" />
            ) : (
              <ImageIcon className="h-4 w-4 text-orange-400" />
            )}
            <span className="text-white text-sm capitalize">{mediaType}</span>
          </div>
        </div>
      </div>

      {/* ===== VIDEO CONTROLS (only for video) ===== */}
      {mediaType === "video" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </button>
        </div>
      )}

      {/* Volume control for video */}
      {mediaType === "video" && (
        <button
          onClick={toggleMute}
          className="absolute top-20 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl flex items-center justify-center"
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5 text-white" />
          ) : (
            <Volume2 className="h-5 w-5 text-white" />
          )}
        </button>
      )}

      {/* ===== TEXT BACKGROUND SELECTOR (only for text mode) ===== */}
      {mediaType === "text" && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
          <div className="flex flex-col gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-xl">
            <Palette className="h-4 w-4 text-white/60 mx-auto mb-1" />
            {TEXT_BACKGROUNDS.map((bg, idx) => (
              <button
                key={bg.id}
                onClick={() => setTextBgIndex(idx)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all",
                  bg.style,
                  textBgIndex === idx ? "border-white scale-110" : "border-transparent"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* ===== BOTTOM PANEL ===== */}
      <div className="absolute bottom-0 left-0 right-0 z-10 safe-area-bottom">
        <div className="bg-black/60 backdrop-blur-xl rounded-t-3xl border-t border-white/10 p-4 space-y-4">
          {/* Music indicator */}
          {selectedMusic && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/30">
              <span className="text-xl">🎵</span>
              <span className="text-orange-300 text-sm flex-1 truncate">
                {selectedMusic.track?.name || selectedMusic.customName}
              </span>
            </div>
          )}

          {/* Caption input */}
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Ajoute une description..."
              className="w-full min-h-[80px] rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/40 outline-none resize-none"
            />
            <button
              onClick={() => setShowHashtags(!showHashtags)}
              className={cn(
                "absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all",
                showHashtags ? "bg-orange-500 text-white" : "bg-white/10 text-white/60"
              )}
            >
              <Hash className="h-4 w-4" />
            </button>
          </div>

          {/* Hashtag suggestions */}
          <AnimatePresence>
            {showHashtags && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_HASHTAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addHashtag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-all",
                        caption.includes(tag)
                          ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : "bg-white/5 text-white/60 hover:text-white/80"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options row */}
          <div className="flex items-center gap-2">
            {/* Location */}
            {showLocationInput ? (
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Nom du lieu..."
                  className="flex-1 bg-white/5 rounded-xl px-3 py-2 text-white text-sm outline-none border border-white/10"
                  autoFocus
                />
                <button
                  onClick={() => setShowLocationInput(false)}
                  className="px-3 py-2 rounded-xl bg-orange-500 text-white text-sm"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLocationInput(true)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all",
                  location
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-white/5 text-white/60"
                )}
              >
                <MapPin className="h-4 w-4" />
                {location || "Lieu"}
              </button>
            )}

            {/* Tag friends */}
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/60 text-sm">
              <Users className="h-4 w-4" />
              Tag
            </button>

            {/* Visibility */}
            <div className="flex items-center rounded-xl bg-white/5 overflow-hidden">
              {[
                { id: "public", icon: Globe, label: "Public" },
                { id: "friends", icon: Users, label: "Amis" },
                { id: "private", icon: Lock, label: "Privé" },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVisibility(v.id as Visibility)}
                  className={cn(
                    "px-3 py-2 flex items-center gap-1.5 text-sm transition-all",
                    visibility === v.id
                      ? "bg-orange-500 text-white"
                      : "text-white/60"
                  )}
                >
                  <v.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-orange-500/25"
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Publication...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Publier
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
