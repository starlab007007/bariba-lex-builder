// src/components/tamtam/TamTamCreatePost.tsx
import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mic, Square, Play, Radio, Sparkles, Camera, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import FullscreenCreator, { type CreatorOutputPayload } from "./FullscreenCreator";
export type { CreatorOutputPayload };

type CreateStep = "hub" | "audioRecord" | "audioPreview";

export interface TamTamCreatePostProps {
  isOpen: boolean;
  onClose: () => void;

  // Hub audio : callback pour publier un contenu audio
  onSubmitAudio?: (payload: {
    audio_blob: Blob;
    template_id: string;
    topic: string;
    duration_seconds: number;
    tags?: string[];
  }) => Promise<void>;

  // Nouveau : publier depuis le Creator vidéo/photo/text
  onSubmitCreator?: (payload: CreatorOutputPayload) => Promise<void>;
}

const AUDIO_TEMPLATES = [
  { id: "conte_animaux", emoji: "🦁", title: "Conte des animaux", desc: "Narration + voix + morale" },
  { id: "origine_monde", emoji: "🌍", title: "Origine du monde", desc: "Histoire fondatrice" },
  { id: "heros_legendaire", emoji: "⚔️", title: "Héros légendaire", desc: "Épopée + courage" },
  { id: "reunion", emoji: "👥", title: "Réunion", desc: "Annonce + points clés" },
  { id: "jour_marche", emoji: "🏪", title: "Jour de marché", desc: "Promotion + prix + lieu" },
  { id: "travaux_collectifs", emoji: "🔨", title: "Travaux collectifs", desc: "Mobilisation communautaire" },
  { id: "visite_importante", emoji: "🚗", title: "Visite importante", desc: "Accueil + agenda" },
  { id: "annonce_generale", emoji: "📢", title: "Annonce générale", desc: "Message public" },
  { id: "naissance", emoji: "👶", title: "Naissance", desc: "Félicitations" },
  { id: "mariage", emoji: "💒", title: "Mariage", desc: "Invitation" },
  { id: "reussite_scolaire", emoji: "🎓", title: "Réussite scolaire", desc: "Bravo + encouragement" },
  { id: "guerison", emoji: "💪", title: "Guérison", desc: "Bonne nouvelle" },
  { id: "bonne_nouvelle", emoji: "🎉", title: "Bonne nouvelle", desc: "Annonce joyeuse" },
  { id: "aide_sante", emoji: "🏥", title: "Aide santé", desc: "Information + assistance" },
  { id: "aide_financiere", emoji: "💰", title: "Aide financière", desc: "Soutien + appel" },
  { id: "alerte_meteo", emoji: "⛈️", title: "Alerte météo", desc: "Prévention" },
  { id: "alerte_sanitaire", emoji: "🦠", title: "Alerte sanitaire", desc: "Protection" },
  { id: "vol_insecurite", emoji: "🚨", title: "Vol / Insécurité", desc: "Signalement" },
];

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ✅ IMPORTANT : export nommé attendu par TamTamHome.tsx
export const TamTamCreatePost: React.FC<TamTamCreatePostProps> = ({
  isOpen,
  onClose,
  onSubmitAudio,
  onSubmitCreator,
}) => {
  const [step, setStep] = useState<CreateStep>("hub");

  // Video creator modal
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Audio hub
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(AUDIO_TEMPLATES[0].id);
  const selectedTemplate = useMemo(
    () => AUDIO_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? AUDIO_TEMPLATES[0],
    [selectedTemplateId]
  );

  const [topic, setTopic] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [recSec, setRecSec] = useState(0);
  const [publishing, setPublishing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const tickRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);

  const resetAll = () => {
    setStep("hub");
    setSelectedTemplateId(AUDIO_TEMPLATES[0].id);
    setTopic("");
    setIsRecording(false);
    setRecSec(0);

    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = null;

    chunksRef.current = [];
    mediaRecorderRef.current = null;

    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");

    setPublishing(false);
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

        const durationSec = Math.max(1, Math.round((Date.now() - startTsRef.current) / 1000));
        setRecSec(durationSec);
        setStep("audioPreview");
      };

      setIsRecording(true);
      setRecSec(0);
      setStep("audioRecord");
      mr.start(200);

      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = window.setInterval(() => {
        const d = Math.floor((Date.now() - startTsRef.current) / 1000);
        setRecSec(d);
      }, 250);
    } catch (e) {
      console.error(e);
      alert("Micro indisponible. Autorise l’accès au micro.");
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
          template_id: selectedTemplateId,
          topic: topic.trim() || selectedTemplate.title,
          duration_seconds: recSec || 1,
          tags: ["audio", "tamtam", selectedTemplateId],
        });
      } else {
        console.log("[TamTamCreatePost] Publish audio:", {
          template_id: selectedTemplateId,
          topic,
          duration: recSec,
          blob: audioBlob,
        });
      }

      onClose();
      resetAll();
    } catch (e) {
      console.error(e);
      alert("Échec publication audio. Réessaie.");
    } finally {
      setPublishing(false);
    }
  };

  // Don't render content when closed, but DON'T return early to avoid hook violations
  // Instead, wrap the entire rendered content in AnimatePresence

  return (
    <AnimatePresence>
      {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur"
    >
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-[920px] rounded-[28px] overflow-hidden border border-white/10 bg-[#0b0b0e]"
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div className="text-white">
              <div className="font-semibold">Créer un post</div>
              <div className="text-xs text-white/60">Hub audio + accès vidéo/story/template/live</div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                resetAll();
              }}
              className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
              title="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            {/* Access video creator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setCreatorOpen(true)}
                className="w-full p-4 rounded-2xl bg-white/10 border border-white/15 text-white flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Vidéo / Story / Template / Live</div>
                    <div className="text-xs text-white/70">Capture plein écran + montage (Kuaishou-like)</div>
                  </div>
                </div>
                <Sparkles className="w-5 h-5 opacity-80" />
              </motion.button>

              <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white">
                <div className="font-semibold flex items-center gap-2">
                  <Radio className="w-4 h-4" /> Audio-first
                </div>
                <div className="text-xs text-white/70 mt-1">
                  Sélectionne un template, enregistre la voix, puis publie.
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    className="h-10 px-3 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" /> Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("hub")}
                    className="h-10 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm"
                  >
                    Choisir template
                  </button>
                </div>
              </div>
            </div>

            {/* Audio templates */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-3">
                <div className="text-white font-semibold">Templates audio</div>
                <div className="text-xs text-white/60">Basé sur tes catégories</div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-auto pr-1">
                  {AUDIO_TEMPLATES.map((t) => {
                    const active = t.id === selectedTemplateId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={cn(
                          "w-full text-left rounded-2xl p-3 border transition",
                          active ? "bg-white/15 border-white/25" : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="text-white font-semibold">
                          {t.emoji} {t.title}
                        </div>
                        <div className="text-xs text-white/70 mt-1">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-white">
                <div className="font-semibold">Détails</div>

                <div className="mt-3">
                  <div className="text-xs text-white/70 mb-1">Sujet / Objet</div>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full h-11 rounded-2xl bg-black/40 border border-white/10 text-white px-3 outline-none text-sm"
                    placeholder={`Ex: ${selectedTemplate.title}`}
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    className="flex-1 h-11 rounded-2xl bg-orange-500/90 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" /> Enregistrer
                  </button>
                  {audioBlob ? (
                    <button
                      type="button"
                      onClick={() => setStep("audioPreview")}
                      className="h-11 px-3 rounded-2xl bg-white/10 border border-white/10 text-white text-sm flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" /> Preview
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Audio record / preview modals */}
            <AnimatePresence>
              {step === "audioRecord" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="fixed inset-0 z-[85] bg-black/70 backdrop-blur flex items-center justify-center p-4"
                >
                  <div className="w-full max-w-[560px] rounded-[28px] bg-[#0b0b0e] border border-white/10 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <Mic className="w-4 h-4" /> Enregistrement audio
                        </div>
                        <div className="text-xs text-white/60">
                          Template: {selectedTemplate.emoji} {selectedTemplate.title}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          stopAudioRecording();
                          setStep("hub");
                        }}
                        className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-3xl bg-black/40 border border-white/10 p-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/60">Durée</div>
                        <div className="text-2xl font-extrabold">{fmtTime(recSec)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={stopAudioRecording}
                        className="h-12 px-4 rounded-2xl bg-red-500/90 hover:bg-red-500 text-white font-semibold flex items-center gap-2"
                      >
                        <Square className="w-4 h-4" /> Stop
                      </button>
                    </div>

                    <div className="mt-3 text-xs text-white/60">
                      Tips: phrases courtes, 1 idée à la fois.
                    </div>
                  </div>
                </motion.div>
              ) : null}

              {step === "audioPreview" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="fixed inset-0 z-[85] bg-black/70 backdrop-blur flex items-center justify-center p-4"
                >
                  <div className="w-full max-w-[560px] rounded-[28px] bg-[#0b0b0e] border border-white/10 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <Play className="w-4 h-4" /> Preview audio
                        </div>
                        <div className="text-xs text-white/60">
                          {selectedTemplate.emoji} {selectedTemplate.title} · {fmtTime(recSec)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep("hub")}
                        className="h-10 w-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-3xl bg-black/40 border border-white/10 p-4">
                      {audioUrl ? <audio src={audioUrl} controls className="w-full" /> : null}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAudioBlob(null);
                          if (audioUrl) URL.revokeObjectURL(audioUrl);
                          setAudioUrl("");
                          setStep("hub");
                        }}
                        className="h-11 px-4 rounded-2xl bg-white/10 border border-white/10 text-white text-sm"
                      >
                        Refaire
                      </button>

                      <button
                        type="button"
                        disabled={!audioBlob || publishing}
                        onClick={publishAudio}
                        className={cn(
                          "flex-1 h-11 px-4 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2",
                          publishing ? "bg-white/10 border border-white/10" : "bg-orange-500/90 hover:bg-orange-500"
                        )}
                      >
                        {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Publier
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* FullscreenCreator (video/photo/text) */}
      <FullscreenCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onPublish={async (payload) => {
          if (onSubmitCreator) await onSubmitCreator(payload);
          else console.log("[TamTamCreatePost] Publish creator:", payload);
          setCreatorOpen(false);
          onClose();
          resetAll();
        }}
      />
    </motion.div>
      )}
    </AnimatePresence>
  );
};

// ✅ garde aussi un default export (pratique ailleurs)
export default TamTamCreatePost;
