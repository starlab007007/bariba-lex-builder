import { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!path) return;
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('classe-answers-audio')
        .createSignedUrl(path, 3600);
      if (!cancelled) {
        if (data?.signedUrl) setUrl(data.signedUrl);
        if (error) console.warn('[VoiceAnswerPlayer] signed url error', error);
        setLoading(false);
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
