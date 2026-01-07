// ============================================================
// TEMPLATE SLOT PICKER - Kuaishou-style media picker with slot completion
// Shows "Done (0/1)" for each slot and allows media selection
// ============================================================

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Camera, Image, Video, Mic, FolderOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdvancedTemplate, KuaishouTemplateManifest } from "./AdvancedTemplateData";
import { kEngine, TemplateManifest, BoundAsset, SlotDefinition } from "./TemplateEngine";

interface TemplateSlotPickerProps {
  template: AdvancedTemplate;
  manifest: TemplateManifest;
  isOpen: boolean;
  onComplete: (boundAssets: Record<string, BoundAsset>) => void;
  onCancel: () => void;
  onCapture?: () => void; // Trigger camera capture
}

type MediaTab = "all" | "videos" | "photos";

interface GalleryItem {
  id: string;
  type: "video" | "photo";
  url: string;
  thumbnail?: string;
  duration?: number;
  file?: File;
}

const TemplateSlotPicker: React.FC<TemplateSlotPickerProps> = ({
  template,
  manifest,
  isOpen,
  onComplete,
  onCancel,
  onCapture,
}) => {
  const [activeTab, setActiveTab] = useState<MediaTab>("all");
  const [boundAssets, setBoundAssets] = useState<Record<string, BoundAsset>>({});
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get KSE card hints if available
  const kseManifest = template.engine?.variants?.[template.engine.defaultDuration];
  const cardHint = kseManifest?.cardHint;

  // Calculate slot completion
  const getSlotStatus = useCallback((slot: SlotDefinition) => {
    const asset = boundAssets[slot.id];
    const count = asset ? 1 : 0;
    return { count, required: slot.required, min: slot.min, max: slot.max };
  }, [boundAssets]);

  const allRequiredSlotsFilled = manifest.slots
    .filter(s => s.required)
    .every(s => boundAssets[s.id]);

  // Handle file selection from gallery/album
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: GalleryItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video/");
      const isPhoto = file.type.startsWith("image/");
      
      if (isVideo || isPhoto) {
        const url = URL.createObjectURL(file);
        newItems.push({
          id: `file_${Date.now()}_${i}`,
          type: isVideo ? "video" : "photo",
          url,
          file,
        });
      }
    }

    setGalleryItems(prev => [...newItems, ...prev]);
  }, []);

  // Bind media to a slot
  const bindMediaToSlot = useCallback((item: GalleryItem, slotId: string) => {
    if (!item.file) return;

    const asset: BoundAsset = {
      slotId,
      kind: "file",
      file: item.file,
      blob: item.file,
      url: item.url,
      mime: item.file.type,
    };

    setBoundAssets(prev => ({ ...prev, [slotId]: asset }));

    // Also bind to K-Engine
    kEngine.bindUserMedia(slotId, asset);

    // Auto-select next unfilled slot
    const nextSlot = manifest.slots.find(s => s.required && !boundAssets[s.id] && s.id !== slotId);
    setSelectedSlotId(nextSlot?.id || null);
  }, [manifest.slots, boundAssets]);

  // Handle item click - bind to selected slot or first available
  const handleItemClick = useCallback((item: GalleryItem) => {
    // Find target slot based on media type
    const targetSlot = selectedSlotId 
      ? manifest.slots.find(s => s.id === selectedSlotId)
      : manifest.slots.find(s => {
          const slotType = s.type;
          if (item.type === "video" && (slotType === "video" || slotType === "photo")) return !boundAssets[s.id];
          if (item.type === "photo" && slotType === "photo") return !boundAssets[s.id];
          return false;
        });

    if (targetSlot) {
      bindMediaToSlot(item, targetSlot.id);
    }
  }, [selectedSlotId, manifest.slots, boundAssets, bindMediaToSlot]);

  // Filter gallery by tab
  const filteredItems = galleryItems.filter(item => {
    if (activeTab === "all") return true;
    if (activeTab === "videos") return item.type === "video";
    if (activeTab === "photos") return item.type === "photo";
    return true;
  });

  // Complete and pass assets to parent
  const handleComplete = useCallback(() => {
    onComplete(boundAssets);
  }, [boundAssets, onComplete]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 safe-area-inset-top">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{template.emoji}</span>
              <span className="text-white font-bold">{template.label_fr}</span>
            </div>
            {cardHint && (
              <div className="flex items-center gap-2 mt-0.5 text-white/60 text-xs">
                <Camera className="h-3 w-3" />
                <span>{cardHint.inputSummary}</span>
                <span className="mx-1">•</span>
                <span>⏱️ {cardHint.timeLabel}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleComplete}
          disabled={!allRequiredSlotsFilled}
          className={cn(
            "px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 transition-all",
            allRequiredSlotsFilled
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
              : "bg-white/10 text-white/40"
          )}
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Media Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-white/5">
        {(["all", "videos", "photos"] as MediaTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-white text-black"
                : "bg-white/10 text-white/70"
            )}
          >
            {tab === "all" && "Tous"}
            {tab === "videos" && "🎬 Vidéos"}
            {tab === "photos" && "🖼️ Photos"}
          </button>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white/70 flex items-center gap-2 ml-auto"
        >
          <FolderOpen className="h-4 w-4" />
          Album
        </button>
      </div>

      {/* Slots Status Bar */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {manifest.slots.map((slot) => {
            const status = getSlotStatus(slot);
            const isFilled = status.count >= status.min;
            const isSelected = selectedSlotId === slot.id;

            return (
              <button
                key={slot.id}
                onClick={() => setSelectedSlotId(slot.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-all",
                  isSelected && "ring-2 ring-white",
                  isFilled
                    ? "bg-green-500/20 text-green-400"
                    : slot.required
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-white/10 text-white/60"
                )}
              >
                {slot.type === "video" && <Video className="h-4 w-4" />}
                {slot.type === "photo" && <Image className="h-4 w-4" />}
                {slot.type === "audio" && <Mic className="h-4 w-4" />}
                <span className="capitalize">{slot.id.replace(/_/g, " ")}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  isFilled ? "bg-green-500/30" : "bg-white/10"
                )}>
                  {isFilled ? "✓" : `${status.count}/${status.min}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <FolderOpen className="h-10 w-10 text-white/30" />
            </div>
            <p className="text-white/60 text-sm mb-4">
              Aucun média. Importe depuis ton album ou capture.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium flex items-center gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Importer
              </button>
              {onCapture && (
                <button
                  onClick={onCapture}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Capturer
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map((item) => {
              const isUsed = Object.values(boundAssets).some(a => a.url === item.url);

              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden",
                    isUsed && "ring-2 ring-green-500 opacity-50"
                  )}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      className="absolute inset-0 w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* Type badge */}
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white flex items-center gap-1">
                    {item.type === "video" ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                  </div>

                  {/* Used indicator */}
                  {isUsed && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Capture Button (if camera needed) */}
      {onCapture && (
        <div className="px-4 py-4 border-t border-white/10 safe-area-inset-bottom">
          <button
            onClick={onCapture}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg flex items-center justify-center gap-3"
          >
            <Camera className="h-6 w-6" />
            Capturer {manifest.slots[0]?.type === "photo" ? "une photo" : "une vidéo"}
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default TemplateSlotPicker;
