import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TamTamCreatePost } from "@/components/tamtam/TamTamCreatePost";
import { useToast } from "@/hooks/use-toast";

type TabId = "home" | "social" | "market" | "profile";
const DEFAULT_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export default function TamTamHome() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("home");

  // ✅ IMPORTANT: creator fermé au chargement
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    // nothing auto-opens here
  }, []);

  const handleSubmit = useCallback(async (data: any) => {
    try {
      // Remplace par ton vrai createPost(...) si tu l’as
      console.log("[TamTamHome] Publishing:", data);
      toast({ title: "✅ Publié !" });
      setShowCreatePost(false);
    } catch (e) {
      console.error(e);
      toast({ title: "❌ Erreur", description: "Impossible de publier.", variant: "destructive" });
    }
  }, [toast]);

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: "#0B0B0B" }}>
      <div className="p-4 text-white">
        <div className="text-xl font-semibold">TamTam</div>
        <div className="text-sm text-white/60">Accueil · {activeTab}</div>
      </div>

      <AnimatePresence>
        {showCreatePost ? (
          <TamTamCreatePost
            isOpen={showCreatePost}
            onClose={() => setShowCreatePost(false)}
            onSubmitAudio={async (p) => {
              await handleSubmit({
                audio_url: URL.createObjectURL(p.audio_blob),
                media_type: "audio",
                template_id: p.template_id,
                topic: p.topic,
                duration_seconds: p.duration_seconds,
                tags: p.tags ?? [],
              });
            }}
            onSubmitCreator={async (payload) => {
              await handleSubmit({
                ...payload,
                audio_url: payload.audio_url || DEFAULT_AUDIO_URL,
              });
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* ✅ Seul point d’entrée création */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowCreatePost(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-xl"
        title="Créer"
      >
        <Plus className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
