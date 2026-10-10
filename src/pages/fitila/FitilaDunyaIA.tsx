import { useEffect, useMemo, useState } from 'react';
import { BrainCircuit, Camera, Database, HardDriveDownload, Mic, Send, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
import { useSideMenu } from './FitilaApp';
import { SIG } from '@/components/fitila/signatureTheme';
import apprendreData from '@/data/apprendre_v2.json';
import scenesData from '@/data/scenes_v2.json';
import dictionaryData from '@/assets/bariba_dictionary.json';
import {
  appendMessages,
  audit,
  ensureDunyaFoundation,
  loadMemories,
  loadMessages,
  saveMemory as saveLocalMemory,
} from '@/lib/dunya/localStore';

type DunyaMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; ref?: string; text?: string }[];
  createdAt: number;
};

type MemoryItem = {
  id: string;
  content: string;
  createdAt: number;
};

function normalize(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ɔɛãĩũõñœ\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectText(value: unknown, path = '', out: { text: string; title: string; ref?: string }[] = []) {
  if (!value) return out;
  if (typeof value === 'string') {
    if (value.trim().length >= 12) out.push({ text: value.trim(), title: path || 'Ressource FITILA' });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectText(v, `${path} #${i + 1}`, out));
    return out;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const title = String(o.title_fr || o.title || o.name || o.word || o.ba || o.fr || path || 'Ressource FITILA');
    const ref = typeof o.ref === 'string' ? o.ref : typeof o.src === 'string' ? o.src : undefined;
    for (const [k, v] of Object.entries(o)) {
      if (['id', 'icon', 'version', 'order'].includes(k)) continue;
      collectText(v, title, out);
    }
  }
  return out;
}

const LOCAL_KNOWLEDGE = [
  ...collectText(dictionaryData, 'DUNYA Dictionnaire'),
  ...collectText(apprendreData, 'DUNYA Apprendre'),
  ...collectText(scenesData, 'DUNYA Apprendre · Scènes'),
];

function localAnswer(query: string) {
  const q = normalize(query);
  const terms = q.split(' ').filter((x) => x.length > 2);
  const ranked = LOCAL_KNOWLEDGE
    .map((item) => {
      const text = normalize(item.text);
      let score = 0;
      if (q && text.includes(q)) score += 12;
      for (const term of terms) if (text.includes(term)) score += 2;
      return { ...item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!ranked.length) {
    return {
      content:
        "Je n’ai pas trouvé de source locale suffisamment pertinente dans les ressources FITILA embarquées. DUNYA reste hors ligne et préfère ne pas inventer une réponse sans source.",
      sources: [] as { title: string; ref?: string; text?: string }[],
    };
  }

  const lead = ranked[0];
  const excerpt = lead.text.length > 520 ? `${lead.text.slice(0, 520)}…` : lead.text;
  return {
    content: `Voici ce que je trouve dans les ressources locales FITILA :\n\n${excerpt}`,
    sources: ranked.map(({ title, ref, text }) => ({ title, ref, text })),
  };
}

export default function FitilaDunyaIA() {
  const { open } = useSideMenu();
  const [messages, setMessages] = useState<DunyaMessage[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [value, setValue] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [selectedSource, setSelectedSource] = useState<{ title: string; ref?: string; text?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureDunyaFoundation();
        const [storedMessages, storedMemories] = await Promise.all([loadMessages(), loadMemories()]);
        if (cancelled) return;
        setMessages(storedMessages as DunyaMessage[]);
        setMemories(storedMemories.map((content, index) => ({
          id: `memory-${index}`,
          content,
          createdAt: Date.now() - index,
        })));
        await audit('dunya_opened', { offline: true, surface: 'web' });
      } finally {
        if (!cancelled) setLoadingLocal(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const status = useMemo(
    () => ({
      model: 'DUNYA Fallback',
      mode: '100 % local',
      knowledge: LOCAL_KNOWLEDGE.length,
    }),
    [],
  );

  const ask = async () => {
    const clean = value.trim();
    if (!clean) return;
    const user: DunyaMessage = { id: crypto.randomUUID(), role: 'user', content: clean, createdAt: Date.now() };
    const result = localAnswer(clean);
    const assistant: DunyaMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.content,
      sources: result.sources,
      createdAt: Date.now() + 1,
    };
    const next = [...messages, user, assistant];
    setMessages(next);
    setValue('');
    await appendMessages([user, assistant]);
    await audit('dunya_query', {
      grounded: assistant.sources?.length ? true : false,
      sourceCount: assistant.sources?.length ?? 0,
      surface: 'web',
    });
  };

  const saveMemory = async (content: string) => {
    if (memories.some((m) => m.content === content)) return;
    const next = [{ id: crypto.randomUUID(), content, createdAt: Date.now() }, ...memories].slice(0, 100);
    setMemories(next);
    await saveLocalMemory(content);
    await audit('dunya_memory_saved', { source: 'assistant', surface: 'web' });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ background: SIG.appBackground, color: SIG.ink }}>
      <header className="shrink-0 border-b px-3 pb-3 pl-[74px] pt-3 md:px-5" style={{ borderColor: SIG.hairline }}>
        <div className="flex items-center gap-3">
          <button onClick={open} className="grid h-11 w-11 place-items-center rounded-2xl border bg-white md:hidden" style={{ borderColor: SIG.hairline }}>
            <span className="text-xl">☰</span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black">DUNYA IA</h1>
              <span className="rounded-full px-2 py-1 text-[10px] font-black" style={{ background: '#DDEEE2', color: '#315E45' }}>
                HORS LIGNE
              </span>
            </div>
            <p className="truncate text-sm" style={{ color: SIG.muted }}>Votre intelligence, partout.</p>
          </div>
          <WifiOff className="h-5 w-5" style={{ color: SIG.sage }} />
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-3 py-3 sm:px-5">
        {loadingLocal ? (
          <div className="grid h-full min-h-[280px] place-items-center">
            <div className="text-center">
              <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#C99530]/25 border-t-[#C99530]" />
              <p className="mt-3 text-sm font-bold" style={{ color: SIG.muted }}>Préparation de DUNYA local…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <section className="rounded-[28px] border p-5 shadow-sm" style={{ borderColor: SIG.hairline, background: SIG.surface }}>
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: '#241F2E', color: '#F3E3B9' }}>
                  <BrainCircuit className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Une intelligence dans votre téléphone.</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: SIG.muted }}>
                    Posez une question, explorez les savoirs FITILA et gardez vos informations privées sur l’appareil.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Discuter', Sparkles, 'Actif'],
                  ['Parler', Mic, 'À installer'],
                  ['Mes savoirs', Database, `${memories.length} mémoire${memories.length > 1 ? 's' : ''}`],
                  ['Comprendre', Camera, 'À installer'],
                ].map(([label, Icon, sub]) => (
                  <div key={String(label)} className="rounded-2xl border bg-white p-3" style={{ borderColor: SIG.hairline }}>
                    <Icon className="h-5 w-5" style={{ color: SIG.goldDeep }} />
                    <div className="mt-3 text-sm font-black">{String(label)}</div>
                    <div className="mt-1 text-[11px]" style={{ color: SIG.muted }}>{String(sub)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: SIG.hairline }}>
                <HardDriveDownload className="h-5 w-5" style={{ color: SIG.goldDeep }} />
                <div className="mt-2 text-sm font-black">{status.model}</div>
                <div className="text-xs" style={{ color: SIG.muted }}>Recherche documentaire locale</div>
              </div>
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: SIG.hairline }}>
                <ShieldCheck className="h-5 w-5" style={{ color: SIG.sage }} />
                <div className="mt-2 text-sm font-black">{status.mode}</div>
                <div className="text-xs" style={{ color: SIG.muted }}>Aucune API nécessaire pour répondre</div>
              </div>
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: SIG.hairline }}>
                <Database className="h-5 w-5" style={{ color: SIG.goldDeep }} />
                <div className="mt-2 text-sm font-black">Savoirs FITILA</div>
                <div className="text-xs" style={{ color: SIG.muted }}>Dictionnaire · Apprendre · scènes</div>
              </div>
            </section>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-3 pb-3">
            {messages.map((m) => (
              <article
                key={m.id}
                className={`rounded-[22px] border p-4 ${m.role === 'user' ? 'ml-8 bg-[#241F2E] text-white' : 'mr-8 bg-white'}`}
                style={{ borderColor: m.role === 'user' ? '#241F2E' : SIG.hairline }}
              >
                <p className="whitespace-pre-wrap text-[15px] leading-6">{m.content}</p>
                {m.role === 'assistant' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {m.sources?.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedSource(s)}
                        className="rounded-full border px-2.5 py-1 text-[10px] font-bold"
                        style={{ borderColor: SIG.hairline, color: SIG.goldDeep, background: '#F7F2E5' }}
                      >
                        {s.title}{s.ref ? ` · ${s.ref}` : ''}
                      </button>
                    ))}
                    <button onClick={() => saveMemory(m.content)} className="rounded-full px-2.5 py-1 text-[10px] font-black" style={{ background: SIG.surfaceAlt, color: SIG.goldDeep }}>
                      Mémoriser
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>

      {selectedSource && (
        <div
          className="fixed inset-0 z-[140] grid place-items-end bg-black/35 p-3 sm:place-items-center"
          onClick={() => setSelectedSource(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Source DUNYA"
            className="max-h-[72vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border bg-[#FDFCF7] p-5 shadow-2xl"
            style={{ borderColor: SIG.hairline }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide" style={{ color: SIG.goldDeep }}>Source locale FITILA</div>
                <h3 className="mt-1 text-lg font-black">{selectedSource.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedSource(null)} className="h-10 w-10 rounded-full border bg-white text-lg" style={{ borderColor: SIG.hairline }}>×</button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7" style={{ color: SIG.inkSoft }}>
              {selectedSource.text || 'Le contenu détaillé de cette source n’est pas disponible dans cet historique.'}
            </p>
            {selectedSource.ref && <p className="mt-3 text-xs font-bold" style={{ color: SIG.goldDeep }}>Référence : {selectedSource.ref}</p>}
          </section>
        </div>
      )}

      <footer className="shrink-0 border-t bg-[#F7F5EC]/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:px-5" style={{ borderColor: SIG.hairline }}>
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder="Demandez à DUNYA…"
            rows={1}
            className="min-h-14 max-h-28 flex-1 resize-none rounded-[20px] border bg-white px-4 py-4 text-[16px] outline-none focus:ring-2"
            style={{ borderColor: SIG.hairline, boxShadow: '0 8px 26px -20px rgba(36,31,46,.45)' }}
          />
          <button onClick={ask} disabled={!value.trim()} className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] disabled:opacity-40" style={{ background: SIG.gold, color: '#241F2E' }}>
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="mx-auto mt-1 max-w-3xl text-center text-[10px]" style={{ color: SIG.muted }}>
          DUNYA V1 · réponse locale · sources embarquées · mémoire privée locale
        </p>
      </footer>
    </div>
  );
}
