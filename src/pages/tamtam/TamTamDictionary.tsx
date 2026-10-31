import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Keyboard, Search, X, ChevronRight, ChevronLeft, ArrowLeftRight,
  Star, Copy, Volume2, Loader2, Sparkles, History, SearchX, Languages,
} from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { SIG, SERIF } from '@/components/fitila/signatureTheme';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { VoiceLangPanel } from '@/components/tamtam/VoiceLangPanel';
import { NewWordSubmission } from '@/components/tamtam/NewWordSubmission';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { useToast } from '@/hooks/use-toast';

// Portage fidèle du dictionnaire Flutter (`fitila_flutter/lib/dictionary/
// dictionary_experience.dart`), qui fait référence pour l'UI/UX et le
// fonctionnement : une seule barre de recherche (plutôt que des onglets
// Clavier/Vocal), un mot du jour, des recherches récentes et favoris en
// puces, un index alphabétique, une fiche détaillée avec blocs écoute, et
// une carte « Proposer un mot » toujours visible en bas de page.
// La recherche elle-même (normalisation phonétique Baatɔnum, tolérance aux
// fautes) reste celle déjà en place côté web (`usePhoneticSuggestions`),
// plus robuste que la recherche par sous-chaîne du Flutter — on ne régresse
// pas une fonctionnalité qui marche pour suivre la référence à la lettre.

type Direction = 'ba-fr' | 'fr-ba';
const RECENT_KEY = 'fitila_dict_recent';
const FAVS_KEY = 'fitila_dict_favs';
const BARIBA_CHARS = ['ɔ', 'ɛ', 'ã', 'ŋ', 'ɔ̀', 'ɔ́', 'ɛ̀', 'ɛ́'];

function entryKey(e: PhoneticEntry): string {
  return `${e.word.toLowerCase()}|${e.definition.toLowerCase()}`;
}

/** Retire ton, accents et casse — même logique que `foldDict` côté Flutter. */
function foldDict(input: string): string {
  const MAP: Record<string, string> = {
    à: 'a', á: 'a', â: 'a', ä: 'a', ã: 'a', è: 'e', é: 'e', ê: 'e', ë: 'e', ẽ: 'e',
    ì: 'i', í: 'i', î: 'i', ï: 'i', ĩ: 'i', ò: 'o', ó: 'o', ô: 'o', ö: 'o', õ: 'o',
    ù: 'u', ú: 'u', û: 'u', ü: 'u', ũ: 'u', ǹ: 'n', ń: 'n', ñ: 'n', ç: 'c', œ: 'oe',
  };
  let out = '';
  for (const ch of input.toLowerCase()) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x0300 && code <= 0x036f) continue;
    out += MAP[ch] ?? ch;
  }
  return out.trim();
}

function loadList(key: string): string[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveList(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
}

export default function TamTamDictionary() {
  const [routeParams, setRouteParams] = useSearchParams();
  const { t } = useTamTamLanguage();
  const { speakBariba } = useUnifiedAudio();
  const { getSuggestions, searchInDefinitions, entries, isLoading: isLoadingDict } = usePhoneticSuggestions();
  const { transcribe: transcribeBariba, isTranscribing: isSTTLoading, isWakingUp: isSTTWakingUp } = useBaribaSTT();
  const { toast } = useToast();

  const [direction, setDirection] = useState<Direction>(() => (routeParams.get('direction') === 'fr-ba' ? 'fr-ba' : 'ba-fr'));
  const baToFr = direction === 'ba-fr';
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<PhoneticEntry | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() => loadList(RECENT_KEY));
  const [favs, setFavs] = useState<Set<string>>(() => new Set(loadList(FAVS_KEY)));
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const wanted = routeParams.get('direction') === 'fr-ba' ? 'fr-ba' : 'ba-fr';
    if (wanted !== direction) setDirection(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams]);
  useEffect(() => {
    const current = routeParams.get('direction') === 'fr-ba' ? 'fr-ba' : 'ba-fr';
    if (current !== direction) { const next = new URLSearchParams(routeParams); next.set('direction', direction); setRouteParams(next, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  // Debounce 110ms — même délai que `_onQuery` côté Flutter.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query) { setDebounced(''); return; }
    debounceRef.current = setTimeout(() => setDebounced(query), 110);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const results = useMemo(() => {
    if (selected || !debounced.trim()) return [] as PhoneticEntry[];
    return baToFr ? getSuggestions(debounced, 30) : searchInDefinitions(debounced, 30);
  }, [selected, debounced, baToFr, getSuggestions, searchInDefinitions]);

  const letters = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const f = foldDict(e.word);
      const first = [...f][0];
      if (first && /^\p{L}$/u.test(first)) set.add(first);
    }
    return [...set].sort();
  }, [entries]);

  const byLetter = (l: string) =>
    entries.filter((e) => foldDict(e.word).startsWith(l)).sort((a, b) => foldDict(a.word).localeCompare(foldDict(b.word))).slice(0, 80);

  const wordOfTheDay = useMemo(() => {
    const pool = entries.filter((e) => (e.example_bariba ?? '').length > 0 && e.definition.length < 80);
    const list = pool.length ? pool : entries;
    if (!list.length) return null;
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const idx = (dayOfYear + now.getFullYear() * 366) % list.length;
    return list[idx];
  }, [entries]);

  const related = (e: PhoneticEntry) => {
    const stem = foldDict(e.word);
    const firstWord = foldDict(e.definition).split(/\W+/).find((w) => w.length > 3);
    const out: PhoneticEntry[] = [];
    for (const x of entries) {
      if (entryKey(x) === entryKey(e)) continue;
      const w = foldDict(x.word);
      const samePrefix = stem.length >= 3 && w.startsWith(stem.slice(0, 3));
      const sameMeaning = !!firstWord && foldDict(x.definition).includes(firstWord);
      if (samePrefix || sameMeaning) out.push(x);
      if (out.length >= 8) break;
    }
    return out;
  };

  const open = (e: PhoneticEntry) => {
    setSelected(e);
    setLetter(null);
    setQuery(baToFr ? e.word : e.definition);
    setDebounced('');
    setRecent((prev) => { const next = [e.word, ...prev.filter((w) => w !== e.word)].slice(0, 10); saveList(RECENT_KEY, next); return next; });
  };
  const openByWord = (word: string) => {
    const e = entries.find((x) => x.word === word);
    if (e) open(e);
  };
  const toggleFav = (e: PhoneticEntry) => {
    triggerFeedback('click');
    setFavs((prev) => {
      const next = new Set(prev);
      const k = entryKey(e);
      if (next.has(k)) next.delete(k); else next.add(k);
      saveList(FAVS_KEY, [...next]);
      return next;
    });
  };

  const speak = async (text: string, key: string) => {
    if (speakingKey) return;
    setSpeakingKey(key);
    try { await speakBariba(text); }
    catch { toast({ title: 'Lecture audio indisponible.', variant: 'destructive' }); }
    finally { setSpeakingKey(null); }
  };

  const toggleDirection = () => {
    setDirection((d) => (d === 'ba-fr' ? 'fr-ba' : 'ba-fr'));
    setSelected(null);
    triggerFeedback('click');
  };

  const closeSearch = () => { setQuery(''); setDebounced(''); setSelected(null); };

  const toggleVoicePanel = () => {
    setVoicePanelOpen((v) => !v);
    triggerFeedback('click');
  };

  const handleVoiceResult = async (result: { audioBase64: string; transcription?: string; sourceLang: 'ba' | 'fr' }) => {
    setVoiceBusy(true); setVoiceSuccess(false); setVoiceError(''); triggerFeedback('send');
    try {
      let text = result.transcription?.toLowerCase().trim() || '';
      if (result.sourceLang === 'ba' && !text && result.audioBase64) {
        const sttResult = await transcribeBariba(result.audioBase64, { robustMode: true, speakerType: 'Auto' });
        text = sttResult?.transcription?.toLowerCase().trim() || '';
      }
      if (!text) { setVoiceError('Je n’ai pas compris. Réessayez.'); return; }
      setVoiceTranscript(text);
      setQuery(text); setDebounced(text); setSelected(null);
      setVoiceSuccess(true);
      triggerFeedback('success');
    } catch {
      triggerFeedback('error');
      setVoiceError('Recherche vocale indisponible. Réessayez.');
    } finally {
      setVoiceBusy(false);
    }
  };

  const headwordSize = (text: string, base = 30) => {
    const len = text.length;
    if (len <= 14) return base;
    if (len <= 24) return base - 8;
    if (len <= 40) return base - 13;
    return base - 16;
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[960px] flex-col overflow-hidden" style={{ background: SIG.appBackground, color: SIG.ink }}>
      <FitilaPageHeader title={t('dict_title')} subtitle="Baatɔnum ⇄ Français" />

      <div className="flex-1 overflow-y-auto overscroll-contain px-[18px] pb-28 pt-4" style={{ touchAction: 'pan-y' }}>
        {/* Barre de recherche — champ unique + bascule de sens + micro, comme le Flutter */}
        <div className="rounded-[24px] border bg-white p-[10px] pb-[9px] shadow-sm" style={{ borderColor: SIG.hairline }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: SIG.goldDeep }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!e.target.value) setSelected(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { const r = baToFr ? getSuggestions(query, 1) : searchInDefinitions(query, 1); if (r[0]) open(r[0]); } }}
              placeholder={baToFr ? 'Rechercher en Baatɔnum…' : 'Rechercher en français…'}
              className="h-[52px] w-full rounded-[18px] pl-11 pr-[84px] text-[16px] font-semibold outline-none"
              style={{ background: SIG.appBackground, color: SIG.ink }}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {query && (
                <button type="button" aria-label="Effacer" onClick={closeSearch} className="grid h-9 w-9 place-items-center rounded-full" style={{ color: SIG.muted }}>
                  <X className="h-[18px] w-[18px]" />
                </button>
              )}
              <button type="button" aria-label="Recherche vocale" onClick={toggleVoicePanel} className="grid h-9 w-9 place-items-center rounded-full" style={{ color: voicePanelOpen ? SIG.goldDeep : SIG.sage }}>
                {voicePanelOpen ? <Keyboard className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {baToFr && (
            <div className="mt-2 flex flex-wrap gap-1.5 px-1">
              {BARIBA_CHARS.map((c) => (
                <button key={c} type="button" onClick={() => { setQuery((q) => q + c); inputRef.current?.focus(); }}
                  className="h-8 min-w-[32px] rounded-[10px] border text-[15px] font-bold" style={{ borderColor: SIG.hairline, color: SIG.goldDeep, background: SIG.appBackground }}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-1.5">
            <DirChip label="🇧🇯 Baatɔnum" active={baToFr} />
            <button type="button" aria-label="Inverser le sens" onClick={toggleDirection}
              className="grid h-10 w-11 shrink-0 place-items-center rounded-[13px] border" style={{ borderColor: SIG.hairline, color: SIG.goldDeep }}>
              <ArrowLeftRight className="h-[21px] w-[21px]" />
            </button>
            <DirChip label="🇫🇷 Français" active={!baToFr} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {voicePanelOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-[10px] rounded-[24px] border bg-white p-4" style={{ borderColor: SIG.hairline }}>
                <VoiceLangPanel
                  defaultLang={baToFr ? 'ba' : 'fr'}
                  onResult={handleVoiceResult}
                  onLangChange={(l) => setDirection(l === 'ba' ? 'ba-fr' : 'fr-ba')}
                  isProcessingExternal={voiceBusy || isSTTLoading}
                  isWakingUp={isSTTWakingUp}
                  lastTranscription={voiceTranscript || undefined}
                  lastError={voiceError || undefined}
                  showSuccess={voiceSuccess}
                  onSpeakAgain={() => { setVoiceSuccess(false); setVoiceError(''); }}
                  disabled={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-[14px]">
          {isLoadingDict ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="mb-3 h-7 w-7 animate-spin" style={{ color: SIG.gold }} />
              <p style={{ color: SIG.muted }}>{t('dict_loading_dict')}</p>
            </div>
          ) : selected ? (
            <DetailCard
              entry={selected}
              baToFr={baToFr}
              fav={favs.has(entryKey(selected))}
              onToggleFav={() => toggleFav(selected)}
              onBack={closeSearch}
              onSpeak={speak}
              speakingKey={speakingKey}
              related={related(selected)}
              onOpenRelated={open}
              headwordSize={headwordSize}
            />
          ) : debounced.trim() ? (
            <ResultList results={results} query={debounced} baToFr={baToFr} favs={favs} speakingKey={speakingKey} onSpeak={speak} onOpen={open} />
          ) : letter ? (
            <LetterList letter={letter} items={byLetter(letter)} onBack={() => setLetter(null)} onOpen={open} />
          ) : (
            <HomeView
              wordOfTheDay={wordOfTheDay}
              recent={recent}
              favs={[...favs]}
              entries={entries}
              letters={letters}
              speakingKey={speakingKey}
              onSpeak={speak}
              onOpenWord={openByWord}
              onPickLetter={setLetter}
              headwordSize={headwordSize}
            />
          )}
        </div>
      </div>

      {/* Toujours visible en bas de page, quel que soit l'état — comme la carte « Proposer un mot » Flutter. */}
      <div className="border-t bg-white/95 px-[18px] py-3 backdrop-blur" style={{ borderColor: SIG.hairline, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <NewWordSubmission />
      </div>
    </div>
  );
}

function DirChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex h-10 flex-1 items-center justify-center rounded-full border text-[12.5px] font-extrabold"
      style={{ background: active ? SIG.goldTint : 'transparent', borderColor: active ? SIG.gold : SIG.hairline, color: active ? SIG.goldDeep : SIG.inkSoft }}>
      {label}
    </div>
  );
}

function ListenButton({ onClick, busy, stopPropagation }: { onClick: () => void; busy: boolean; stopPropagation?: boolean }) {
  return (
    <button type="button" aria-label="Écouter" disabled={busy}
      onClick={(ev) => { if (stopPropagation) ev.stopPropagation(); onClick(); }}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]" style={{ background: SIG.goldTint }}>
      {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" style={{ color: SIG.goldDeep }} /> : <Volume2 className="h-5 w-5" style={{ color: SIG.goldDeep }} />}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-5 text-[11.5px] font-black tracking-[0.06em]" style={{ color: SIG.muted }}>{children}</p>;
}

function HomeView({ wordOfTheDay, recent, favs, entries, letters, speakingKey, onSpeak, onOpenWord, onPickLetter, headwordSize }: {
  wordOfTheDay: PhoneticEntry | null; recent: string[]; favs: string[]; entries: PhoneticEntry[]; letters: string[];
  speakingKey: string | null; onSpeak: (text: string, key: string) => void; onOpenWord: (word: string) => void;
  onPickLetter: (l: string) => void; headwordSize: (t: string, base?: number) => number;
}) {
  const favEntries = entries.filter((e) => favs.includes(entryKey(e))).slice(0, 12);
  return (
    <div>
      {wordOfTheDay && (
        <div role="button" tabIndex={0} onClick={() => onOpenWord(wordOfTheDay.word)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenWord(wordOfTheDay.word); } }}
          className="block w-full cursor-pointer text-left">
          <div className="rounded-[26px] border p-[17px] pr-4" style={{ background: 'linear-gradient(135deg, #FFF9EC, #F7E3B8)', borderColor: SIG.hairlineStrong }}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" style={{ color: SIG.goldDeep }} />
              <span className="text-[11px] font-black tracking-[0.08em]" style={{ color: SIG.goldDeep }}>MOT DU JOUR</span>
              <div className="flex-1" />
              <button type="button" onClick={(e) => { e.stopPropagation(); onSpeak(wordOfTheDay.word, 'wod'); }} aria-label="Écouter" className="grid h-8 w-8 place-items-center rounded-full" style={{ background: SIG.goldTint }}>
                {speakingKey === 'wod' ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: SIG.goldDeep }} /> : <Volume2 className="h-4 w-4" style={{ color: SIG.goldDeep }} />}
              </button>
            </div>
            <p className="mt-2 line-clamp-3" style={{ fontFamily: SERIF, fontSize: headwordSize(wordOfTheDay.word), fontWeight: 700, color: SIG.ink }}>{wordOfTheDay.word}</p>
            <p className="mt-2 line-clamp-3 text-[15.5px] leading-[1.4]" style={{ color: SIG.inkSoft }}>{wordOfTheDay.definition}</p>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <>
          <SectionLabel>Recherches récentes</SectionLabel>
          <div className="flex flex-wrap gap-[7px]">
            {recent.slice(0, 6).map((r) => (
              <button key={r} type="button" onClick={() => onOpenWord(r)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold" style={{ borderColor: SIG.hairline, color: SIG.inkSoft }}>
                <History className="h-3.5 w-3.5" style={{ color: SIG.muted }} />{r}
              </button>
            ))}
          </div>
        </>
      )}

      {favEntries.length > 0 && (
        <>
          <SectionLabel>Mes favoris</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {favEntries.map((f) => (
              <button key={entryKey(f)} type="button" onClick={() => onOpenWord(f.word)} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold" style={{ borderColor: SIG.hairline, color: SIG.inkSoft }}>
                <Star className="h-3.5 w-3.5" style={{ color: SIG.gold }} />{f.word}
              </button>
            ))}
          </div>
        </>
      )}

      {letters.length > 0 && (
        <>
          <SectionLabel>Parcourir par lettre</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {letters.map((l) => (
              <button key={l} type="button" onClick={() => { triggerFeedback('click'); onPickLetter(l); }}
                className="grid h-[42px] w-[42px] place-items-center rounded-[13px] border text-[15px] font-black" style={{ borderColor: SIG.hairline, color: SIG.goldDeep }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ResultList({ results, query, baToFr, favs, speakingKey, onSpeak, onOpen }: {
  results: PhoneticEntry[]; query: string; baToFr: boolean; favs: Set<string>; speakingKey: string | null;
  onSpeak: (text: string, key: string) => void; onOpen: (e: PhoneticEntry) => void;
}) {
  if (!results.length) {
    return (
      <div className="rounded-[24px] border bg-white p-6 text-center" style={{ borderColor: SIG.hairline }}>
        <SearchX className="mx-auto h-9 w-9" style={{ color: SIG.muted }} />
        <p className="mt-2 font-extrabold">Aucun résultat pour « {query} »</p>
        <p className="mt-1 text-[14px]" style={{ color: SIG.muted }}>Essayez sans accents, avec le sens inverse, ou proposez ce mot ci-dessous.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1.5 pl-1 text-[12px] font-bold" style={{ color: SIG.muted }}>{results.length} résultat{results.length > 1 ? 's' : ''}</p>
      <div className="space-y-2">
        {results.map((e) => {
          const primary = baToFr ? e.word : e.definition;
          const secondary = baToFr ? e.definition : e.word;
          const k = entryKey(e);
          return (
            <div key={k} role="button" tabIndex={0} onClick={() => onOpen(e)}
              onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpen(e); } }}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[18px] border bg-white p-[14px] text-left" style={{ borderColor: SIG.hairline }}>
              <div className="min-w-0 flex-1">
                <p lang={baToFr ? 'bba' : 'fr'} className="truncate text-[17px] font-extrabold" style={{ color: SIG.ink }}>{primary}</p>
                <p className="line-clamp-2 text-[13px]" style={{ color: SIG.muted }}>{secondary}</p>
              </div>
              <ListenButton onClick={() => onSpeak(e.word, `row:${k}`)} busy={speakingKey === `row:${k}`} stopPropagation />
              {favs.has(k) && <Star className="h-5 w-5 shrink-0" style={{ color: SIG.gold }} />}
              <ChevronRight className="h-5 w-5 shrink-0" style={{ color: SIG.muted }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LetterList({ letter, items, onBack, onOpen }: { letter: string; items: PhoneticEntry[]; onBack: () => void; onOpen: (e: PhoneticEntry) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button type="button" aria-label="Retour" onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full border" style={{ borderColor: SIG.hairline }}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-[18px] font-black">Lettre {letter.toUpperCase()}</p>
      </div>
      <div className="space-y-2">
        {items.map((e) => (
          <button key={entryKey(e)} type="button" onClick={() => onOpen(e)} className="flex w-full items-center gap-3 rounded-[18px] border bg-white p-[14px] text-left" style={{ borderColor: SIG.hairline }}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-extrabold" style={{ color: SIG.ink }}>{e.word}</p>
              <p className="line-clamp-1 text-[13px]" style={{ color: SIG.muted }}>{e.definition}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0" style={{ color: SIG.muted }} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Block({ icon, title, text, onListen, listening, tint }: {
  icon: React.ReactNode; title: string; text: string; onListen?: () => void; listening?: boolean; tint?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-[18px] border p-3.5" style={{ borderColor: SIG.hairline, background: tint ?? SIG.appBackground }}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-black tracking-[0.03em]" style={{ color: SIG.muted }}>{title}</p>
        <p className="mt-0.5 text-[16px] leading-[1.45]" style={{ color: SIG.ink }}>{text}</p>
      </div>
      {onListen && <ListenButton onClick={onListen} busy={!!listening} />}
    </div>
  );
}

function DetailCard({ entry, baToFr, fav, onToggleFav, onBack, onSpeak, speakingKey, related, onOpenRelated, headwordSize }: {
  entry: PhoneticEntry; baToFr: boolean; fav: boolean; onToggleFav: () => void; onBack: () => void;
  onSpeak: (text: string, key: string) => void; speakingKey: string | null; related: PhoneticEntry[];
  onOpenRelated: (e: PhoneticEntry) => void; headwordSize: (t: string, base?: number) => number;
}) {
  const { toast } = useToast();
  const partLabel: Record<string, string> = { n: 'nom', v: 'verbe', adj: 'adjectif', adv: 'adverbe' };
  const part = partLabel[entry.part_of_speech] ?? entry.part_of_speech ?? '';
  const copy = () => { navigator.clipboard?.writeText(`${entry.word} — ${entry.definition}`); toast({ title: 'Copié' }); };
  return (
    <div>
      <div className="overflow-hidden rounded-[28px] border bg-white" style={{ borderColor: SIG.hairline }}>
        <div className="flex items-start gap-2 p-5 pr-2.5" style={{ background: 'linear-gradient(135deg, #FFF3DC, #F7E3B8)' }}>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-3" style={{ fontFamily: SERIF, fontSize: headwordSize(entry.word, 32), fontWeight: 700, color: SIG.ink }}>{entry.word}</p>
            {entry.phonetic && entry.phonetic !== entry.word && <p className="mt-0.5 text-[17px]" style={{ color: SIG.muted }}>[{entry.phonetic}]</p>}
            {part && (
              <span className="mt-2 inline-block rounded-full border px-2.5 py-1 text-[11.5px] font-extrabold" style={{ borderColor: SIG.hairlineStrong, color: SIG.goldDeep }}>{part}</span>
            )}
          </div>
          <div className="flex flex-col">
            <button type="button" aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={onToggleFav} className="grid h-10 w-10 place-items-center">
              <Star className={`h-5 w-5 ${fav ? 'fill-current' : ''}`} style={{ color: SIG.goldDeep }} />
            </button>
            <button type="button" aria-label="Copier" onClick={copy} className="grid h-10 w-10 place-items-center">
              <Copy className="h-5 w-5" style={{ color: SIG.goldDeep }} />
            </button>
          </div>
        </div>
        <div className="space-y-2.5 p-4">
          <Block icon={<Languages className="mt-0.5 h-5 w-5 shrink-0" style={{ color: SIG.goldDeep }} />} title="DÉFINITION" text={entry.definition}
            onListen={() => onSpeak(entry.word, 'w')} listening={speakingKey === 'w'} />
          {entry.example_bariba && (
            <Block icon={<Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: SIG.goldDeep }} />} title="EXEMPLE EN BAATƆNUM" text={entry.example_bariba}
              onListen={() => onSpeak(entry.example_bariba!, 'eb')} listening={speakingKey === 'eb'} tint={SIG.goldTint} />
          )}
          {entry.example_francais && (
            <Block icon={<Languages className="mt-0.5 h-5 w-5 shrink-0" style={{ color: SIG.goldDeep }} />} title="EN FRANÇAIS" text={entry.example_francais} />
          )}
        </div>
      </div>

      {related.length > 0 && (
        <>
          <SectionLabel>Voir aussi</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <button key={entryKey(r)} type="button" onClick={() => onOpenRelated(r)} className="rounded-full border px-3 py-1.5 text-[13px] font-bold" style={{ borderColor: SIG.hairline, color: SIG.inkSoft }}>
                {r.word}
              </button>
            ))}
          </div>
        </>
      )}

      <button type="button" onClick={onBack} className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-extrabold" style={{ color: SIG.sage }}>
        <ChevronLeft className="h-4 w-4" />Nouvelle recherche
      </button>
    </div>
  );
}
