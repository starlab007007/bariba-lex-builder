import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Plus, Users, Mic, Play, X, Volume2 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useTamTamLive, TamTamLive } from '@/hooks/useTamTamLive';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { TamTamLiveRoom } from './TamTamLiveRoom';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TamTamLiveListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TamTamLiveList({ isOpen, onClose }: TamTamLiveListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { lives, loading, startLive, joinLive, currentLive } = useTamTamLive();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLiveTitle, setNewLiveTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [activeLive, setActiveLive] = useState<TamTamLive | null>(null);

  const handleStartLive = async (titleAudio?: string) => {
    if (!newLiveTitle.trim()) {
      toast({ title: "Titre requis", variant: "destructive" });
      return;
    }

    triggerFeedback('success');
    let audioUrl: string | undefined;

    if (titleAudio) {
      try {
        const audioBlob = base64ToBlob(titleAudio, 'audio/webm');
        const fileName = `live_title_${Date.now()}.webm`;
        
        const { error } = await supabase.storage
          .from('tamtam-audio')
          .upload(fileName, audioBlob, { contentType: 'audio/webm' });

        if (!error) {
          const { data } = supabase.storage.from('tamtam-audio').getPublicUrl(fileName);
          audioUrl = data.publicUrl;
        }
      } catch (err) {
        console.error('Error uploading title audio:', err);
      }
    }

    const { data, error } = await startLive(newLiveTitle, audioUrl);
    
    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    } else if (data) {
      toast({ title: "🔴 Vous êtes en direct !" });
      setShowCreateModal(false);
      setNewLiveTitle('');
      setActiveLive(data);
    }
  };

  const handleJoinLive = async (live: TamTamLive) => {
    triggerFeedback('notification');
    const { error } = await joinLive(live.id);
    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    } else {
      setActiveLive(live);
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.replace(/^data:.*,/, ''));
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  if (!isOpen) return null;

  if (activeLive) {
    return (
      <TamTamLiveRoom
        live={activeLive}
        onClose={() => setActiveLive(null)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 bg-white/20 rounded-xl"
          >
            <X className="w-5 h-5" />
          </motion.button>
          
          <h2 className="text-lg font-bold">Directs en cours</h2>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="p-2 bg-white/20 rounded-xl"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        <p className="text-white/80 text-sm text-center">
          Rejoignez un direct ou lancez le vôtre
        </p>
      </div>

      {/* Live List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : lives.length === 0 ? (
          <div className="text-center py-12">
            <Radio className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun direct en cours</p>
            <p className="text-sm text-gray-400 mt-1">Soyez le premier à lancer un direct !</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium"
            >
              🔴 Lancer un direct
            </motion.button>
          </div>
        ) : (
          lives.map((live) => (
            <motion.div
              key={live.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-16 h-16 ring-2 ring-red-500">
                    <AvatarImage src={live.host?.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-red-400 to-red-600 text-white text-xl">
                      {live.host?.display_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    LIVE
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 truncate">{live.title}</h4>
                  <p className="text-sm text-gray-500">{live.host?.display_name || live.host?.username}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3 h-3" />
                      {live.viewer_count} spectateurs
                    </span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleJoinLive(live)}
                  className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  <span className="font-medium">Rejoindre</span>
                </motion.button>
              </div>

              {/* Audio preview */}
              {live.title_audio_url && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-gray-50 rounded-xl">
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">Aperçu audio disponible</span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">🔴 Lancer un direct</h3>

              <Input
                placeholder="Titre du direct"
                value={newLiveTitle}
                onChange={(e) => setNewLiveTitle(e.target.value)}
                className="mb-4 rounded-xl"
              />

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Annonce vocale (optionnel)
                </label>
                <div className="bg-gray-50 rounded-xl p-4">
                  <SmartVoiceRecorder
                    onRecordingComplete={(audio) => {
                      handleStartLive(audio);
                    }}
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStartLive()}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Radio className="w-5 h-5" />
                Commencer le direct
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TamTamLiveList;
