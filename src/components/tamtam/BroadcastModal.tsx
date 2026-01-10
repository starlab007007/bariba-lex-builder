import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Square, Send, Users, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Follower {
  id: string;
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string | null;
}

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  followers: Follower[];
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  isOpen,
  onClose,
  followers,
}) => {
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const selectAll = () => {
    if (selectedFollowers.size === followers.length) {
      setSelectedFollowers(new Set());
    } else {
      setSelectedFollowers(new Set(followers.map(f => f.user_id)));
    }
  };

  const toggleFollower = (userId: string) => {
    const newSet = new Set(selectedFollowers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedFollowers(newSet);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendBroadcast = async () => {
    if (!audioBlob || selectedFollowers.size === 0) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload audio
      const fileName = `broadcast_${user.id}_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      // Send messages to all selected followers
      const messages = Array.from(selectedFollowers).map(receiverId => ({
        sender_id: user.id,
        receiver_id: receiverId,
        audio_url: urlData.publicUrl,
        message_type: 'broadcast',
      }));

      const { error: insertError } = await supabase
        .from('tamtam_messages')
        .insert(messages);

      if (insertError) throw insertError;

      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setAudioBlob(null);
        setAudioUrl(null);
        setSelectedFollowers(new Set());
      }, 1500);
    } catch (err) {
      console.error('Broadcast error:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Message aux abonnés</h2>
              <p className="text-sm text-muted-foreground">
                {selectedFollowers.size} sélectionné(s) sur {followers.length}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Select all */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={selectAll}
            className="flex items-center gap-3 p-3 bg-muted rounded-xl w-full"
          >
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selectedFollowers.size === followers.length 
                ? 'bg-primary border-primary' 
                : 'border-muted-foreground'
            }`}>
              {selectedFollowers.size === followers.length && (
                <Check className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
            <Users className="w-5 h-5" />
            <span className="font-medium">Sélectionner tout le monde</span>
          </motion.button>

          {/* Followers list */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
            {followers.map(follower => (
              <motion.button
                key={follower.user_id}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleFollower(follower.user_id)}
                className="flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl w-full"
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedFollowers.has(follower.user_id) 
                    ? 'bg-primary border-primary' 
                    : 'border-muted-foreground'
                }`}>
                  {selectedFollowers.has(follower.user_id) && (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 overflow-hidden">
                  {follower.avatar_url ? (
                    <img src={follower.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">
                      {(follower.display_name || follower.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-medium truncate">
                  {follower.display_name || follower.username || 'Utilisateur'}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Recording section */}
          <div className="pt-4 border-t border-border">
            {audioUrl ? (
              <div className="flex items-center gap-3">
                <audio src={audioUrl} controls className="flex-1 h-10" />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setAudioBlob(null);
                    setAudioUrl(null);
                  }}
                  className="p-2 bg-muted rounded-full"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <div className="flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isRecording 
                      ? 'bg-destructive text-destructive-foreground animate-pulse'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </motion.button>
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground mt-2">
              {isRecording ? 'Relâchez pour terminer' : 'Maintenez pour enregistrer'}
            </p>
          </div>

          {/* Send button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={sendBroadcast}
            disabled={!audioBlob || selectedFollowers.size === 0 || sending || sent}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
              sent 
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground disabled:opacity-50'
            }`}
          >
            {sent ? (
              <>
                <Check className="w-5 h-5" />
                Envoyé !
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                {sending ? 'Envoi en cours...' : `Envoyer à ${selectedFollowers.size} abonné(s)`}
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
