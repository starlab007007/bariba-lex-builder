import { Headphones, Loader2, Pause, Play, RotateCcw, Square } from 'lucide-react';
import { useReplySpeech } from '@/hooks/useReplySpeech';
import type { SpeechLanguage } from '@/lib/voice/replySpeech';

export default function ReplyAudioPlayer({ text, lang, label = 'Écouter la réponse' }: { text: string; lang: SpeechLanguage; label?: string }) {
  const voice = useReplySpeech(text, lang);
  if (!text.trim()) return null;
  const active = ['loading', 'playing', 'paused'].includes(voice.phase);
  const action = voice.phase === 'playing' ? 'Pause' : voice.phase === 'paused' ? 'Reprendre' : voice.phase === 'ended' ? 'Réécouter' : voice.phase === 'error' ? 'Réessayer' : label;
  return <div className="mt-3 min-w-0 rounded-2xl border border-[#E4DFCC] bg-[#F8F6EE] p-2.5 text-[#241F2E]" data-testid="reply-audio-player">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={voice.toggle} disabled={voice.phase === 'loading'} aria-label={voice.phase === 'loading' ? 'Préparation audio' : action}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#241F2E] px-3 text-xs font-bold text-white disabled:opacity-65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C99530]">
        {voice.phase === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : voice.phase === 'playing' ? <Pause className="h-4 w-4" /> : voice.phase === 'ended' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {voice.phase === 'loading' ? 'Préparation…' : action}
      </button>
      {active && <button type="button" onClick={voice.stop} aria-label="Arrêter la lecture" className="grid h-10 w-10 place-items-center rounded-xl border border-[#DED8C5] bg-white"><Square className="h-3.5 w-3.5" /></button>}
      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#716B5F]"><Headphones className="h-3 w-3" />{lang === 'bba' ? 'Baatɔnum' : 'Français'}</span>
      <select aria-label="Vitesse de lecture" disabled={lang === 'fr' && active} value={voice.rate} onChange={e => voice.changeRate(Number(e.target.value))} className="h-9 rounded-lg border border-[#E4DFCC] bg-white px-1 text-xs disabled:opacity-50"><option value={0.8}>0,8×</option><option value={1}>1×</option><option value={1.2}>1,2×</option></select>
    </div>
    {active && <div className="mt-2" role="status"><div className="h-1 overflow-hidden rounded-full bg-[#E6E0CF]"><div className="h-full rounded-full bg-[#C99530] transition-[width]" style={{ width: `${voice.total ? 100 * voice.part / voice.total : 0}%` }} /></div><p className="mt-1 text-[10px] text-[#716B5F]">{voice.phase === 'paused' ? 'En pause' : voice.phase === 'loading' ? 'Création de la voix' : 'Lecture'} · partie {voice.part}/{voice.total}</p></div>}
    {voice.engine && <p className="mt-1.5 text-[10px] text-[#716B5F]">{voice.engine}</p>}
    {voice.error && <p role="alert" className="mt-2 text-xs text-[#9C3C30]">{voice.error}</p>}
  </div>;
}
