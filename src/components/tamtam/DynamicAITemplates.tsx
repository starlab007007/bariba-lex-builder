import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, Wand2, Hash, Film, TextQuote, X, Play, Flame, Music2, 
  Zap, TrendingUp, Video, Image as ImageIcon, Copy, Check 
} from 'lucide-react';

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
  defaultLang?: 'fr' | 'ba';
  usageCount?: string;
  trending?: boolean;
}

export interface AITheme {
  id: string;
  hashtag: string;
  watchingLabel?: string;
  action: 'imitate' | 'make';
  samples?: string[];
  category?: string;
  trending?: boolean;
}

interface DynamicAITemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  language?: 'fr' | 'ba';
  onApplyTemplate?: (t: AITemplate) => void;
  onGenerated?: (payload: { type: AIGenType; content: string; templateId?: string }) => void;
}

const CATEGORIES = [
  { id: 'hot', label: '🔥 Hot', icon: <Flame className="w-4 h-4" /> },
  { id: 'newyear', label: '✨ NewYear', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'hotmusic', label: '🎵 Hot Music', icon: <Music2 className="w-4 h-4" /> },
  { id: 'new', label: '⚡ New', icon: <Zap className="w-4 h-4" /> },
  { id: 'play', label: '▶️ Play', icon: <Play className="w-4 h-4" /> },
  { id: 'trending', label: '📈 Trending', icon: <TrendingUp className="w-4 h-4" /> },
];

const DEFAULT_TEMPLATES: AITemplate[] = [
  {
    id: 'ai_edit_album',
    title: 'AI Edit Album',
    subtitle: "Sélectionne des médias, l'IA fait le montage + rythme",
    type: 'shotlist',
    tags: ['auto-edit', 'album', 'music'],
    icon: <Wand2 className="w-5 h-5" />,
    usageCount: '42.8k',
    trending: true,
  },
  {
    id: 'short_script',
    title: 'Script Court',
    subtitle: 'Intro → valeur → conclusion (30-60s)',
    type: 'script',
    tags: ['video', 'story', 'creator'],
    icon: <Film className="w-5 h-5" />,
    usageCount: '6.4k',
  },
  {
    id: 'viral_hooks',
    title: 'Accroches Virales',
    subtitle: '5 hooks prêts à dire pour capter l\'attention',
    type: 'hook',
    tags: ['hook', 'viral', 'engagement'],
    icon: <TextQuote className="w-5 h-5" />,
    usageCount: '90.3k',
    trending: true,
  },
  {
    id: 'captions',
    title: 'Captions',
    subtitle: '6 descriptions prêtes à poster',
    type: 'caption',
    tags: ['caption', 'post', 'description'],
    icon: <TextQuote className="w-5 h-5" />,
    usageCount: '12.1k',
  },
  {
    id: 'hashtags_pack',
    title: 'Pack Hashtags',
    subtitle: '10–18 hashtags pertinents pour ton contenu',
    type: 'hashtags',
    tags: ['hashtags', 'seo', 'visibility'],
    icon: <Hash className="w-5 h-5" />,
    usageCount: '28.5k',
  },
  {
    id: 'ideas',
    title: 'Idées Vidéos',
    subtitle: '8 idées créatives adaptées à ton sujet',
    type: 'suggestions',
    tags: ['ideas', 'brainstorm'],
    icon: <Sparkles className="w-5 h-5" />,
    usageCount: '15.7k',
  },
  {
    id: 'shotlist',
    title: 'Plan de Tournage',
    subtitle: 'Scènes détaillées + plans + transitions',
    type: 'shotlist',
    tags: ['shoot', 'edit', 'planning'],
    icon: <Video className="w-5 h-5" />,
    usageCount: '5.2k',
  },
  {
    id: 'live_intro',
    title: 'Intro LIVE',
    subtitle: 'Phrase d'ouverture + règles du jeu + CTA',
    type: 'live_intro',
    tags: ['live', 'streaming'],
    icon: <Sparkles className="w-5 h-5" />,
    usageCount: '3.8k',
  },
  {
    id: 'cta',
    title: 'Call-to-Action',
    subtitle: '3 CTA naturels pour engagement',
    type: 'cta',
    tags: ['cta', 'engagement'],
    icon: <TextQuote className="w-5 h-5" />,
    usageCount: '9.1k',
  },
  {
    id: 'news_style',
    title: 'Style Actualité',
    subtitle: 'Format reportage/news comme dans les médias',
    type: 'script',
    tags: ['news', 'report', 'media'],
    icon: <Film className="w-5 h-5" />,
    usageCount: '2.8k',
    trending: true,
  },
];

const DEFAULT_THEMES: AITheme[] = [
  { 
    id: 't1', 
    hashtag: '#萝卜刀猫咪变装', 
    watchingLabel: '9.8m watching', 
    action: 'imitate',
    category: 'trending',
    trending: true,
  },
  { 
    id: 't2', 
    hashtag: '#苦海翻起爱恨转场', 
    watchingLabel: '9.8m watching', 
    action: 'make',
    category: 'trending',
  },
  { 
    id: 't3', 
    hashtag: '#冬日摇', 
    watchingLabel: '9.7m watching', 
    action: 'imitate',
    category: 'hot',
  },
  { 
    id: 't4', 
    hashtag: '#DanceChallenge', 
    watchingLabel: '8.9m watching', 
    action: 'imitate',
    category: 'hot',
  },
  { 
    id: 't5', 
    hashtag: '#BeforeAfter', 
    watchingLabel: '5.4m watching', 
    action: 'make',
    category: 'new',
  },
  { 
    id: 't6', 
    hashtag: '#LearnIn60s', 
    watchingLabel: '3.6m watching', 
    action: 'make',
    category: 'new',
  },
];

function safeEnv(key: string): string | undefined {
  try {
    return (import.meta as any).env?.[key] as string | undefined;
  } catch {
    return undefined;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const anon = safeEnv('VITE_SUPABASE_ANON_KEY');
    return token ? { Authorization: `Bearer ${token}` } : anon ? { Authorization: `Bearer ${anon}` } : {};
  } catch {
    return {};
  }
}

async function generateViaStreaming(body: unknown): Promise<string> {
  const baseUrl = safeEnv('VITE_SUPABASE_URL');
  if (!baseUrl) throw new Error('Missing VITE_SUPABASE_URL');

  const auth = await getAuthHeader();
  const res = await fetch(`${baseUrl}/functions/v1/generate-content-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error(t || 'Streaming failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let out = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const chunk of parts) {
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const dataStr = line.replace(/^data:\s*/, '').trim();
      if (!dataStr || dataStr === '[DONE]') continue;
      try {
        const json = JSON.parse(dataStr);
        const delta = json?.delta?.content ?? json?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') out += delta;
      } catch {
        // ignore
      }
    }
  }

  return out.trim();
}

async function generateViaFallback(body: unknown): Promise<string> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('generate-content', { body });
    if (error) throw error;
    const content = (data as any)?.content;
    if (!content || typeof content !== 'string') return '';
    return content.trim();
  } catch {
    return '';
  }
}

export const DynamicAITemplates: React.FC<DynamicAITemplatesProps> = ({
  isOpen,
  onClose,
  topic,
  language = 'fr',
  onApplyTemplate,
  onGenerated,
}) => {
  const [tab, setTab] = useState<'template' | 'theme'>('template');
  const [category, setCategory] = useState<string>('hot');
  const [q, setQ] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [copiedId, setCopiedId] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const templates = useMemo(() => DEFAULT_TEMPLATES, []);
  const themes = useMemo(() => DEFAULT_THEMES, []);

  const filteredTemplates = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((t) => 
      `${t.title} ${t.subtitle} ${t.tags.join(' ')}`.toLowerCase().includes(query)
    );
  }, [q, templates]);

  const filteredThemes = useMemo(() => {
    if (category === 'hot') return themes;
    return themes.filter((th) => th.category === category);
  }, [category, themes]);

  useEffect(() => {
    if (!isOpen) {
      setQ('');
      setStreamText('');
      setIsGenerating(false);
      setCopiedId('');
    }
  }, [isOpen]);

  const gen = useCallback(async (t: AITemplate) => {
    if (!topic?.trim()) {
      alert(language === 'ba' ? 'Fi kókó kọ́kọ́' : 'Ajoute un sujet d\'abord');
      return;
    }

    setIsGenerating(true);
    setStreamText('');

    const payload = {
      type: t.type,
      topic,
      templateKey: t.id,
      templateId: t.id,
      language,
    };

    try {
      const content = await generateViaStreaming(payload);
      if (!content) {
        const fallback = await generateViaFallback(payload);
        setStreamText(fallback);
        onGenerated?.({ type: t.type, content: fallback, templateId: t.id });
      } else {
        setStreamText(content);
        onGenerated?.({ type: t.type, content, templateId: t.id });
      }
    } catch (e) {
      const fallback = await generateViaFallback(payload).catch(() => '');
      setStreamText(fallback);
      if (fallback) onGenerated?.({ type: t.type, content: fallback, templateId: t.id });
    } finally {
      setIsGenerating(false);
    }
  }, [language, onGenerated, topic]);

  const applyTheme = useCallback((th: AITheme) => {
    onGenerated?.({
      type: 'hashtags',
      content: th.hashtag,
      templateId: th.id,
    });
  }, [onGenerated]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    });
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[88vh] overflow-hidden"
            style={{
              background: 'rgba(20, 20, 25, 0.98)',
              backdropFilter: 'blur(40px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="text-white font-semibold text-lg">Magic AI</div>
                  <div className="text-white/50 text-xs">
                    {language === 'ba' ? 'Àwọn àpẹẹrẹ • àkọlé • hashtags' : 'Templates • thèmes • auto edit'}
                  </div>
                </div>
              </div>
              <button 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center" 
                onClick={onClose}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Search & Tabs */}
            <div className="px-4 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={language === 'ba' ? 'Wá àwọn àpẹẹrẹ...' : 'Rechercher des templates...'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-white/20 transition"
                  />
                </div>

                <button
                  onClick={() => setTab('template')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    tab === 'template' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  Template
                </button>
                <button
                  onClick={() => setTab('theme')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    tab === 'theme' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' 
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  Theme
                </button>
              </div>

              {/* Category Pills */}
              {tab === 'template' && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                        category === c.id 
                          ? 'bg-white/20 text-white border border-white/20' 
                          : 'bg-white/10 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-4 pb-5 overflow-y-auto max-h-[60vh]">
              {tab === 'template' && (
                <div className="grid grid-cols-2 gap-3">
                  {filteredTemplates.map((t) => (
                    <motion.div 
                      key={t.id} 
                      className="rounded-2xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
                          {t.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <div className="font-semibold text-sm text-white truncate">{t.title}</div>
                            {t.trending && <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" />}
                          </div>
                          <div className="text-xs text-white/60 line-clamp-2">{t.subtitle}</div>
                        </div>
                      </div>

                      {t.usageCount && (
                        <div className="text-[10px] text-white/50 mb-2">
                          {t.usageCount} usage
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {t.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-medium transition"
                          onClick={() => onApplyTemplate?.(t)}
                        >
                          Apply
                        </button>
                        <button
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium disabled:opacity-50 transition shadow-lg"
                          onClick={() => gen(t)}
                          disabled={isGenerating || !topic?.trim()}
                          title={!topic?.trim() ? (language === 'ba' ? 'Fi kókó kọ́kọ́' : 'Ajoute un sujet') : 'Générer'}
                        >
                          {isGenerating ? '...' : language === 'ba' ? 'Ṣe' : 'Generate'}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {tab === 'theme' && (
                <div className="space-y-3">
                  {filteredThemes.map((th, idx) => (
                    <motion.div 
                      key={th.id} 
                      className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-white/40 font-bold text-lg tabular-nums">
                            {(idx + 1).toString().padStart(2, '0')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-white font-semibold truncate">{th.hashtag}</div>
                              {th.trending && <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                            </div>
                            <div className="text-white/50 text-xs mt-0.5">
                              {th.watchingLabel ?? ''}
                            </div>
                          </div>
                        </div>
                        <button
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-white text-sm font-medium transition"
                          onClick={() => applyTheme(th)}
                        >
                          {th.action === 'imitate' ? (language === 'ba' ? 'Ṣe àfarawé' : 'Imiter') : (language === 'ba' ? 'Ṣe' : 'Créer')}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* AI Output */}
              <AnimatePresence>
                {(streamText || isGenerating) && (
                  <motion.div 
                    className="mt-4 rounded-2xl bg-black/40 border border-purple-500/30 p-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white/70 text-xs font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {language === 'ba' ? 'Èsì AI' : 'Résultat AI'}
                      </div>
                      {streamText && !isGenerating && (
                        <button
                          onClick={() => copyToClipboard(streamText, 'output')}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                          title={language === 'ba' ? 'Ṣe àdàkọ' : 'Copier'}
                        >
                          {copiedId === 'output' ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-white/70" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-white text-sm leading-relaxed font-sans">
                        {streamText || (
                          <span className="text-white/50 italic">
                            {language === 'ba' ? 'Ń ṣe iṣẹ́...' : 'Génération en cours...'}
                          </span>
                        )}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DynamicAITemplates;
