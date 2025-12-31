import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Music, Repeat2, Timer, Flame, Eye, Sparkles, Gauge, Expand, Zap,
  ChevronDown, Camera, Play, Pause, RotateCcw, AlertCircle, Loader2, Globe,
  Wand2, Send, Radio, Image, Video, Type
} from "lucide-react";

export type VideoFilter = {
  id: string;
  label: string;
  intensity: number;
  css?: (intensity: number) => string;
};

export const VIDEO_FILTERS: VideoFilter[] = [
  { id: "none", label: "Normal", intensity: 0, css: () => "none" },
  { id: "vivid", label: "Vivid", intensity: 0.6, css: (i) => `saturate(${1 + i * 0.9}) contrast(${1 + i * 0.35})` },
  { id: "warm", label: "Warm", intensity: 0.6, css: (i) => `sepia(${0.18 + i * 0.35}) saturate(${1 + i * 0.5})` },
  { id: "cool", label: "Cool", intensity: 0.6, css: (i) => `saturate(${1 + i * 0.35}) hue-rotate(${-(10 + i * 20)}deg)` },
  { id: "bw", label: "B&W", intensity: 1, css: (i) => `grayscale(${0.35 + i * 0.65}) contrast(${1 + i * 0.2})` },
];

export function useVideoFilter() {
  const [currentFilter, setCurrentFilter] = useState<VideoFilter>(VIDEO_FILTERS[0]);
  const getFilterStyle = useCallback((f: VideoFilter, intensity: number) => {
    const css = f?.css?.(Math.max(0, Math.min(1, intensity))) ?? "none";
    return { filter: css };
  }, []);
  return { currentFilter, setCurrentFilter, getFilterStyle };
}

type AIGenType = "hashtags" | "hook" | "title" | "caption" | "script";
type TopTab = "video" | "story" | "template";
type CaptureMode = "photo" | "video" | "text";

interface FullscreenCreatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  language?: "fr" | "ba";
}

function fakeAIGenerate(type: AIGenType, topic: string, lang: "fr" | "ba"): string {
  const t = (topic || "").trim() || (lang === "ba" ? "Ìtàn" : "Histoire");
  if (type === "hashtags") return ["#TamTam", "#Afrique", "#Culture"].join(" ");
  if (type === "hook") return lang === "ba" ? `Ẹ̀gbọ́n! ${t}` : `Stop ! ${t}`;
  if (type === "title") return lang === "ba" ? `Ìdí: ${t}` : `Important: ${t}`;
  if (type === "caption") return `🟠 ${t}`;
  return `🎬 Script: ${t}`;
}

const VideoFiltersPanel: React.FC<{
  open: boolean;
  onClose: () => void;
  current: VideoFilter;
  onPick: (f: VideoFilter) => void;
  onIntensity: (n: number) => void;
}> = ({ open, onClose, current, onPick, onIntensity }) => {
  if (!open) return null;
  return (
    <motion.div className="absolute inset-0 z-50 flex items-end justify-center bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div className="w-full max-w-xl rounded-t-3xl bg-neutral-950 border border-white/10 p-4 pb-6" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-semibold">Filtres</div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {VIDEO_FILTERS.map((f) => (
            <button key={f.id} onClick={() => onPick(f)} className={`rounded-2xl px-3 py-3 text-sm border ${f.id === current.id ? "border-white/50 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/80"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-white/70 mb-2">
            <span>Intensité</span>
            <span>{Math.round(current.intensity * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={current.intensity} onChange={(e) => onIntensity(parseFloat(e.target.value))} className="w-full" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { onPick(VIDEO_FILTERS[0]); onIntensity(0); }} className="flex-1 rounded-2xl py-3 text-sm bg-white/10 text-white hover:bg-white/15">
            Réinitialiser
          </button>
          <button onClick={onClose} className="flex-1 rounded-2xl py-3 text-sm bg-white text-black hover:bg-white/90">
            OK
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AITemplatesPanel: React.FC<{
  open: boolean;
  language: "fr" | "ba";
  topic: string;
  onClose: () => void;
  onGenerated: (p: { type: AIGenType; content: string }) => void;
}> = ({ open, language, topic, onClose, onGenerated }) => {
  const [busy, setBusy] = useState<AIGenType | null>(null);
  
  const generate = useCallback(async (type: AIGenType) => {
    if (busy) return;
    setBusy(type);
    await new Promise((r) => setTimeout(r, 300));
    onGenerated({ type, content: fakeAIGenerate(type, topic, language) });
    setBusy(null);
  }, [busy, language, onGenerated, topic]);
  
  if (!open) return null;
  
  return (
    <motion.div className="absolute inset-0 z-50 bg-black/60 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
      <motion.div className="w-full max-w-2xl rounded-t-3xl bg-neutral-950 border border-white/10 p-4 pb-6" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> AI Magic
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { type: "hook" as const, label: "Hook" },
            { type: "title" as const, label: language === "ba" ? "Àkọlé" : "Titre" },
            { type: "caption" as const, label: "Caption" },
            { type: "script" as const, label: "Script" },
            { type: "hashtags" as const, label: "#Tags" },
          ].map((b) => (
            <button key={b.type} onClick={() => generate(b.type)} className="rounded-2xl py-3 text-sm border border-white/10 bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2" disabled={!!busy}>
              {busy === b.type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {b.label}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const FullscreenCreator: React.FC<FullscreenCreatorProps> = ({ isOpen = true, onClose, language = "fr" }) => {
  const { currentFilter, setCurrentFilter, getFilterStyle } = useVideoFilter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [topTab, setTopTab] = useState<TopTab>("video");
  const [mode, setMode] = useState<CaptureMode>("video");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cameraError, setCameraError] = useState("");
  
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  
  const startStream = useCallback(async () => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: mode === "video"
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraError(language === "ba" ? "Kò lè wò káméèrà" : "Caméra inaccessible");
    }
  }, [facingMode, language, mode, stopStream]);
  
  useEffect(() => {
    if (isOpen && topTab !== "template") startStream();
    return () => stopStream();
  }, [isOpen, topTab, startStream, stopStream]);
  
  const onGenerated = useCallback((p: { type: AIGenType; content: string }) => {
    if (p.type === "hashtags") {
      const hs = p.content.split(/\s+/).filter(x => x.startsWith("#"));
      setTags(prev => Array.from(new Set([...prev, ...hs])));
    } else if (p.type === "hook" || p.type === "title") {
      setTopic(p.content.split("\n")[0] || topic);
    }
  }, [topic]);
  
  const cameraFilterStyle = useMemo(() => {
    return getFilterStyle(currentFilter, currentFilter.intensity);
  }, [currentFilter, getFilterStyle]);
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
          <button onClick={onClose} className="p-2 rounded-full bg-black/30 text-white border border-white/10">
            <X className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {(["video", "story", "template"] as TopTab[]).map(t => (
              <button key={t} onClick={() => setTopTab(t)} className={`px-4 py-2 rounded-2xl text-sm border ${topTab === t ? "bg-white text-black" : "bg-white/10 text-white border-white/10"}`}>
                {t}
              </button>
            ))}
          </div>
          <button className="p-2 rounded-full bg-black/30 text-white border border-white/10">
            <Expand className="h-5 w-5" />
          </button>
        </div>
        
        <div className="absolute inset-0">
          {previewUrl ? (
            <div className="relative h-full">
              <img src={previewUrl} className="h-full w-full object-cover" alt="preview" />
              <div className="absolute top-24 left-4 right-4 flex justify-between">
                <div className="rounded-2xl bg-black/40 px-3 py-2 text-white text-xs">Preview</div>
                <button onClick={() => setPreviewUrl("")} className="rounded-2xl bg-white px-4 py-2 text-black">
                  Fermer
                </button>
              </div>
            </div>
          ) : topTab !== "template" ? (
            <div className="relative h-full">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted style={cameraFilterStyle as any} />
              <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-white/80 text-center px-6">
                <Sparkles className="h-12 w-12 mx-auto mb-4" />
                <p>Ouvre Magic pour générer du contenu AI</p>
              </div>
            </div>
          )}
        </div>
        
        {cameraError && (
          <div className="absolute top-20 left-4 right-4 z-30 rounded-2xl bg-red-500/20 border border-red-500/30 px-3 py-2 text-red-100 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{cameraError}</span>
          </div>
        )}
        
        <div className="absolute right-3 top-28 z-30 flex flex-col gap-2">
          <button onClick={() => setFacingMode(m => m === "user" ? "environment" : "user")} className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-black/20 border-white/10 text-white backdrop-blur-md">
            <Camera className="h-5 w-5" />
          </button>
          <button onClick={() => setFlashOn(f => !f)} className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-md ${flashOn ? "bg-white/20 border-white/30" : "bg-black/20 border-white/10"} text-white`}>
            <Zap className="h-5 w-5" />
          </button>
          <button onClick={() => setMagicOpen(true)} className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-md ${magicOpen ? "bg-white/20 border-white/30" : "bg-black/20 border-white/10"} text-white`}>
            <Sparkles className="h-5 w-5" />
          </button>
          <button onClick={() => setFiltersOpen(true)} className={`w-12 h-12 rounded-2xl flex items-center justify-center border backdrop-blur-md ${filtersOpen ? "bg-white/20 border-white/30" : "bg-black/20 border-white/10"} text-white`}>
            <Eye className="h-5 w-5" />
          </button>
        </div>
        
        <div className="absolute left-0 right-0 bottom-0 z-30 p-4 pb-6">
          <div className="mb-3 flex gap-2">
            {(["photo", "video", "text"] as CaptureMode[]).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-2 rounded-2xl text-xs border flex items-center gap-2 ${mode === m ? "bg-white text-black border-white" : "bg-white/10 text-white border-white/10"}`}>
                {m === "photo" && <Image className="h-4 w-4" />}
                {m === "video" && <Video className="h-4 w-4" />}
                {m === "text" && <Type className="h-4 w-4" />}
                {m}
              </button>
            ))}
          </div>
          
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-xs text-white/60 mb-1">{language === "ba" ? "Kókó" : "Sujet"}</div>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={language === "ba" ? "Kókó..." : "Sujet..."} className="w-full bg-transparent text-white outline-none" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              {isRecording && (
                <div className="px-3 py-2 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-100 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span>REC</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={() => setIsRecording(!isRecording)} className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${isRecording ? "border-red-400 bg-red-500/30" : "border-white bg-white/10"}`}>
                {isRecording ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white" />}
              </button>
              
              <button onClick={() => { setTopic(""); setTags([]); }} className="rounded-2xl px-4 py-3 bg-white/10 border border-white/10 text-white flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          <VideoFiltersPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} current={currentFilter} onPick={(f) => setCurrentFilter(f)} onIntensity={(n) => setCurrentFilter(p => ({ ...p, intensity: n }))} />
        </AnimatePresence>
        
        <AnimatePresence>
          <AITemplatesPanel open={magicOpen} language={language} topic={topic} onClose={() => setMagicOpen(false)} onGenerated={onGenerated} />
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

export default FullscreenCreator;
