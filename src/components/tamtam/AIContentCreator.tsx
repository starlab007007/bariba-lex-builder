import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Hash, FileText, Lightbulb, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useToast } from '@/hooks/use-toast';

type ContentType = 'script' | 'hashtags' | 'hook' | 'suggestions';

interface AIContentCreatorProps {
  topic?: string;
  templateKey?: string;
  transcript?: string;
  onContentGenerated?: (type: ContentType, content: string) => void;
  compact?: boolean;
}

const CONTENT_TYPES: { id: ContentType; icon: typeof Sparkles; label: string; label_ba: string }[] = [
  { id: 'script', icon: FileText, label: 'Script', label_ba: 'Kɔ̃siru' },
  { id: 'hashtags', icon: Hash, label: 'Hashtags', label_ba: 'Àmì' },
  { id: 'hook', icon: Lightbulb, label: 'Accroche', label_ba: 'Mú dání' },
  { id: 'suggestions', icon: Sparkles, label: 'Idées', label_ba: 'Yirɑnu' }
];

export const AIContentCreator: React.FC<AIContentCreatorProps> = ({
  topic,
  templateKey,
  transcript,
  onContentGenerated,
  compact = false
}) => {
  const { currentLang } = useTamTamLanguage();
  const { toast } = useToast();
  
  const [activeType, setActiveType] = useState<ContentType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Record<ContentType, string>>({
    script: '',
    hashtags: '',
    hook: '',
    suggestions: ''
  });
  const [copied, setCopied] = useState<ContentType | null>(null);

  const generateContent = async (type: ContentType) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setActiveType(type);
    triggerFeedback('notification');

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          type,
          topic,
          templateKey,
          audioTranscript: transcript,
          language: currentLang
        }
      });

      if (error) throw error;

      const content = data?.content || data?.parsed?.raw || '';
      
      setGeneratedContent(prev => ({ ...prev, [type]: content }));
      onContentGenerated?.(type, content);
      triggerFeedback('success');
      
    } catch (err: any) {
      console.error('[AIContentCreator] Error:', err);
      toast({ 
        title: "Erreur", 
        description: "Impossible de générer le contenu", 
        variant: "destructive" 
      });
      triggerFeedback('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyContent = async (type: ContentType) => {
    const content = generatedContent[type];
    if (!content) return;
    
    await navigator.clipboard.writeText(content);
    setCopied(type);
    triggerFeedback('success');
    setTimeout(() => setCopied(null), 2000);
  };

  const regenerate = (type: ContentType) => {
    generateContent(type);
  };

  if (compact) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CONTENT_TYPES.map(({ id, icon: Icon, label, label_ba }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.95 }}
            onClick={() => generateContent(id)}
            disabled={isGenerating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              generatedContent[id]
                ? 'bg-green-100 text-green-700'
                : 'bg-purple-100 text-purple-700'
            } disabled:opacity-50`}
          >
            {isGenerating && activeType === id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Icon className="w-4 h-4" />
            )}
            <span>{currentLang === 'ba' ? label_ba : label}</span>
            {generatedContent[id] && <Check className="w-3 h-3" />}
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">
            {currentLang === 'ba' ? 'Ìràn IA' : 'Assistant IA'}
          </h3>
          <p className="text-xs text-gray-500">
            {currentLang === 'ba' ? 'Gɑ̃ɑ ko' : 'Générer du contenu'}
          </p>
        </div>
      </div>

      {/* Content Type Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {CONTENT_TYPES.map(({ id, icon: Icon, label, label_ba }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.95 }}
            onClick={() => generateContent(id)}
            disabled={isGenerating}
            className={`p-3 rounded-xl border-2 transition-all ${
              generatedContent[id]
                ? 'border-green-500 bg-green-50'
                : activeType === id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-purple-300'
            } disabled:opacity-50`}
          >
            <div className="flex items-center gap-2">
              {isGenerating && activeType === id ? (
                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
              ) : (
                <Icon className={`w-5 h-5 ${generatedContent[id] ? 'text-green-500' : 'text-purple-500'}`} />
              )}
              <span className="font-medium text-gray-700">
                {currentLang === 'ba' ? label_ba : label}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Generated Content Display */}
      <AnimatePresence mode="wait">
        {Object.entries(generatedContent).map(([type, content]) => {
          if (!content) return null;
          
          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 capitalize">{type}</span>
                <div className="flex gap-1">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => regenerate(type as ContentType)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyContent(type as ContentType)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100"
                  >
                    {copied === type ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </motion.button>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AIContentCreator;
