import { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, Volume2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as SupabaseClient;
import { cn } from '@/lib/utils';
import { useAutoStopAudio } from '@/hooks/useAutoStopAudio';

interface Props {
  /** Storage path inside `classe-answers-audio` bucket. */
  path: string;
  duration?: number | null;
  label?: string;
  className?: string;
  variant?: 'student' | 'teacher';
}

/**
 * Lecteur audio compact pour les réponses vocales (élève ou corrigé enseignant).
 * Récupère une signed URL côté client (bucket privé) puis lit dans un <audio> caché.
 */
export default function VoiceAnswerPlayer({ path, duration, label, className, variant = 'student' }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useAutoStopAudio(audioRef, setPlaying);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!path) return;
      setLoading(true);
      setUrl(null);
      setAvailable(null);
      try {
        const { data: health, error: healthError } = await db
          .from('classe_answer_audio_health')
          .select('available')
          .eq('path', path)
          .maybeSingle();
        if (healthError) console.warn('[VoiceAnswerPlayer] health lookup error', healthError);

        if (health?.available === false) {
          if (!cancelled) setAvailable(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('classe-answers-audio')
          .createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) throw error ?? new Error('Signed URL unavailable');

        // A signed URL can exist even when the underlying object is gone.
        // Probe one byte so the player is never shown for a NoSuchKey reference.
        if (health?.available !== true) {
          const probe = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-0' } });
          if (!probe.ok) {
            if (!cancelled) setAvailable(false);
            return;
          }
          // Best effort: old clients may have uploaded before the health registry existed.
          void db.rpc('classe_mark_answer_audio_available', { _path: path });
        }

        if (!cancelled) {
          setUrl(data.signedUrl);
          setAvailable(true);
        }
      } catch (error) {
        console.warn('[VoiceAnswerPlayer] audio unavailable', error);
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [path]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onpause = () => setPlaying(false);
      audioRef.current.onplay = () => setPlaying(true);
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
    }
  };

  const isTeacher = variant === 'teacher';
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  if (!loading && available === false) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border opacity-70',
          isTeacher
            ? 'bg-purple-50 text-purple-700 border-purple-200'
            : 'bg-amber-50 text-amber-700 border-amber-200',
          className,
        )}
        title="Le fichier audio historique est absent du stockage et doit être réenregistré."
      >
        <Volume2 className="w-3.5 h-3.5" />
        <span>Audio à réenregistrer</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || !url}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm',
        isTeacher
          ? 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200'
          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200',
        playing && 'ring-2 ring-offset-1',
        playing && (isTeacher ? 'ring-purple-400' : 'ring-emerald-400'),
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : playing ? (
        <Pause className="w-3.5 h-3.5" />
      ) : (
        <Play className="w-3.5 h-3.5" />
      )}
      <Volume2 className="w-3 h-3" />
      <span>{label ?? (isTeacher ? 'Corrigé vocal' : 'Réponse vocale')}</span>
      {duration ? <span className="opacity-60">· {fmt(duration)}</span> : null}
    </button>
  );
}
