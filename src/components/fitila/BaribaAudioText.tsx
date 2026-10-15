import { apprendreAudioKey } from '@/lib/apprendre/audioKey';
export { apprendreAudioKey } from '@/lib/apprendre/audioKey';
import { useMemo } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useApprendreSpeech } from '@/hooks/useApprendreSpeech';

const db = supabase as unknown as SupabaseClient;

type PublishedAudio = {
  audio_key: string;
  voice: string | null;
  variant: string | null;
  storage_path: string;
  duration_ms: number | null;
  speaker_name: string | null;
};

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function loadPublishedAudioManifest(): Promise<Map<string, PublishedAudio[]>> {
  const map = new Map<string, PublishedAudio[]>();
  const pageSize = 1000;
  const signal = AbortSignal.timeout(5000);

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .rpc('apprendre_audio_manifest')
      .range(from, from + pageSize - 1).abortSignal(signal);

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
  if (signedUrlCache.size > 100) signedUrlCache.delete(signedUrlCache.keys().next().value!);
  return data.signedUrl;
}

const humanCache = new Map<string, Blob>();
let humanBytes = 0;
async function publishedBlob(path: string, signal: AbortSignal): Promise<Blob> {
  const cached = humanCache.get(path); if (cached) { signal.throwIfAborted(); return cached; }
  const url = await signedUrl(path); signal.throwIfAborted();
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok || Number(response.headers.get('Content-Length') ?? 0) > 8_000_000) throw new Error('Audio indisponible.');
  const blob = await response.blob(); signal.throwIfAborted();
  if (!blob.size || blob.size > 8_000_000) throw new Error('Audio indisponible.');
  humanCache.set(path, blob); humanBytes += blob.size;
  while (humanCache.size > 24 || humanBytes > 16_000_000) { const first = humanCache.keys().next().value!; humanBytes -= humanCache.get(first)!.size; humanCache.delete(first); }
  return blob;
}

export function useApprendrePublishedAudio() {
  return useQuery({
    queryKey: ['apprendre-published-audio-manifest'],
    queryFn: loadPublishedAudioManifest,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
  });
}

interface BaribaAudioTextProps {
  text: string; className?: string; textClassName?: string;
  preferredVoice?: 'femme' | 'homme' | 'auto'; hideUnavailable?: boolean; compact?: boolean;
}
export default function BaribaAudioText({ text, className = '', textClassName = '', preferredVoice = 'auto', compact = false }: BaribaAudioTextProps) {
  return <span data-ap-ba-text={text} className={`inline-flex min-w-0 max-w-full items-start gap-2 ${className}`}>
    <BaribaAudioButton text={text} preferredVoice={preferredVoice} compact={compact} />
    <span lang="bba" className={`min-w-0 whitespace-pre-wrap break-words ${textClassName}`}>{text}</span>
  </span>;
}
export interface BaribaAudioButtonProps {
  text: string; preferredVoice?: 'femme' | 'homme' | 'auto'; hideUnavailable?: boolean;
  compact?: boolean; dark?: boolean; className?: string;
}
/** Published human recordings first; public MMS on demand, including visitors. */
export function BaribaAudioButton({ text, preferredVoice = 'auto', compact = false, dark = false, className = '' }: BaribaAudioButtonProps) {
  const { data: manifest } = useApprendrePublishedAudio();
  const queryClient = useQueryClient();
  const entry = useMemo(() => {
    const rows = manifest?.get(apprendreAudioKey(text)) || [];
    return (preferredVoice !== 'auto' ? rows.find(row => row.voice === preferredVoice) : undefined) ?? rows[0];
  }, [manifest, preferredVoice, text]);
  const speech = useApprendreSpeech(text, async signal => {
    const ready = await queryClient.ensureQueryData({queryKey:['apprendre-published-audio-manifest'],queryFn:loadPublishedAudioManifest,staleTime:15*60*1000,retry:false});
    signal.throwIfAborted(); const rows=ready.get(apprendreAudioKey(text))??[];
    const chosen=(preferredVoice!=='auto'?rows.find(row=>row.voice===preferredVoice):undefined)??rows[0];
    if(!chosen)throw new Error('No published reference');
    return publishedBlob(chosen.storage_path,signal);
  }, preferredVoice);
  if (!text.trim()) return null;
  const busy = speech.phase === 'loading', playing = speech.phase === 'playing';
  const label = busy ? `Annuler l’écoute : ${text}` : playing ? `Arrêter : ${text}` : speech.phase === 'error' ? `Réessayer : ${text}` : `Écouter : ${text}`;
  return <span data-ap-audio-text={text} className="inline-flex max-w-full shrink-0 flex-col items-start gap-1 align-middle">
    <button type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); speech.toggle(); }}
      onKeyDown={event => event.stopPropagation()} aria-label={label} aria-pressed={playing} aria-busy={busy}
      aria-description={speech.engine || (entry ? 'Voix humaine publiée' : 'Voix synthétique Baatɔnum')}
      title={speech.error || speech.engine || (entry ? 'Voix humaine publiée' : 'Voix synthétique · Meta MMS')}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C99530] focus-visible:ring-offset-2 ${compact ? 'h-10 w-10' : 'h-11 w-11'} ${className} ${dark ? 'border-white/30 bg-white/15 text-white hover:bg-white/25' : 'border-[#D8B86A] bg-[#FFF8E7] text-[#9C6B1D] hover:bg-[#F3E3B9]'} active:scale-95`}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
    {speech.error && <span role="status" className="max-w-40 whitespace-normal break-words text-[10px] text-[#B54E33]">{speech.error}</span>}
  </span>;
}
