import { useApprovedAudio } from '@/hooks/useClasseAudio';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAutoStopAudio } from '@/hooks/useAutoStopAudio';

interface ListenButtonProps {
  contentKey: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

/**
 * Bouton "🔊 Écouter" — affiché sur tout texte/question pédagogique.
 * Si un audio approuvé existe pour `contentKey`, il est lu instantanément.
 * Sinon : icône grisée avec tooltip.
 */
export default function ListenButton({ contentKey, size = 'md', className, label }: ListenButtonProps) {
  const { data, isLoading } = useApprovedAudio(contentKey);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useAutoStopAudio(audioRef, setPlaying);

  const sz = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const iconSz = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  const available = !!data?.signed_url;

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!available) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(data!.signed_url!);
      audioRef.current.preload = 'auto';
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onpause = () => setPlaying(false);
      audioRef.current.onplay = () => setPlaying(true);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available}
      title={available ? 'Écouter' : 'Audio bientôt disponible'}
      aria-label={available ? 'Écouter ce contenu' : 'Audio non disponible'}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors shrink-0',
        sz,
        available
          ? 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400'
          : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
        playing && 'ring-2 ring-amber-500 animate-pulse',
        className,
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(iconSz, 'animate-spin')} />
      ) : available ? (
        <Volume2 className={iconSz} />
      ) : (
        <VolumeX className={iconSz} />
      )}
      {label && <span className="ml-1.5 text-xs font-semibold">{label}</span>}
    </button>
  );
}