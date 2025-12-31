import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Sparkles, Wand2, Hash, Film, TextQuote, X, Play, Flame, Music2,
  Zap, TrendingUp, Video, Copy, Check, ChevronLeft, ChevronRight, RotateCcw
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
  { id: 'viral', label: '🚀 Viral', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'comedy', label: '😂 Comedy', icon: <Sparkles className="w-4 h-4" /> },
];

const DEFAULT_TEMPLATES: AITemplate[] = [
  {
    id: 'ai_edit_album',
    title: 'AI Edit Album',
    subtitle: "Sélectionne des médias, l'IA fait le montage",
    type: 'shotlist',
    tags: ['auto-edit', 'album', 'music'],
    icon: <Wand2 className="w-5 h-5" />,
    usageCount: '42.8k',
    trending: true,
  },
  {
    id: 'short_script',
    title: 'Script Court',
    subtitle: 'Intro, valeur, conclusion (30-60s)',
    type: 'script',
    tags: ['video', 'story', 'creator'],
    icon: <Film className="w-5 h-5" />,
    usageCount: '6.4k',
  },
  {
    id: 'viral_hooks',
    title: 'Accroches Virales',
    subtitle: "5 hooks pour capter l'attention",
    type: 'hook',
    tags: ['hook', 'viral', 'engagement'],
    icon: <TextQuote className="w-5 h-5" />,
    usageCount: '90.3k',
    trending: true,
  },
  {
    id: 'captions',
    title: 'Captions',
    subtitle: '6 descriptions pretes a poster',
    type: 'caption',
    tags: ['caption', 'post', 'description'],
    icon: <TextQuote className="w-5 h-5" />,
    usageCount: '12.1k',
  },
  {
    id: 'hashtags_pack',
    title: 'Pack Hashtags',
    subtitle: '10-18 hashtags pertinents',
    type: 'hashtags',
    tags: ['hashtags', 'seo', 'visibility'],
    icon: <Hash className="w-5 h-5" />,
    usageCount: '28.5k',
  },
  {
    id: 'ideas',
    title: 'Idees Videos',
    subtitle: '8 idees creatives adaptees',
    type: 'suggestions',
    tags: ['ideas', 'brainstorm'],
    icon: <Sparkles className="w-5 h-5" />,
    usageCount: '15.7k',
  },
  {
    id: 'shotlist',
    title: 'Plan de Tournage',
    subtitle: 'Scenes detaillees + plans + transitions',
    type: 'shotlist',
    tags: ['shoot', 'edit', 'planning'],
    icon: <Video className="w-5 h-5" />,
    usageCount: '5.2k',
  },
  {
    id: 'live_intro',
    title: 'Intro LIVE',
    subtitle: "Phrase d'ouverture + regles du jeu + CTA",
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
];

const DEFAULT_THEMES: AITheme[] = [
  { id: 't1', hashtag: '#DanceChallenge', watchingLabel: '9.8m watching', action: 'imitate', category: 'trending', trending: true },
  { id: 't2', hashtag: '#BeforeAfter', watchingLabel: '9.8m watching', action: 'make', category: 'trending' },
  { id: 't3', hashtag: '#LearnIn60s', watchingLabel: '9.7m watching', action: 'imitate', category: 'hot' },
  { id: 't4', hashtag: '#VillageNews', watchingLabel: '8.9m watching', action: 'imitate', category: 'hot' },
  { id: 't5', hashtag: '#CookingTime', watchingLabel: '5.4m watching', action: 'make', category: 'new' },
  { id: 't6', hashtag: '#Fashion2025', watchingLabel: '3.6m watching', action: 'make', category: 'new' },
];

function safeEnv(key: string): string | undefined {
  try {
    return (import.meta as Record<string, Record<string, string>>).env?.[key];
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
        // ignore parse errors
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
    const content = (data as Record<string, unknown>)?.content;
    if (!content || typeof content !== 'string') return '';
    return content.trim();
  } catch {
    return '';
  }
}

const ScrollIndicator: React.FC<{ direction: 'left' | 'right'; onClick: () => void; visible: boolean }> = ({
  direction, onClick, visible,
}) => {
  if (!visible) return null;
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-black/80 transition ${
        direction === 'left' ? 'left-0' : 'right-0'
      }`}
      aria-label={direction === 'left' ? 'Défiler gauche' : 'Défiler droite'}
    >
      {direction === 'left' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </button>
  );
};

export const DynamicAITemplates: React.FC<DynamicAITemplatesProps> = ({
  isOpen, onClose, topic, language = 'fr', onApplyTemplate, onGenerated,
}) => {
  const [tab, setTab] = useState<'template' | 'theme'>('template');
  const [category, setCategory] = useState<string>('hot');
  const [q, setQ] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [copiedId, setCopiedId] = useState<string>('');
  const categoriesRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const checkScrollability = useCallback(() => {
    if (categoriesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  }, []);

  useEffect(() => {
    checkScrollability();
    window.addEventListener('resize', checkScrollability);
    return () => window.removeEventListener('resize', checkScrollability);
  }, [checkScrollability, tab]);

  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoriesRef.current) {
      const scrollAmount = 150;
      categoriesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollability, 300);
    }
  }, [checkScrollability]);

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
      alert(language === 'ba' ? 'Fi koko kọkọ' : "Ajoute un sujet d'abord");
      return;
    }
    setIsGenerating(true);
    setStreamText('');
    const payload = { type: t.type, topic, templateKey: t.id, templateId: t.id, language };
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
    } catch {
      const fallback = await generateViaFallback(payload).catch(() => '');
      setStreamText(fallback);
      if (fallback) onGenerated?.({ type: t.type, content: fallback, templateId: t.id });
    } finally {
      setIsGenerating(false);
    }
  }, [language, onGenerated, topic]);

  const applyTheme = useCallback((th: AITheme) => {
    onGenerated?.({ type: 'hashtags', content: th.hashtag, templateId: th.id });
  }, [onGenerated]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 2000);
    });
  }, []);

  const resetOutput = useCallback(() => {
    setStreamText('');
    setIsGenerating(false);
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
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[88vh] overflow-hidden flex flex-col"
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
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            <div className="px-4 pb-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="text-white font-semibold text-lg">Magic AI</div>
                  <div className="text-white/50 text-xs">
                    {language === 'ba' ? 'Awọn apẹẹrẹ, akọlé, hashtags' : 'Templates, thèmes, auto edit'}
                  </div>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center"
                onClick={onClose}
                aria-label={language === 'ba' ? 'Pade' : 'Fermer'}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="px-4 pb-3 space-y-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={language === 'ba' ? 'Wa awọn apẹẹrẹ...' : 'Rechercher des templates...'}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-white/20 transition"
                    aria-label={language === 'ba' ? 'Wa awọn apẹẹrẹ' : 'Rechercher des templates'}
                  />
                </div>
                <button
                  onClick={() => setTab('template')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    tab === 'template'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                  aria-pressed={tab === 'template'}
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
                  aria-pressed={tab === 'theme'}
                >
                  Theme
                </button>
              </div>

              {tab === 'template' && (
                <div className="relative">
                  <ScrollIndicator direction="left" onClick={() => scrollCategories('left')} visible={canScrollLeft} />
                  <ScrollIndicator direction="right" onClick={() => scrollCategories('right')} visible={canScrollRight} />
                  {canScrollLeft && (
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[rgba(20,20,25,0.98)] to-transparent z-[5] pointer-events-none" />
                  )}
                  {canScrollRight && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[rgba(20,20,25,0.98)] to-transparent z-[5] pointer-events-none" />
                  )}
                  <div
                    ref={categoriesRef}
                    onScroll={checkScrollability}
                    className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory px-1 py-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition snap-start flex-shrink-0 ${
                          category === c.id
                            ? 'bg-white/20 text-white border border-white/20'
                            : 'bg-white/10 text-white/70 hover:bg-white/15'
                        }`}
                        aria-pressed={category === c.id}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 pb-5 overflow-y-auto flex-1 scroll-smooth snap-y snap-mandatory overscroll-contain">
              {tab === 'template' && (
                <div className="grid grid-cols-2 gap-3">
                  {filteredTemplates.map((t) => (
                    <motion.div
                      key={t.id}
                      className="rounded-2xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition snap-start"
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
                        <div className="text-[10px] text-white/50 mb-2">{t.usageCount} usage</div>
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
                          aria-label={`Appliquer ${t.title}`}
                        >
                          Apply
                        </button>
                        <button
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium disabled:opacity-50 transition shadow-lg"
                          onClick={() => gen(t)}
                          disabled={isGenerating || !topic?.trim()}
                          aria-label={`Generer ${t.title}`}
                        >
                          {isGenerating ? '...' : language === 'ba' ? 'Se' : 'Generate'}
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
                      className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition snap-start"
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
                            <div className="text-white/50 text-xs mt-0.5">{th.watchingLabel ?? ''}</div>
                          </div>
                        </div>
                        <button
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-white text-sm font-medium transition"
                          onClick={() => applyTheme(th)}
                          aria-label={th.action === 'imitate' ? 'Imiter ce theme' : 'Creer avec ce theme'}
                        >
                          {th.action === 'imitate' ? (language === 'ba' ? 'Se afarawe' : 'Imiter') : (language === 'ba' ? 'Se' : 'Creer')}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <AnimatePresence>
                {(streamText || isGenerating) && (
                  <motion.div
                    className="mt-4 rounded-2xl bg-black/40 border border-purple-500/30 p-4 snap-start"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white/70 text-xs font-medium flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {language === 'ba' ? 'Esi AI' : 'Résultat AI'}
                      </div>
                      <div className="flex items-center gap-2">
                        {streamText && !isGenerating && (
                          <>
                            <button
                              onClick={resetOutput}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                              aria-label={language === 'ba' ? 'Tun bẹrẹ' : 'Réinitialiser'}
                            >
                              <RotateCcw className="w-4 h-4 text-white/70" />
                            </button>
                            <button
                              onClick={() => copyToClipboard(streamText, 'output')}
                              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                              aria-label={language === 'ba' ? 'Se adako' : 'Copier le résultat'}
                            >
                              {copiedId === 'output' ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-white/70" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 max-h-[200px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-white text-sm leading-relaxed font-sans">
                        {streamText || (
                          <span className="text-white/50 italic">
                            {language === 'ba' ? 'N se ise...' : 'Génération en cours...'}
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
