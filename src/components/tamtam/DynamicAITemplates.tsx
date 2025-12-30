import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Wand2, Sparkles, Hash, Film, TextQuote, Music2, Flame, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export type AIGenType =
  | 'script'
  | 'hook'
  | 'title'
  | 'caption'
  | 'hashtags'
  | 'suggestions'
  | 'shotlist'
  | 'live_intro'
  | 'cta';

type EnvLike = { env?: Record<string, string | undefined> };

function getEnvVar(key: string): string | undefined {
  try {
    const meta = import.meta as unknown as EnvLike;
    return meta.env?.[key];
  } catch {
    return undefined;
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const anon = getEnvVar('VITE_SUPABASE_ANON_KEY');

  if (token) return { Authorization: `Bearer ${token}` };
  if (anon) return { Authorization: `Bearer ${anon}` };
  return {};
}

async function readSSE(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';
  let out = '';

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;

      const raw = dataLine.replace(/^data:\s*/, '').trim();
      if (!raw || raw === '[DONE]') continue;

      try {
        const json = JSON.parse(raw) as {
          delta?: { content?: string };
          choices?: Array<{ delta?: { content?: string } }>;
        };

        const delta = json.delta?.content ?? json.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') out += delta;
      } catch {
        // ignore chunk
      }
    }
  }

  return out.trim();
}

async function generateStreaming(body: unknown): Promise<string> {
  const baseUrl = getEnvVar('VITE_SUPABASE_URL');
  if (!baseUrl) throw new Error('Missing VITE_SUPABASE_URL');

  const auth = await getAuthHeaders();
  const res = await fetch(`${baseUrl}/functions/v1/generate-content-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || 'Streaming failed');
  }

  return await readSSE(res);
}

async function generateFallback(body: unknown): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-content', { body });
  if (error) throw error;
  const content = (data as { content?: unknown })?.content;
  return typeof content === 'string' ? content.trim() : '';
}

export interface AITemplate {
  id: string;
  title: string;
  subtitle: string;
  type: AIGenType;
  pack: 'News' | 'Commerce' | 'Education' | 'Story' | 'Live';
  tags: string[];
  icon: React.ReactNode;
  prompt: (topic: string, language: 'fr' | 'ba') => string;
}

interface DynamicAITemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  language?: 'fr' | 'ba';
  onGenerated?: (payload: { type: AIGenType; content: string; templateId?: string }) => void;
}

const PACKS = [
  { id: 'hot', label: 'hot', icon: <Flame className="w-4 h-4" /> },
  { id: 'newyear', label: 'NewYear', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'hotmusic', label: 'Hot Music', icon: <Music2 className="w-4 h-4" /> },
  { id: 'new', label: 'New', icon: <Play className="w-4 h-4" /> },
] as const;

function baseSystem(language: 'fr' | 'ba'): string {
  return language === 'ba'
    ? "Tu écris en Bariba (Baatɔnum) simple, naturel. Phrases courtes. Donne du sens. Pas de blabla."
    : "Tu écris en français simple, naturel. Phrases courtes. Donne du sens. Pas de blabla.";
}

function formatRules(type: AIGenType): string {
  if (type === 'hashtags') return "Format: une seule ligne de hashtags, 10 à 18 tags, uniquement '#tag'.";
  if (type === 'hook') return 'Format: 5 hooks numérotés (1..5), une ligne chacun.';
  if (type === 'title') return 'Format: 6 titres, une ligne chacun.';
  if (type === 'caption') return 'Format: 6 captions, chacune sur 2 lignes max.';
  if (type === 'script') return 'Format: Script 30-60s en 6 blocs: Hook / Contexte / Valeur / Exemple / CTA / Outro.';
  if (type === 'shotlist') return 'Format: 8 plans, chacun: Plan + Action + Transition.';
  if (type === 'suggestions') return 'Format: 8 idées courtes (bullet points).';
  if (type === 'live_intro') return 'Format: Intro LIVE (20s) + règles + 3 CTA + question au chat.';
  if (type === 'cta') return 'Format: 6 CTA naturels (1 ligne chacun).';
  return 'Format clair.';
}

const TEMPLATES: AITemplate[] = [
  {
    id: 'news_hook',
    title: 'News Hook',
    subtitle: 'Accroches pour infos',
    type: 'hook',
    pack: 'News',
    tags: ['news', 'viral'],
    icon: <TextQuote className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('hook')}\nSujet: ${topic}\nStyle: crédible, simple, orienté public.`,
  },
  {
    id: 'news_script',
    title: 'News Script',
    subtitle: 'Script 45s (info)',
    type: 'script',
    pack: 'News',
    tags: ['news', 'script'],
    icon: <Film className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('script')}\nSujet: ${topic}\nContrainte: pas d’invention de chiffres.`,
  },

  {
    id: 'biz_caption',
    title: 'Commerce Caption',
    subtitle: 'Vendre sans forcer',
    type: 'caption',
    pack: 'Commerce',
    tags: ['business', 'sales'],
    icon: <Sparkles className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('caption')}\nProduit/Service: ${topic}\nInclure: bénéfice + preuve + CTA doux.`,
  },
  {
    id: 'biz_hashtags',
    title: 'Commerce Hashtags',
    subtitle: 'Tags pour visibilité',
    type: 'hashtags',
    pack: 'Commerce',
    tags: ['hashtags'],
    icon: <Hash className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('hashtags')}\nSujet/Produit: ${topic}\nMix: local + global + niche.`,
  },

  {
    id: 'edu_shotlist',
    title: 'Éducation Shotlist',
    subtitle: 'Plans + transitions',
    type: 'shotlist',
    pack: 'Education',
    tags: ['education', 'shoot'],
    icon: <Film className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('shotlist')}\nThème éducatif: ${topic}\nObjectif: compréhensible pour non-lettrés.`,
  },
  {
    id: 'edu_suggestions',
    title: 'Idées Éducation',
    subtitle: '8 idées simples',
    type: 'suggestions',
    pack: 'Education',
    tags: ['ideas'],
    icon: <Sparkles className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('suggestions')}\nThème: ${topic}\nTonalité: utile, concret.`,
  },

  {
    id: 'story_title',
    title: 'Story Titles',
    subtitle: 'Titres attractifs',
    type: 'title',
    pack: 'Story',
    tags: ['story'],
    icon: <TextQuote className="w-5 h-5" />,
    prompt: (topic, language) => `${baseSystem(language)}\n${formatRules('title')}\nThème: ${topic}\nStyle: émotion + curiosité.`,
  },
  {
    id: 'story_hashtags',
    title: 'Story Hashtags',
    subtitle: 'Tags story',
    type: 'hashtags',
    pack: 'Story',
    tags: ['hashtags'],
    icon: <Hash className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('hashtags')}\nThème story: ${topic}\nMix: storytelling + local.`,
  },

  {
    id: 'live_intro',
    title: 'Intro LIVE',
    subtitle: 'Ouverture + CTA + question',
    type: 'live_intro',
    pack: 'Live',
    tags: ['live'],
    icon: <Sparkles className="w-5 h-5" />,
    prompt: (topic, language) =>
      `${baseSystem(language)}\n${formatRules('live_intro')}\nSujet LIVE: ${topic}\nRendre interactif: questions au chat.`,
  },
  {
    id: 'live_cta',
    title: 'CTA LIVE',
    subtitle: 'CTA naturels',
    type: 'cta',
    pack: 'Live',
    tags: ['cta', 'live'],
    icon: <TextQuote className="w-5 h-5" />,
    prompt: (topic, language) => `${baseSystem(language)}\n${formatRules('cta')}\nSujet: ${topic}\n`,
  },
];

export const DynamicAITemplates: React.FC<DynamicAITemplatesProps> = ({
  isOpen,
  onClose,
  topic,
  language = 'fr',
  onGenerated,
}) => {
  const [tab, setTab] = useState<'template' | 'theme'>('template');
  const [q, setQ] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const templates = useMemo(() => TEMPLATES, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((t) => `${t.title} ${t.subtitle} ${t.tags.join(' ')} ${t.pack}`.toLowerCase().includes(query));
  }, [q, templates]);

  useEffect(() => {
    if (!isOpen) {
      setQ('');
      setOutput('');
      setIsGenerating(false);
      setTab('template');
    }
  }, [isOpen]);

  const generate = async (t: AITemplate) => {
    const cleanTopic = topic?.trim();
    if (!cleanTopic) return;

    triggerFeedback('notification');
    setIsGenerating(true);
    setOutput('');

    const prompt = t.prompt(cleanTopic, language);

    const payload = {
      type: t.type,
      topic: cleanTopic,
      templateKey: t.id,
      templateId: t.id,
      language,
      prompt, // ✅ “pré-défini” → output plus stable
    };

    try {
      const streamed = await generateStreaming(payload);
      const content = streamed || (await generateFallback(payload));
      setOutput(content);
      if (content) onGenerated?.({ type: t.type, content, templateId: t.id });
    } catch {
      const fallback = await generateFallback(payload).catch(() => '');
      setOutput(fallback);
      if (fallback) onGenerated?.({ type: t.type, content: fallback, templateId: t.id });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="absolute bottom-0 left-0 right-0 ios-glass-dark rounded-t-3xl max-h-[85vh] overflow-hidden"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-white/30 rounded-full" />
          </div>

          <div className="px-4 pb-2 flex items-center justify-between">
            <div>
              <div className="text-white font-semibold text-lg">Templates IA</div>
              <div className="text-white/50 text-xs">Packs clairs • prompts structurés</div>
            </div>
            <button className="p-2 rounded-full bg-white/10 text-white" onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/10 text-white placeholder:text-white/40 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTab('template')}
                className={`px-3 py-2 rounded-xl text-sm ${tab === 'template' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}
              >
                Template
              </button>
              <button
                onClick={() => setTab('theme')}
                className={`px-3 py-2 rounded-xl text-sm ${tab === 'theme' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}
              >
                Theme
              </button>
            </div>
          </div>

          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {PACKS.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-white/10 text-white/70">
                {c.icon}
                {c.label}
              </div>
            ))}
          </div>

          <div className="px-4 pb-5 overflow-y-auto max-h-[55vh]">
            {tab === 'template' && (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((t) => (
                  <div key={t.id} className="rounded-2xl bg-white/10 p-3 border border-white/10">
                    <div className="flex items-center gap-2 text-white">
                      <div className="p-2 rounded-xl bg-white/10">{t.icon}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{t.title}</div>
                        <div className="text-xs text-white/60 truncate">{t.subtitle}</div>
                        <div className="text-[10px] text-white/50 mt-0.5">{t.pack}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3">
                      <button
                        className="w-full py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-50"
                        onClick={() => generate(t)}
                        disabled={isGenerating || !topic?.trim()}
                      >
                        {isGenerating ? '...' : 'Generate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'theme' && (
              <div className="rounded-2xl bg-white/10 border border-white/10 p-4 text-white/70 text-sm">
                Themes: tu peux brancher tes thèmes Kuaishou ici (hashtags + musiques + template pack).
              </div>
            )}

            {(output || isGenerating) && (
              <div className="mt-4 rounded-2xl bg-black/30 border border-white/10 p-3">
                <div className="text-white/70 text-xs mb-2">AI Output</div>
                <pre className="whitespace-pre-wrap text-white text-sm leading-relaxed">{output || '...'}</pre>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DynamicAITemplates;
