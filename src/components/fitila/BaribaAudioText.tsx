import { useMemo, useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PublishedAudio = {
  audio_key: string;
  voice: string | null;
  variant: string | null;
  storage_path: string;
  duration_ms: number | null;
  speaker_name: string | null;
};

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
let activeAudio: HTMLAudioElement | null = null;

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function fnv1a64(text: string) {
  const bytes = new TextEncoder().encode(normalizeText(text));
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of bytes) {
    hash = ((hash ^ BigInt(byte)) * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function apprendreAudioKey(text: string) {
  return `ap:${fnv1a64(text)}`;
}

async function loadPublishedAudioManifest(): Promise<Map<string, PublishedAudio[]>> {
  const map = new Map<string, PublishedAudio[]>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('apprendre_audio_published')
      .select('audio_key, voice, variant, storage_path, duration_ms, speaker_name')
      .order('audio_key')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const rows = (data || []) as PublishedAudio[];
    for (const row of rows) {
      const current = map.get(row.audio_key) || [];
      current.push(row);
      map.set(row.audio_key, current);
    }
    if (rows.length < pageSize) break;
  }

  return map;
}

async function signedUrl(path: string) {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;

  const { data, error } = await supabase.storage
    .from('apprendre-audio')
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) throw error || new Error('Voix indisponible');
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60_000 });
  return data.signedUrl;
}

export function useApprendrePublishedAudio() {
  return useQuery({
    queryKey: ['apprendre-published-audio-manifest'],
    queryFn: loadPublishedAudioManifest,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}

interface BaribaAudioTextProps {
  text: string;
  className?: string;
  textClassName?: string;
  preferredVoice?: 'femme' | 'homme' | 'auto';
  hideUnavailable?: boolean;
  compact?: boolean;
}

export default function BaribaAudioText({
  text,
  className = '',
  textClassName = '',
  preferredVoice = 'auto',
  hideUnavailable = false,
  compact = false,
}: BaribaAudioTextProps) {
  const { data: manifest, isLoading } = useApprendrePublishedAudio();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const entry = useMemo(() => {
    const rows = manifest?.get(apprendreAudioKey(text)) || [];
    if (!rows.length) return null;
    if (preferredVoice !== 'auto') {
      return rows.find(r => r.voice === preferredVoice) || rows[0];
    }
    return rows[0];
  }, [manifest, preferredVoice, text]);

  const play = async (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (!entry || playing) return;

    setFailed(false);
    setPlaying(true);
    try {
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }
      const url = await signedUrl(entry.storage_path);
      const audio = new Audio(url);
      activeAudio = audio;
      audio.preload = 'auto';
      audio.onended = () => {
        setPlaying(false);
        if (activeAudio === audio) activeAudio = null;
      };
      audio.onerror = () => {
        setPlaying(false);
        setFailed(true);
        if (activeAudio === audio) activeAudio = null;
      };
      await audio.play();
    } catch {
      setPlaying(false);
      setFailed(true);
    }
  };

  const unavailable = !isLoading && !entry;

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {!hideUnavailable || entry || isLoading ? (
        <button
          type="button"
          onClick={play}
          disabled={!entry || playing}
          aria-label={entry ? `Écouter : ${text}` : `Voix en préparation : ${text}`}
          title={entry ? 'Écouter la voix de référence' : failed ? 'Lecture impossible' : 'Voix en préparation'}
          className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-all
            ${compact ? 'h-7 w-7' : 'h-9 w-9'}
            ${entry
              ? 'border-[#D8B86A] bg-[#FFF8E7] text-[#9C6B1D] hover:bg-[#F3E3B9] active:scale-95'
              : 'border-[#E4DFCC] bg-[#F5F2E8] text-[#B8B19D] opacity-70'}
          `}
        >
          {playing || isLoading
            ? <Loader2 className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} animate-spin`} />
            : <Volume2 className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
        </button>
      ) : null}
      <span className={`min-w-0 ${textClassName}`}>{text}</span>
      {unavailable && !hideUnavailable && !compact && (
        <span className="shrink-0 text-[10px] font-semibold text-[#9C9480]">voix bientôt</span>
      )}
    </span>
  );
}
