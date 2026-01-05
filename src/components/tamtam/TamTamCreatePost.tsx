import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Mic, Square, Check, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import FullscreenCreator, { type CreatorOutputPayload } from "./FullscreenCreator";

export interface TamTamCreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitAudio?: (payload: { audio_blob: Blob; template_id: string; topic: string; duration_seconds: number; tags?: string[] }) => Promise<void>;
  onSubmitCreator?: (payload: CreatorOutputPayload) => Promise<void>;
}

const AUDIO_TEMPLATES = [
  { id: "conte_animaux", emoji: "🦁", title: "Conte des animaux" },
  { id: "origine_monde", emoji: "🌍", title: "Origine du monde" },
  { id: "heros_legendaire", emoji: "⚔️", title: "Héros légendaire" },
  { id: "annonce_generale", emoji: "📢", title: "Annonce générale" },
  { id: "alerte_meteo", emoji: "⛈️", title: "Alerte météo" },
  { id: "alerte_sanitaire", emoji: "🦠", title: "Alerte sanitaire" },
];

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const TamTamCreatePost: React.FC<TamTamCreatePostProps> = ({ isOpen, onClose, onSubmitAudio, onSubmitCreator }) => {
  const [creatorOpen, setCreatorOpen] = useState(false);

  const [templateId, setTemplateId] = useState(AUDIO_TEMPLATES[0].id);
  const [topic, setTopic] = useState("");
  const [publishing, setPublishing] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);

  const selectedTemplate = useMemo(() => AUDIO_TEMPLATES.find((t) => t.id === templateId) ?? AUDIO_TEMPLATES[0], [templateId]);

  const resetAudio = () => {
    setIsRecording(false);
    setRecSec(0);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      startTsRef.current = Date.now();

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
      };

      setIsRecording(true);
      setRecSec(0);
      mr.start(200);

      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        const d = Math.floor((Date.now() - startTsRef.current) / 1000);
        setRecSec(d);
      }, 250);
    } catch (e) {
      console.error(e);
      alert("Micro indisponible.");
    }
  };

  const stopAudioRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    try {
      if (mr.state !== "inactive") mr.stop();
    } catch {}
    setIsRecording(false);
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const publishAudio = async () => {
    if (!audioBlob) return;
    setPublishing(true);
    try {
      if (onSubmitAudio) {
        await onSubmitAudio({
          audio_blob: audioBlob,
          template_id: templateId,
          topic: topic.trim() || selectedTemplate.title,
          duration_seconds: Math.max(1, recSec),
          tags: ["audio", "tamtam", templateId],
        });
      } else {
        console.log("[TamTamCreatePost] Publish audio", { templateId, topic, recSec, audioBlob });
      }
      onClose();
      resetAudio();
    } catch (e) {
      console.error(e);
      alert("Échec publication audio.");
    } finally {
      setPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[940px] rounded-[28px] overflow-hidden border border-white/10 bg-[#0b0b0e]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="text-white">
              <div className="font-semibold">Créer un post</div>
              <div className="text-xs text-white/60">Hub clean · audio + accès capture premium</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                resetAudio();
              }}
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setCreatorOpen(true)}
                className="w-full p-4 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-orange-300" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Créateur Vidéo / Photo / Texte</div>
                    <div className="text-xs text-white/60">Panneaux swipe · capture clean · éditeur V2</div>
                  </div>
                </div>
                <span className="text-xs text-white/70">→</span>
              </motion.button>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white">
                <div className="font-semibold">Audio (rapide)</div>
                <div className="text-xs text-white/60 mt-1">Choisis un template puis enregistre.</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {AUDIO_TEMPLATES.map((t) => {
                const active = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={cn("p-3 rounded-2xl border text-left", active ? "bg-white/12 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10")}
                  >
                    <div className="text-white font-semibold text-sm flex items-center gap-2">
                      <span className="text-lg">{t.emoji}</span> {t.title}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Sujet (optionnel)…"
                className="flex-1 h-11 px-4 rounded-2xl bg-black/40 border border-white/10 text-white outline-none"
              />
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startAudioRecording}
                  className="h-11 px-4 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white font-semibold flex items-center gap-2"
                >
                  <Mic className="h-4 w-4" /> Enregistrer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="h-11 px-4 rounded-2xl bg-red-500/90 hover:bg-red-500 text-white font-semibold flex items-center gap-2"
                >
                  <Square className="h-4 w-4" /> Stop ({fmtTime(recSec)})
                </button>
              )}
            </div>

            {audioUrl ? (
              <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Preview audio</div>
                    <div className="text-xs text-white/60">{fmtTime(recSec)}</div>
                  </div>
                  <button type="button" onClick={resetAudio} className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 rounded-2xl bg-black/30 border border-white/10 p-3">
                  <audio src={audioUrl} controls className="w-full" />
                </div>

                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={resetAudio} className="h-11 px-4 rounded-2xl bg-white/10 border border-white/10 text-white">
                    Refaire
                  </button>
                  <button
                    type="button"
                    disabled={!audioBlob || publishing}
                    onClick={publishAudio}
                    className={cn("flex-1 h-11 px-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2", publishing ? "bg-white/10 border border-white/10" : "bg-orange-500/90 hover:bg-orange-500")}
                  >
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Publier
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <FullscreenCreator
        isOpen={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onComplete={async (payload) => {
          if (onSubmitCreator) await onSubmitCreator(payload);
          else console.log("[TamTamCreatePost] Creator payload", payload);
          setCreatorOpen(false);
          onClose();
          resetAudio();
        }}
        language="fr"
      />
    </div>
  );
};

export default TamTamCreatePost;
