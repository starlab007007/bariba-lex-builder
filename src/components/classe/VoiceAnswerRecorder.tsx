import { useState } from 'react';
import { Loader2, Mic, Send, Square, Trash2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { SoundWaveAnimation } from '@/components/voice/SoundWaveAnimation';
import SafeBoundary from '@/components/common/SafeBoundary';
import { getAudioBlobType } from '@/lib/audioMimeUtils';

/** Normalize any thrown value into a short, displayable string. */
function toErrorMessage(e: unknown): string {
  if (!e) return 'Erreur inconnue';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message || e.name || 'Erreur';
  try {
    const obj = e as { message?: unknown; error?: unknown; statusText?: unknown };
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.statusText === 'string') return obj.statusText;
    return JSON.stringify(e).slice(0, 200);
  } catch {
    return 'Erreur inconnue';
  }
}

interface Props {
  /** Storage subpath under `{userId}/` (e.g. `N1/lang/3/observe/0`). For teacher use `teacher/...` directly. */
  storageSubpath: string;
  /** Override base path. Defaults to `{auth.uid}/{storageSubpath}`. Teacher should pass full `teacher/...`. */
  fullPath?: string;
  onUploaded: (path: string, duration: number) => Promise<void> | void;
  variant?: 'student' | 'teacher';
  compact?: boolean;
}

/**
 * Enregistreur compact réutilisable.
 * - Demande micro
 * - Affiche durée + animation
 * - Envoie un blob WebM directement vers `classe-answers-audio`
 * - Appelle `onUploaded(path, duration)` une fois fait
 */
export default function VoiceAnswerRecorder(props: Props) {
  return (
    <SafeBoundary label="Enregistreur vocal">
      <VoiceAnswerRecorderInner {...props} />
    </SafeBoundary>
  );
}

function VoiceAnswerRecorderInner({ storageSubpath, fullPath, onUploaded, variant = 'student', compact = false }: Props) {
  const recorder = useAudioRecorder();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const start = async () => {
    try {
      const stream = await recorder.startRecording();
      if (!stream) {
        // Hook stored a friendly message in `recorder.error`
        toast({
          title: '🎙️ Micro indisponible',
          description: recorder.error ?? 'Vérifie l\'autorisation micro dans ton navigateur.',
          variant: 'destructive',
        });
      }
    } catch (e) {
      console.error('[VoiceAnswerRecorder] start error', e);
      toast({
        title: '🎙️ Micro indisponible',
        description: toErrorMessage(e),
        variant: 'destructive',
      });
    }
  };

  const stopAndPreview = async () => {
    try {
      await recorder.stopRecording();
    } catch (e) {
      console.error('[VoiceAnswerRecorder] stop error', e);
      toast({
        title: 'Erreur d\'arrêt',
        description: toErrorMessage(e),
        variant: 'destructive',
      });
    }
  };

  const reset = () => recorder.cancelRecording();

  const send = async () => {
    const blob = recorder.audioBlob;
    if (!blob || blob.size === 0) {
      toast({
        title: 'Enregistrement vide',
        description: 'Réessaye d\'enregistrer ton message.',
        variant: 'destructive',
      });
      recorder.cancelRecording();
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Tu dois être connecté pour envoyer un vocal.');

      // Pick a content type the browser actually produced, with safe fallback.
      const fallbackType = getAudioBlobType() || 'audio/webm';
      const contentType = blob.type && blob.type.length > 0 ? blob.type : fallbackType;
      // Match storage extension to the codec to keep playback compat (Safari → .mp4)
      const ext = contentType.includes('mp4') || contentType.includes('aac') ? 'm4a' : 'webm';
      const path = fullPath
        ? fullPath.replace(/\.(webm|m4a|mp4)$/i, `.${ext}`)
        : `${user.id}/${storageSubpath}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from('classe-answers-audio')
        .upload(path, blob, { contentType, upsert: true });
      if (error) throw error;

      await onUploaded(path, recorder.duration);
      recorder.cancelRecording();
      toast({ title: '🎙️ Vocal envoyé' });
    } catch (e) {
      console.error('[VoiceAnswerRecorder] upload error', e);
      toast({
        title: '❌ Erreur d\'envoi',
        description: toErrorMessage(e).slice(0, 200),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const accent = variant === 'teacher' ? 'from-purple-500 to-fuchsia-500' : 'from-emerald-500 to-teal-500';

  // Idle
  if (!recorder.isRecording && !recorder.audioBlob) {
    return (
      <button
        type="button"
        onClick={start}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition',
          compact ? 'px-3 py-1.5' : 'px-4 py-2',
          'bg-gradient-to-r',
          accent,
        )}
      >
        <Mic className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        Enregistrer un vocal
      </button>
    );
  }

  // Recording
  if (recorder.isRecording) {
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border-2 border-red-300">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </span>
        <span className="text-xs font-bold text-red-700">{fmt(recorder.duration)}</span>
        <SoundWaveAnimation isActive color="hsl(0 80% 55%)" barCount={4} className="!h-5" />
        <button
          type="button"
          onClick={stopAndPreview}
          className="ml-1 px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-bold flex items-center gap-1"
        >
          <Square className="w-3 h-3 fill-current" /> Stop
        </button>
      </div>
    );
  }

  // Preview / send
  return (
    <div className="inline-flex flex-wrap items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border">
      {recorder.audioUrl && (
        <audio src={recorder.audioUrl} controls className="h-8 max-w-[220px]" />
      )}
      <button
        type="button"
        onClick={send}
        disabled={uploading || !recorder.audioBlob || recorder.audioBlob.size === 0}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-sm bg-gradient-to-r disabled:opacity-50',
          accent,
        )}
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Envoyer
      </button>
      <button
        type="button"
        onClick={reset}
        disabled={uploading}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80"
      >
        <Trash2 className="w-3 h-3" /> Refaire
      </button>
    </div>
  );
}
