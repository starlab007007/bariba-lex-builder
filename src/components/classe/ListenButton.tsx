import { useApprovedAudio } from '@/hooks/useClasseAudio';
import { Volume2, VolumeX, Loader2, Pause } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAutoStopAudio } from '@/hooks/useAutoStopAudio';

interface ListenButtonProps {
  contentKey: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

/**
 * Lecteur Classe robuste :
 * 1) récupère réellement le fichier signé (pas seulement l'URL),
 * 2) joue le Blob avec le moteur média natif,
 * 3) si le navigateur refuse le WAV, tente un décodage WebAudio.
 *
 * Ce composant est partagé par tous les modules Classe.
 */
export default function ListenButton({ contentKey, size = 'md', className, label }: ListenButtonProps) {
  const { data, isLoading } = useApprovedAudio(contentKey);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  useAutoStopAudio(audioRef, setPlaying);

  useEffect(() => () => {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, []);

  const sz = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const iconSz = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  const storageBroken = data?.storage_broken === true;
  const available = !!data?.signed_url && !storageBroken;

  const stop = () => {
    try {
      sourceRef.current?.stop();
    } catch {}
    sourceRef.current = null;
    const el = audioRef.current;
    if (el) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    }
    setPlaying(false);
  };

  const playWithMediaElement = async (blob: Blob) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(blob);
    objectUrlRef.current = objectUrl;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.preload = 'auto';
    audio.muted = false;
    audio.volume = 1;
    audio.src = objectUrl;
    audio.onended = () => setPlaying(false);
    audio.onpause = () => setPlaying(false);
    audio.onplay = () => setPlaying(true);
    audio.onerror = () => setPlaying(false);

    await audio.play();
    setPlaying(true);
  };

  const playWithWebAudio = async (bytes: ArrayBuffer) => {
    const Ctx = window.AudioContext;
    if (!Ctx) throw new Error('WebAudio indisponible');

    const ctx = audioContextRef.current ?? new Ctx();
    audioContextRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();

    const decoded = await ctx.decodeAudioData(bytes.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.onended = () => {
      if (sourceRef.current === source) sourceRef.current = null;
      setPlaying(false);
    };
    sourceRef.current = source;
    source.start(0);
    setPlaying(true);
  };

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!available || preparing) return;

    if (playing) {
      stop();
      return;
    }

    // Réveille WebAudio pendant le geste utilisateur, important sur Safari/mobile.
    try {
      const ctx = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();
    } catch {}

    setPreparing(true);
    setPlaybackFailed(false);
    try {
      const response = await fetch(data!.signed_url!, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (blob.size < 44) throw new Error('Fichier audio vide ou tronqué');

      const bytes = await blob.arrayBuffer();

      // Le lecteur HTML est le plus économe. Si le WAV n'est pas accepté,
      // WebAudio décode les PCM/WAV que certains moteurs média mobiles refusent.
      try {
        await playWithMediaElement(blob);
      } catch {
        await playWithWebAudio(bytes);
      }
    } catch (error) {
      console.error('[ClasseAudio] playback failed', { contentKey, error });
      stop();
      setPlaybackFailed(true);
    } finally {
      setPreparing(false);
    }
  };

  const busy = isLoading || preparing;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available || busy}
      title={playbackFailed ? 'Lecture impossible — réessayer après actualisation' : storageBroken ? 'Audio à restaurer' : available ? 'Écouter' : 'Audio bientôt disponible'}
      aria-label={playing ? 'Arrêter la lecture' : playbackFailed ? 'Lecture audio impossible' : available ? 'Écouter ce contenu' : 'Audio non disponible'}
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
      {busy ? (
        <Loader2 className={cn(iconSz, 'animate-spin')} />
      ) : playing ? (
        <Pause className={iconSz} />
      ) : available ? (
        <Volume2 className={iconSz} />
      ) : (
        <VolumeX className={iconSz} />
      )}
      {label && <span className="ml-1.5 text-xs font-semibold">{label}</span>}
    </button>
  );
}
