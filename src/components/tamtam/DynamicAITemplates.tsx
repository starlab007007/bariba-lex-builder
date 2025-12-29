import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Loader2, X } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useToast } from '@/hooks/use-toast';
import { triggerFeedback } from '@/utils/tamtamFeedback';

export type CreatorIntent =
  | 'education'
  | 'culture'
  | 'business'
  | 'community'
  | 'humor'
  | 'news'
  | 'faith'
  | 'other';

export type CreatorSegment = 'intro' | 'message' | 'outro';

type AITemplateType = 'script' | 'hashtags' | 'hook' | 'intro' | 'outro' | 'suggestions';

interface AITemplate {
  id: string;
  icon: string;
  label: string;
  label_ba?: string;
  type: AITemplateType;
  color: string; // tailwind gradient
  description: string;
}

const AI_TEMPLATES: AITemplate[] = [
  { id: 'script', icon: '✨', label: 'Script IA', label_ba: 'Àkọsílẹ̀ IA', type: 'script', color: 'from-violet-500 to-purple-600', description: 'Génère un script complet' },
  { id: 'hashtags', icon: '#️⃣', label: 'Hashtags', label_ba: 'Àmì', type: 'hashtags', color: 'from-blue-500 to-cyan-500', description: 'Hashtags tendance' },
  { id: 'hook', icon: '💡', label: 'Hook viral', label_ba: 'Ìmúdání', type: 'hook', color: 'from-amber-500 to-orange-500', description: 'Accroches percutantes' },
  { id: 'intro', icon: '🎬', label: 'Intro', label_ba: 'Ìbẹ̀rẹ̀', type: 'intro', color: 'from-pink-500 to-rose-500', description: 'Introduction accrocheuse' },
  { id: 'outro', icon: '🔚', label: 'Outro', label_ba: 'Ìparí', type: 'outro', color: 'from-emerald-500 to-teal-500', description: 'Conclusion + CTA' },
  { id: 'ideas', icon: '💭', label: 'Idées', label_ba: 'Ìmọ̀ràn', type: 'suggestions', color: 'from-indigo-500 to-blue-600', description: 'Suggestions créatives' },
];

interface DynamicAITemplatesProps {
  topic: string;
  templateKey?: string;
  intent?: CreatorIntent;
  segment?: CreatorSegment;
  onSelectContent?: (type: AITemplateType, content: string) => void;
  isSheet?: boolean;
  onClose?: () => void;
}

function safeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', 'true');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const DynamicAITemplates: React.FC<DynamicAITemplatesProps> = ({
  topic,
  templateKey,
  intent,
  segment,
  onSelectContent,
  isSheet = false,
  onClose,
}) => {
  const { currentLang } = useTamTamLanguage();
  const { toast } = useToast();

  const templates = useMemo(() => AI_TEMPLATES, []);
  const containerClass = isSheet ? 'p-4 space-y-4' : 'tiktok-ai-templates';

  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedContents, setGeneratedContents] = useState<Record<string, string>>({});
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setGeneratedContents({});
    setStreamingContent('');
    setActiveTemplate(null);
    setIsStreaming(false);
    setIsGenerating(false);
    abortRef.current?.abort();
    abortRef.current = null;
  }, [topic, templateKey, currentLang, intent, segment]);

  const parseStreamingSSE = async (response: Response, onDelta: (full: string) => void): Promise<string> => {
    if (!response.body) throw new Error('Streaming indisponible (no body)');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let full = '';
    let buffer = '';
    let lastDeltaAt = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.replace(/^data:\s*/, '');
        if (!payload || payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);
          const delta =
            parsed?.choices?.[0]?.delta?.content ??
            parsed?.delta?.content ??
            parsed?.content ??
            parsed?.text ??
            '';

          if (typeof delta === 'string' && delta.length > 0) {
            lastDeltaAt = Date.now();
            full += delta;
            onDelta(full);
          }
        } catch {
          // ignore
        }
      }

      if (Date.now() - lastDeltaAt > 12000) {
        throw new Error('Streaming trop lent (timeout)');
      }
    }

    return full.trim();
  };

  const generateContent = useCallback(
    async (template: AITemplate) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsGenerating(true);
      setActiveTemplate(template.id);
      setIsStreaming(true);
      setStreamingContent('');
      triggerFeedback('notification');

      const backendType = template.type === 'intro' || template.type === 'outro' ? 'script' : template.type;
      const effectiveSegment: CreatorSegment | undefined =
        segment ?? (template.type === 'intro' ? 'intro' : template.type === 'outro' ? 'outro' : undefined);

      const payload = {
        type: backendType,
        topic,
        templateKey,
        templateId: template.id,
        language: currentLang,
        intent,
        segment: effectiveSegment,
      };

      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(payload),
          signal: abortRef.current.signal,
        });

        let content = '';
        if (res.ok) {
          content = await parseStreamingSSE(res, (full) => setStreamingContent(full));
        } else {
          const { data, error } = await supabase.functions.invoke('generate-content', { body: payload });
          if (error) throw error;
          content = safeTrim(data?.content) || safeTrim(data?.parsed?.raw) || safeTrim(data?.text) || '';
        }

        setGeneratedContents((prev) => ({ ...prev, [template.id]: content }));
        setIsStreaming(false);
        setIsGenerating(false);

        onSelectContent?.(template.type, content);
        triggerFeedback('success');
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setIsStreaming(false);
          setIsGenerating(false);
          triggerFeedback('notification');
          return;
        }
        console.error('[DynamicAITemplates] Error:', err);
        toast({
          title: 'Erreur',
          description: err?.message || 'Impossible de générer le contenu',
          variant: 'destructive',
        });
        triggerFeedback('error');
        setIsStreaming(false);
        setIsGenerating(false);
      }
    },
    [currentLang, intent, onSelectContent, segment, templateKey, toast, topic]
  );

  const copyContent = useCallback(
    async (id: string) => {
      const content = generatedContents[id] || (activeTemplate === id ? streamingContent : '');
      if (!content) return;

      const ok = await copyToClipboard(content);
      if (!ok) {
        toast({
          title: 'Copie impossible',
          description: 'Ton navigateur a bloqué la copie automatique.',
          variant: 'destructive',
        });
        triggerFeedback('error');
        return;
      }
      setCopiedId(id);
      triggerFeedback('success');
      setTimeout(() => setCopiedId(null), 900);
    },
    [activeTemplate, generatedContents, streamingContent, toast]
  );

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg">IA — Templates</h3>
          <p className="text-white/60 text-xs">Topic: {topic || '—'}</p>
        </div>

        {onClose && (
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((tpl) => {
          const isActive = activeTemplate === tpl.id;
          const isThisGenerating = isGenerating && isActive;
          const content = generatedContents[tpl.id];

          return (
            <motion.button
              key={tpl.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => generateContent(tpl)}
              className={`rounded-2xl p-4 text-left bg-gradient-to-br ${tpl.color} shadow-lg relative overflow-hidden`}
            >
              <div className="text-2xl">{tpl.icon}</div>
              <div className="mt-2 text-white font-semibold">
                {currentLang === 'ba' ? tpl.label_ba || tpl.label : tpl.label}
              </div>
              <div className="mt-1 text-white/80 text-xs">{tpl.description}</div>

              {isThisGenerating && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              {content && (
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyContent(tpl.id);
                    }}
                    className="px-2 py-1 rounded-full bg-white/20 text-white text-[10px] flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedId === tpl.id ? 'OK' : 'Copier'}
                  </button>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {(isStreaming || streamingContent) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="rounded-2xl bg-white/10 border border-white/10 p-4"
          >
            <div className="text-white text-sm whitespace-pre-wrap leading-relaxed">
              {streamingContent || '…'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
