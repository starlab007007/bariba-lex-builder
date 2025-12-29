import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  X,
  Zap,
  TrendingUp,
  Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

type CreatorIntent = 'informer' | 'expliquer' | 'vendre' | 'sensibiliser' | 'raconter' | string;
type CreatorSegment = 'intro' | 'message' | 'outro' | string;

interface DynamicAITemplatesProps {
  topic?: string;
  templateKey?: string;

  /**
   * Nouveau modèle (édition par intention + segments, audio-first).
   * Ces props sont optionnelles pour ne pas casser l'existant.
   */
  intent?: CreatorIntent;
  segment?: CreatorSegment;

  onSelectContent?: (type: string, content: string) => void;

  isSheet?: boolean;
  onClose?: () => void;
}

interface AITemplate {
  id: string;
  icon: string;
  label: string;
  label_ba: string;
  /**
   * type logique UI (pour le consumer / onSelectContent)
   * backendType = transformé plus bas pour compatibilité edge functions existantes
   */
  type: 'script' | 'hashtags' | 'hook' | 'suggestions' | 'intro' | 'outro';
  color: string;
  description: string;
}

const AI_TEMPLATES: AITemplate[] = [
  {
    id: 'script',
    icon: '✨',
    label: 'Script IA',
    label_ba: 'Àkọsílẹ̀ IA',
    type: 'script',
    color: 'from-violet-500 to-purple-600',
    description: 'Génère un script complet pour ta vidéo',
  },
  {
    id: 'hashtags',
    icon: '#️⃣',
    label: 'Hashtags',
    label_ba: 'Àmì',
    type: 'hashtags',
    color: 'from-blue-500 to-cyan-500',
    description: 'Hashtags tendance pour plus de visibilité',
  },
  {
    id: 'hook',
    icon: '💡',
    label: 'Hook viral',
    label_ba: 'Ìmúdání',
    type: 'hook',
    color: 'from-amber-500 to-orange-500',
    description: 'Accroches percutantes pour captiver',
  },
  {
    id: 'intro',
    icon: '🎬',
    label: 'Intro',
    label_ba: 'Ìbẹ̀rẹ̀',
    type: 'intro',
    color: 'from-pink-500 to-rose-500',
    description: 'Introduction accrocheuse',
  },
  {
    id: 'outro',
    icon: '🔚',
    label: 'Outro',
    label_ba: 'Ìparí',
    type: 'outro',
    color: 'from-emerald-500 to-teal-500',
    description: 'Conclusion avec call-to-action',
  },
  {
    id: 'ideas',
    icon: '💭',
    label: 'Idées',
    label_ba: 'Ìmọ̀ràn',
    type: 'suggestions',
    color: 'from-indigo-500 to-blue-600',
    description: 'Suggestions de contenu créatif',
  },
];

function safeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Clipboard API
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore and fallback
  }

  // Fallback textarea
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

  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedContents, setGeneratedContents] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const containerClass = isSheet ? 'p-4 space-y-4' : 'tiktok-ai-templates';

  const templates = useMemo(() => AI_TEMPLATES, []);

  // Reset intelligent quand contexte change (évite "vieux contenu")
  useEffect(() => {
    setGeneratedContents({});
    setStreamingContent('');
    setActiveTemplate(null);
    setIsStreaming(false);
    setIsGenerating(false);

    // Annule une génération en cours si contexte change
    abortRef.current?.abort();
    abortRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, templateKey, currentLang, intent, segment]);

  const cancelGeneration = useCallback(() => {
    if (!isGenerating) return;
    setIsCancelling(true);
    try {
      abortRef.current?.abort();
    } finally {
      setTimeout(() => setIsCancelling(false), 350);
    }
  }, [isGenerating]);

  const parseStreamingSSE = async (response: Response, onDelta: (delta: string) => void): Promise<string> => {
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

      // SSE: parse line by line
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;

        const payload = trimmed.replace(/^data:\s*/, '');
        if (!payload || payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);

          // Most common: OpenAI-like delta format
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
          // ignore bad json line
        }
      }

      // watchdog: si aucun delta depuis 12s => fallback
      if (Date.now() - lastDeltaAt > 12000) {
        throw new Error('Streaming trop lent (timeout)');
      }
    }

    return full.trim();
  };

  const generateContent = useCallback(
    async (template: AITemplate) => {
      // Permet de cliquer un autre template pendant génération:
      // => annule la génération courante et redémarre
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsGenerating(true);
      setActiveTemplate(template.id);
      setIsStreaming(true);
      setStreamingContent('');
      triggerFeedback('notification');

      // Compatibilité backend:
      // - intro/outro restent souvent traités comme "script" côté edge function
      // - mais on envoie aussi segment/templateId/intent pour le nouveau modèle
      const backendType =
        template.type === 'intro' || template.type === 'outro' ? 'script' : template.type;

      const effectiveSegment: CreatorSegment | undefined =
        segment ??
        (template.type === 'intro' ? 'intro' : template.type === 'outro' ? 'outro' : undefined);

      const payload = {
        type: backendType,
        topic,
        templateKey,
        templateId: template.id,
        language: currentLang,
        intent, // nouveau (édition par intention)
        segment: effectiveSegment, // nouveau (intro/message/outro)
      };

      try {
        // 1) Streaming (fetch)
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
          // Streaming SSE
          content = await parseStreamingSSE(res, (full) => setStreamingContent(full));
        } else {
          // 2) Fallback non-streaming via supabase.functions.invoke
          const { data, error } = await supabase.functions.invoke('generate-content', {
            body: payload,
          });

          if (error) throw error;

          content =
            safeTrim(data?.content) ||
            safeTrim(data?.parsed?.raw) ||
            safeTrim(data?.text) ||
            '';
        }

        setGeneratedContents((prev) => ({ ...prev, [template.id]: content }));
        setIsStreaming(false);
        setIsGenerating(false);

        // onSelectContent: type logique UI (intro/outro distincts)
        onSelectContent?.(template.type, content);

        triggerFeedback('success');
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // Annulation : ne pas afficher erreur
          setIsStreaming(false);
          setIsGenerating(false);
          triggerFeedback('notification');
        } else {
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
      }
    },
    [currentLang, intent, onSelectContent, segment, templateKey, toast, topic]
  );

  const copyContent = useCallback(
    async (id: string) => {
      const content = generatedContents[id] || streamingContent;
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
      setTimeout(() => setCopiedId(null), 2000);
    },
    [generatedContents, streamingContent, toast]
  );

  const activeLabel = useMemo(() => {
    const t = templates.find((x) => x.id === activeTemplate);
    if (!t) return '';
    return currentLang === 'ba' ? t.label_ba : t.label;
  }, [activeTemplate, currentLang, templates]);

  const activeIcon = useMemo(() => {
    return templates.find((x) => x.id === activeTemplate)?.icon ?? '✨';
  }, [activeTemplate, templates]);

  return (
    <div className={containerClass}>
      {/* Header for sheet mode */}
      {isSheet && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Templates IA Lovable</h3>
              <p className="text-xs text-gray-500">Génération en temps réel</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      )}

      {/* Templates Grid */}
      <div className={isSheet ? 'grid grid-cols-3 gap-3' : 'tiktok-ai-templates-grid'}>
        {templates.map((template, index) => {
          const hasContent = !!generatedContents[template.id];
          const isActive = activeTemplate === template.id;

          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => generateContent(template)}
              disabled={isGenerating && isActive}
              className={`${isSheet ? 'p-3 rounded-xl flex flex-col items-center gap-2' : 'tiktok-ai-template-card'} ${
                hasContent ? 'ring-2 ring-green-400' : ''
              } ${isActive && isGenerating ? 'animate-pulse' : ''}`}
            >
              <span className="text-2xl">
                {isActive && isGenerating ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  template.icon
                )}
              </span>
              <span className={isSheet ? 'text-xs font-medium text-gray-700' : 'tiktok-ai-template-label'}>
                {currentLang === 'ba' ? template.label_ba : template.label}
              </span>
              {hasContent && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full">
                  <Check className="w-2 h-2 text-white" />
                </span>
              )}
            </motion.button>
          );
        })}

        {/* Lovable AI Badge */}
        {!isSheet && (
          <div className="tiktok-ai-badge flex items-center gap-1.5 text-xs text-white/80">
            <Zap className="w-3 h-3" />
            Lovable IA
          </div>
        )}
      </div>

      {/* Streaming / Content Display */}
      <AnimatePresence>
        {(isStreaming || (activeTemplate && generatedContents[activeTemplate])) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={isSheet ? 'mt-4 p-4 bg-gray-50 rounded-xl' : 'tiktok-ai-content-display'}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeIcon}</span>
                <span className="font-medium text-gray-900">{activeLabel}</span>

                {isStreaming && (
                  <span className="flex items-center gap-1 text-xs text-violet-600">
                    <TrendingUp className="w-3 h-3 animate-pulse" />
                    {currentLang === 'ba' ? 'Ń dá...' : 'Génération...'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Cancel */}
                {isGenerating && (
                  <button onClick={cancelGeneration} className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200">
                    <Ban className="w-4 h-4 text-red-600" />
                  </button>
                )}

                {/* Regenerate */}
                <button
                  onClick={() => {
                    const template = templates.find((t) => t.id === activeTemplate);
                    if (template) generateContent(template);
                  }}
                  disabled={isGenerating}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                  title={currentLang === 'ba' ? 'Tun ṣe' : 'Régénérer'}
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>

                {/* Copy */}
                <button
                  onClick={() => activeTemplate && copyContent(activeTemplate)}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                  title={currentLang === 'ba' ? 'Daakọ' : 'Copier'}
                >
                  {copiedId === activeTemplate ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {isStreaming ? streamingContent : generatedContents[activeTemplate || '']}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-0.5 rounded-sm" />
              )}
            </div>

            {/* Use Button */}
            {!isStreaming && generatedContents[activeTemplate || ''] && (
              <button
                onClick={() => {
                  const t = templates.find((x) => x.id === activeTemplate);
                  onSelectContent?.(t?.type || 'script', generatedContents[activeTemplate || '']);
                  toast({ title: '✅ Contenu appliqué' });
                  triggerFeedback('success');
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {currentLang === 'ba' ? 'Lò ó' : 'Utiliser ce contenu'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicAITemplates;
