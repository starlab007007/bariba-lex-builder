import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Lock, Globe, Trash2, Play, Pause } from 'lucide-react';
import { MyPost } from '@/hooks/useMyPosts';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PostEditModalProps {
  post: MyPost | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (postId: string, updates: Partial<Pick<MyPost, 'transcript_fr' | 'transcript_ba' | 'feeling_emoji' | 'is_public'>>) => Promise<boolean>;
  onDelete: (postId: string) => Promise<boolean>;
}

const EMOJI_OPTIONS = ['😊', '😢', '😡', '🥰', '😎', '🤔', '😴', '🎉', '🔥', '💪', '🙏', '❤️'];

export const PostEditModal: React.FC<PostEditModalProps> = ({
  post,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [transcriptFr, setTranscriptFr] = useState('');
  const [transcriptBa, setTranscriptBa] = useState('');
  const [feelingEmoji, setFeelingEmoji] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (post) {
      setTranscriptFr(post.transcript_fr || '');
      setTranscriptBa(post.transcript_ba || '');
      setFeelingEmoji(post.feeling_emoji || '');
      setIsPublic(post.is_public);
    }
  }, [post]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handlePlayPause = () => {
    if (!post?.audio_url) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(post.audio_url);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    const success = await onSave(post.id, {
      transcript_fr: transcriptFr,
      transcript_ba: transcriptBa,
      feeling_emoji: feelingEmoji,
      is_public: isPublic,
    });
    setSaving(false);
    if (success) onClose();
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const success = await onDelete(post.id);
    setDeleting(false);
    if (success) onClose();
  };

  if (!isOpen || !post) return null;

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
          className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Modifier la publication</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Audio preview */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePlayPause}
              className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="currentColor" />}
            </motion.button>
            <div className="flex-1">
              <div className="text-sm font-medium">Audio original</div>
              <div className="text-xs text-muted-foreground">
                {post.duration_seconds 
                  ? `${Math.floor(post.duration_seconds / 60)}:${String(post.duration_seconds % 60).padStart(2, '0')}`
                  : 'Durée inconnue'}
              </div>
            </div>
            <span className="text-2xl">{feelingEmoji || '🎤'}</span>
          </div>

          {/* Emoji selector */}
          <div className="space-y-2">
            <Label>Ressenti</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <motion.button
                  key={emoji}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setFeelingEmoji(emoji)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-colors ${
                    feelingEmoji === emoji 
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Transcription FR */}
          <div className="space-y-2">
            <Label htmlFor="transcript-fr">Transcription (Français)</Label>
            <Textarea
              id="transcript-fr"
              value={transcriptFr}
              onChange={(e) => setTranscriptFr(e.target.value)}
              placeholder="Transcription en français..."
              rows={3}
            />
          </div>

          {/* Transcription BA */}
          <div className="space-y-2">
            <Label htmlFor="transcript-ba">Transcription (Bariba)</Label>
            <Textarea
              id="transcript-ba"
              value={transcriptBa}
              onChange={(e) => setTranscriptBa(e.target.value)}
              placeholder="Transcription en bariba..."
              rows={3}
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-orange-500" />
              )}
              <div>
                <div className="font-medium">{isPublic ? 'Public' : 'Privé'}</div>
                <div className="text-xs text-muted-foreground">
                  {isPublic 
                    ? 'Tout le monde peut voir cette publication'
                    : 'Seul vous pouvez voir cette publication'}
                </div>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              disabled={deleting}
              className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                confirmDelete 
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Suppression...' : confirmDelete ? 'Confirmer' : 'Supprimer'}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
