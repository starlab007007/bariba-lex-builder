// src/pages/tamtam/TamTamHome.tsx
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, ShoppingBag, User, Plus, Menu, X, TrendingUp, Sparkles } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useTamTamPosts } from '@/hooks/useTamTamPosts';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { TamTamCreatePost } from '@/components/tamtam/TamTamCreatePost'; // ✅ named export
import { useToast } from '@/hooks/use-toast';
import { useSideMenu } from './TamTamApp';

type TabId = 'home' | 'social' | 'market' | 'profile';
const DEFAULT_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export default function TamTamHome() {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { toast } = useToast();
  const { createPost, fetchPosts } = useTamTamPosts();
  const sideMenu = useSideMenu();

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // ✅ IMPORTANT: ne jamais ouvrir la caméra au load
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [createPostType, setCreatePostType] = useState<'patrimoine' | 'mavoix'>('patrimoine');

  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  const handleCreatePost = useCallback(async (data: any) => {
    try {
      const postData = {
        ...data,
        audio_url: data.audio_url || DEFAULT_AUDIO_URL,
        topic: createPostType,
      };
      await createPost(postData);
      toast({ title: "✅ Publié!" });
      triggerFeedback('success');
      fetchPosts();
      setShowCreatePost(false);
    } catch (error) {
      toast({ title: "❌ Erreur", description: "Impossible de publier.", variant: "destructive" });
    }
  }, [createPost, createPostType, fetchPosts, toast]);

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: '#0B0B0B' }}>
      {/* ... ton contenu home ... */}

      <AnimatePresence>
        {showCreatePost ? (
          <TamTamCreatePost
            isOpen={showCreatePost}
            onClose={() => setShowCreatePost(false)}
            onSubmitAudio={async (p) => {
              await handleCreatePost({
                audio_url: URL.createObjectURL(p.audio_blob),
                media_type: 'audio',
                template_id: p.template_id,
                topic: p.topic,
                duration_seconds: p.duration_seconds,
                tags: p.tags ?? [],
              });
            }}
            onSubmitCreator={async (payload) => {
              await handleCreatePost({
                ...payload,
                audio_url: payload.audio_url || DEFAULT_AUDIO_URL,
              });
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* ✅ Le bouton Créer (seul point d’entrée) */}
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
