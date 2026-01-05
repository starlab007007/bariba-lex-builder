// src/components/tamtam/FullscreenCreator.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

import FullscreenCreatorCapture, { type CaptureOutput } from "./FullscreenCreatorCapture";
import TimelineEditorV2, { type EditResultV2, type TimelineSegmentV2 } from "./TimelineEditor";

export type CreatorOutputPayload = {
  audio_url: string;
  media_type: "audio" | "video" | "photo" | "text";
  media_url?: string;
  transcript_fr?: string;
  transcript_ba?: string;
  template_id: string;
  topic: string;
  duration_seconds: number;
  text_content?: string;
  tags?: string[];
  challenge?: string;
  music_title?: string;
  is_story?: boolean;
  filter_applied?: string;

  // V2 extras (useful for backend later)
  v2?: {
    aspect: "9:16" | "1:1" | "16:9";
    overlaysCount: number;
    transitionsCount: number;
  };
};

interface FullscreenCreatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (data: CreatorOutputPayload) => Promise<void>;
  language?: "fr" | "ba";
}

type Step = "capture" | "editor";

function blobToObjectURL(blob: Blob) {
  return URL.createObjectURL(blob);
}

function inferDurationFromCapture(out: CaptureOutput) {
  if (out.kind === "video" || out.kind === "audio") return Math.max(1, Math.round(out.durationSec));
  return 8;
}

function defaultTopicFromMeta(meta: any) {
  return meta?.challenge ? meta.challenge : "creation";
}

export default function FullscreenCreator({ isOpen = false, onClose, onComplete, language = "fr" }: FullscreenCreatorProps) {
  const [step, setStep] = useState<Step>("capture");
  const [publishing, setPublishing] = useState(false);

  const [segments, setSegments] = useState<TimelineSegmentV2[]>([]);
  const [lastCaptureMeta, setLastCaptureMeta] = useState<any>(null);

  // Cleanup URLs
  const urlsRef = useRef<string[]>([]);
  const rememberUrl = (u: string) => {
    urlsRef.current.push(u);
    return u;
  };
  const cleanupUrls = () => {
    urlsRef.current.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch {}
    });
    urlsRef.current = [];
  };

  const resetAll = () => {
    setStep("capture");
    setSegments([]);
    setLastCaptureMeta(null);
    setPublishing(false);
    cleanupUrls();
  };

  const handleClose = () => {
    resetAll();
    onClose?.();
  };

  const onCaptured = useCallback((output: CaptureOutput) => {
    // ✅ FIX: after capture, always go to editor with segments populated
    setLastCaptureMeta(output.meta ?? null);

    if (output.kind === "text") {
      const textBlob = new Blob([output.text], { type: "text/plain" });
      const url = rememberUrl(blobToObjectURL(textBlob));
      setSegments([
        {
          id: `seg_${Date.now()}`,
          type: "text",
          blob: textBlob,
          url,
          duration: 8,
          meta: { text: output.text, filter: output.filter, captureMeta: output.meta },
        },
      ]);
      setStep("editor");
      return;
    }

    const url = rememberUrl(blobToObjectURL(output.blob));

    if (output.kind === "photo") {
      setSegments([
        {
          id: `seg_${Date.now()}`,
          type: "photo",
          blob: output.blob,
          url,
          duration: 5,
          meta: { width: output.width, height: output.height, filter: output.filter, captureMeta: output.meta },
        },
      ]);
      setStep("editor");
      return;
    }

    if (output.kind === "audio") {
      setSegments([
        {
          id: `seg_${Date.now()}`,
          type: "audio",
          blob: output.blob,
          url,
          duration: inferDurationFromCapture(output),
          meta: { filter: output.filter, captureMeta: output.meta },
        },
      ]);
      setStep("editor");
      return;
    }

    // video
    setSegments([
      {
        id: `seg_${Date.now()}`,
        type: "video",
        blob: output.blob,
        url,
        duration: inferDurationFromCapture(output),
        meta: { filter: output.filter, captureMeta: output.meta },
      },
    ]);
    setStep("editor");
  }, []);

  const publishFromEdit = useCallback(async (edit: EditResultV2) => {
    if (!onComplete) {
      console.log("[FullscreenCreator] publish payload:", edit);
      handleClose();
      return;
    }

    setPublishing(true);
    try {
      // ✅ Here: ensure "edits are applied"
      // For now (web), we send: original media_url + applied model (filter/overlays/transitions)
      // Backend can render later. UI closes immediately after success.

      const main = edit.segments[0];

      const payload: CreatorOutputPayload = {
        audio_url: edit.audioUrl || "", // can be empty if no audio
        media_type: main.type === "text" ? "text" : main.type === "photo" ? "photo" : main.type === "audio" ? "audio" : "video",
        media_url: main.url,
        template_id: edit.templateId || "kuaishou_v2",
        topic: edit.topic || defaultTopicFromMeta(lastCaptureMeta),
        duration_seconds: Math.max(1, Math.round(edit.totalDuration)),
        text_content: edit.textContent,
        tags: edit.tags,
        challenge: edit.challenge,
        music_title: edit.musicTitle,
        is_story: edit.isStory,
        filter_applied: edit.videoFilterId,
        v2: {
          aspect: edit.canvas.aspect,
          overlaysCount: edit.overlays.length,
          transitionsCount: edit.transitions.length,
        },
      };

      await onComplete(payload);
      handleClose(); // ✅ closes + resets
    } catch (e) {
      console.error(e);
      alert("Échec publication. Vérifie réseau/back-end.");
    } finally {
      setPublishing(false);
    }
  }, [onComplete, lastCaptureMeta]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black">
      <AnimatePresence mode="wait">
        {step === "capture" ? (
          <motion.div key="cap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FullscreenCreatorCapture onClose={handleClose} onCaptured={onCaptured} initialTab="Video" />
          </motion.div>
        ) : (
          <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
            <div className="absolute top-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("capture")}
                  className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                  title="Retour"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="text-white">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Éditeur V2
                  </div>
                  <div className="text-xs text-white/60">Canvas ⇠ / Effects ⇢ · drawer bas · publish fiable</div>
                </div>
              </div>

              <button
                type="button"
                disabled={publishing}
                onClick={() => {/* publish via editor confirm */}}
                className={cn(
                  "h-10 px-4 rounded-2xl text-white font-semibold flex items-center gap-2 border",
                  publishing ? "bg-white/10 border-white/10" : "bg-orange-500/90 hover:bg-orange-500 border-orange-500/30"
                )}
                onMouseDown={(e) => e.preventDefault()}
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Publier
              </button>
            </div>

            <TimelineEditorV2
              language={language}
              initialSegments={segments}
              captureMeta={lastCaptureMeta}
              publishing={publishing}
              onClose={handleClose}
              onBackToCapture={() => setStep("capture")}
              onPublish={publishFromEdit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
