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

export interface AITemplate {
  id: string;
  title: string;
  subtitle: string;
  type: AIGenType;
  tags: string[];
  icon: React.ReactNode;
}

export interface AITheme {
  id: string;
  hashtag: string;
  watchingLabel?: string;
  action: 'imitate' | 'make';
}

interface DynamicAITemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  language?: 'fr' | 'ba';
  onApplyTemplate?: (t: AITemplate) => void;
  onGenerated?: (payload: { type: AIGenType; content: string; templateId?: string }) => void;
}

type EnvLike = { env?: Record<string, string | undefined> };

function getEnvVar(key: string): string | undefined {
  // Vite: (import.meta as EnvLike).env
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

const CATEGORIES = [
  { id: 'hot', label: 'hot', icon: <Flame className="w-4 h-4" /> },
  { id: 'newyear', label: 'NewYear', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'hotmusic', label: 'Hot Music', icon: <Music2 className="w-4 h-4" /> },
  { id: 'new', label: 'New', icon: <Play className="w-4 h-4" /> },
] as const;

const DEFAULT_TEMPLATES: AITemplate[] = [
  { id: 'ai_edit', title: 'AI Edit', subtitle: 'Auto montage + rythme', type: 'shotlist', tags: ['auto-edit', 'music'], icon: <Wand2 className="w-5 h-5" /> },
  { id: 'script', title: 'Script court (30-60s)', subtitle: 'Intro → valeur → conclusion', type: 'script', tags: ['video', 'story'], icon: <Film className="w-5 h-5" /> },
  { id: 'hooks', title: 'Accroches virales', subtitle: '5 hooks prêts à dire', type: 'hook', tags: ['viral'], icon: <TextQuote className="w-5 h-5" /> },
  { id: 'captions', title: 'Captions', subtitle: '6 descriptions prêtes à poster', type: 'caption', tags: ['post'], icon: <TextQuote className="w-5 h-5" /> },
  { id: 'hashtags', title: 'Hashtags', subtitle: '10–18 hashtags pertinents', type: 'hashtags', tags: ['hashtags'], icon: <Hash className="w-5 h-5" /> },
  { id: 'ideas', title: 'Idées', subtitle: '8 idées adaptées à ton sujet', type: 'suggestions', tags: ['ideas'], icon: <Sparkles className="w-5 h-5" /> },
  { id: 'shotlist', title: 'Plan de tournage', subtitle: 'Plans + transitions', type: 'shotlist', tags: ['shoot', 'edit'], icon: <Film className="w-5 h-5" /> },
  { id: 'live_intro', title: 'Intro LIVE', subtitle: 'Ouverture + règles + CTA', type: 'live_intro', tags: ['live'], icon: <Sparkles className="w-5 h-5" /> },
  { id: 'cta', title: 'CTA', subtitle: '3 CTA naturels', type: 'cta', tags: ['cta'], icon: <TextQuote className="w-5 h-5" /> },
];

const DEFAULT_THEMES: AITheme[] = [
  { id: 't1', hashtag: '#MoodStory', watchingLabel: '2.1m watching', action: 'make' },
  { id: 't2', hashtag: '#VillageNews', watchingLabel: '5.4m watching', action: 'imitate' },
  { id: 't3', hashtag: '#BeforeAfter', watchingLabel: '8.9m watching', action: 'imitate' },
  { id: 't4', hashtag: '#DanceChallenge', watchingLabel: '9.8m watching', action: 'imitate' },
];

export const DynamicAITemplates: React.FC<DynamicAITemplatesProps> = ({
  isOpen,
  onClose,
  topic,
  language = 'fr',
  onApplyTemplate,
  onGenerated,
}) => {
  const [tab, setTab] = useState<'template' | 'theme'>('template');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('hot');
  const [q, setQ] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const templates = useMemo(() => DEFAULT_TEMPLATES, []);
  const themes = useMemo(() => DEFAULT_THEMES, []);

  const filteredTemplates = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((t) => `${t.title} ${t.subtitle} ${t.tags.join(' ')}`.toLowerCase().includes(query));
  }, [q, templates]);

  useEffect(() => {
    if (!isOpen) {
      setQ('');
      setOutput('');
      setIsGenerating(false);
      setTab('template');
      setCategory('hot');
    }
  }, [isOpen]);

  const generate = async (t: AITemplate) => {
    const cleanTopic = topic?.trim();
    if (!cleanTopic) return;

    triggerFeedback('notification');
    setIsGenerating(true);
    setOutput('');

    const payload = {
      type: t.type,
      topic: cleanTopic,
      templateKey: t.id,
      templateId: t.id,
      language,
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

  const applyTheme = (th: AITheme) => {
    triggerFeedback('notification');
    onGenerated?.({ type: 'hashtags', content: th.hashtag, templateId: th.id });
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
              <div className="text-white font-semibold text-lg">Magic</div>
              <div className="text-white/50 text-xs">AI templates • themes • auto edit</div>
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

          {tab === 'template' && (
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    category === c.id ? 'bg-primary text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <div className="px-4 pb-5 overflow-y-auto max-h-[55vh]">
            {tab === 'template' && (
              <div className="grid grid-cols-2 gap-3">
                {filteredTemplates.map((t) => (
                  <div key={t.id} className="rounded-2xl bg-white/10 p-3 border border-white/10">
                    <div className="flex items-center gap-2 text-white">
                      <div className="p-2 rounded-xl bg-white/10">{t.icon}</div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{t.title}</div>
                        <div className="text-xs text-white/60 truncate">{t.subtitle}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/70">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 py-2 rounded-xl bg-white/10 text-white text-sm" onClick={() => onApplyTemplate?.(t)}>
                        Apply
                      </button>
                      <button
                        className="flex-1 py-2 rounded-xl bg-primary text-white text-sm disabled:opacity-50"
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
              <div className="space-y-3">
                {themes.map((th, idx) => (
                  <div key={th.id} className="rounded-2xl bg-white/10 p-4 border border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-semibold">
                          <span className="text-white/60 mr-2">{idx + 1}</span>
                          {th.hashtag}
                        </div>
                        <div className="text-white/50 text-xs">{th.watchingLabel ?? ''}</div>
                      </div>
                      <button className="px-4 py-2 rounded-full bg-white/15 text-white text-sm" onClick={() => applyTheme(th)}>
                        {th.action === 'imitate' ? 'Imitate' : 'Make'}
                      </button>
                    </div>
                  </div>
                ))}
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

// ✅ Important: keep both named AND default export
export default DynamicAITemplates;
