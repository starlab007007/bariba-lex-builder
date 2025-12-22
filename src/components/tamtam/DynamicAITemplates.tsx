import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Hash, FileText, Lightbulb, Loader2, 
  Copy, Check, RefreshCw, X, Zap, TrendingUp 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

interface DynamicAITemplatesProps {
  topic?: string;
  templateKey?: string;
  onSelectContent?: (type: string, content: string) => void;
  isSheet?: boolean;
  onClose?: () => void;
}

interface AITemplate {
  id: string;
  icon: string;
  label: string;
  label_ba: string;
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
    description: 'Génère un script complet pour ta vidéo'
  },
  { 
    id: 'hashtags', 
    icon: '#️⃣', 
    label: 'Hashtags', 
    label_ba: 'Àmì',
    type: 'hashtags', 
    color: 'from-blue-500 to-cyan-500',
    description: 'Hashtags tendance pour plus de visibilité'
  },
  { 
    id: 'hook', 
    icon: '💡', 
    label: 'Hook viral', 
    label_ba: 'Ìmúdání',
    type: 'hook', 
    color: 'from-amber-500 to-orange-500',
    description: 'Accroches percutantes pour captiver'
  },
  { 
    id: 'intro', 
    icon: '🎬', 
    label: 'Intro', 
    label_ba: 'Ìbẹ̀rẹ̀',
    type: 'script', 
    color: 'from-pink-500 to-rose-500',
    description: 'Introduction accrocheuse'
  },
  { 
    id: 'outro', 
    icon: '🔚', 
    label: 'Outro', 
    label_ba: 'Ìparí',
    type: 'script', 
    color: 'from-emerald-500 to-teal-500',
    description: 'Conclusion avec call-to-action'
  },
  { 
    id: 'ideas', 
    icon: '💭', 
    label: 'Idées', 
    label_ba: 'Ìmọ̀ràn',
    type: 'suggestions', 
    color: 'from-indigo-500 to-blue-600',
    description: 'Suggestions de contenu créatif'
  },
];

export const DynamicAITemplates: React.FC<DynamicAITemplatesProps> = ({
  topic,
  templateKey,
  onSelectContent,
  isSheet = false,
  onClose
}) => {
  const { currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContents, setGeneratedContents] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const generateContent = useCallback(async (template: AITemplate) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setActiveTemplate(template.id);
    setIsStreaming(true);
    setStreamingContent('');
    triggerFeedback('notification');

    try {
      // Use streaming for real-time generation
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: template.type,
            topic,
            templateKey,
            templateId: template.id,
            language: currentLang
          }),
        }
      );

      if (!response.ok) {
        // Fallback to non-streaming
        const { data, error } = await supabase.functions.invoke('generate-content', {
          body: {
            type: template.type,
            topic,
            templateKey,
            language: currentLang
          }
        });

        if (error) throw error;
        
        const content = data?.content || data?.parsed?.raw || '';
        setGeneratedContents(prev => ({ ...prev, [template.id]: content }));
        onSelectContent?.(template.type, content);
        setIsStreaming(false);
        triggerFeedback('success');
        return;
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Parse SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  setStreamingContent(fullContent);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      setGeneratedContents(prev => ({ ...prev, [template.id]: fullContent }));
      onSelectContent?.(template.type, fullContent);
      setIsStreaming(false);
      triggerFeedback('success');

    } catch (err: any) {
      console.error('[DynamicAITemplates] Error:', err);
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de générer le contenu',
        variant: 'destructive'
      });
      triggerFeedback('error');
      setIsStreaming(false);
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, topic, templateKey, currentLang, onSelectContent, toast]);

  const copyContent = async (id: string) => {
    const content = generatedContents[id] || streamingContent;
    if (!content) return;
    
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    triggerFeedback('success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const containerClass = isSheet 
    ? "p-4 space-y-4" 
    : "tiktok-ai-templates";

  return (
    <div className={containerClass}>
      {/* Header for sheet mode */}
      {isSheet && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Templates IA Lovable</h3>
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
      <div className={isSheet ? "grid grid-cols-3 gap-2" : "flex gap-2.5 overflow-x-auto pb-2"}>
        {AI_TEMPLATES.map((template, index) => {
          const hasContent = !!generatedContents[template.id];
          const isActive = activeTemplate === template.id;
          
          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => generateContent(template)}
              disabled={isGenerating && isActive}
              className={`${isSheet 
                ? 'p-3 rounded-xl flex flex-col items-center gap-2' 
                : 'tiktok-ai-template-card'
              } ${hasContent ? 'ring-2 ring-green-400' : ''} ${isActive && isGenerating ? 'animate-pulse' : ''}`}
            >
              <span className={isSheet ? 'text-2xl' : 'icon'}>
                {isActive && isGenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                ) : (
                  template.icon
                )}
              </span>
              <span className={isSheet ? 'text-xs text-gray-700 font-medium text-center' : 'label'}>
                {currentLang === 'ba' ? template.label_ba : template.label}
              </span>
              {hasContent && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <Check className="w-2.5 h-2.5 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
        
        {/* Lovable AI Badge */}
        {!isSheet && (
          <div className="tiktok-ai-badge ml-1 self-center">
            <Sparkles className="w-3 h-3" />
            <span>Lovable IA</span>
          </div>
        )}
      </div>

      {/* Streaming Content Display */}
      <AnimatePresence mode="wait">
        {(isStreaming || (activeTemplate && generatedContents[activeTemplate])) && (
          <motion.div
            key={activeTemplate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 bg-gray-50 rounded-2xl p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {AI_TEMPLATES.find(t => t.id === activeTemplate)?.icon}
                </span>
                <span className="font-medium text-gray-700">
                  {AI_TEMPLATES.find(t => t.id === activeTemplate)?.label}
                </span>
                {isStreaming && (
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="flex items-center gap-1 text-violet-500 text-xs"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Génération...</span>
                  </motion.div>
                )}
              </div>
              
              <div className="flex gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    const template = AI_TEMPLATES.find(t => t.id === activeTemplate);
                    if (template) generateContent(template);
                  }}
                  disabled={isGenerating}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-500 ${isGenerating ? 'animate-spin' : ''}`} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => activeTemplate && copyContent(activeTemplate)}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                >
                  {copiedId === activeTemplate ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-500" />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {isStreaming ? streamingContent : generatedContents[activeTemplate || '']}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-2 h-4 bg-violet-500 ml-0.5"
                />
              )}
            </div>

            {/* Use Button */}
            {!isStreaming && generatedContents[activeTemplate || ''] && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onSelectContent?.(
                    AI_TEMPLATES.find(t => t.id === activeTemplate)?.type || 'script',
                    generatedContents[activeTemplate || '']
                  );
                  toast({ title: '✅ Contenu appliqué' });
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Utiliser ce contenu</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicAITemplates;
