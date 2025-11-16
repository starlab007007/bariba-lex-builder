import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAITranslation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const translateWithAI = async (
    text: string,
    sourceLang: 'french' | 'bariba',
    targetLang: 'french' | 'bariba'
  ): Promise<{ translation: string; confidence: number } | null> => {
    if (!text.trim()) {
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate', {
        body: {
          text: text.trim(),
          sourceLang,
          targetLang,
        },
      });

      if (error) {
        console.error('AI translation error:', error);
        throw error;
      }

      if (!data || !data.translation) {
        throw new Error('Invalid response from AI translation service');
      }

      return {
        translation: data.translation,
        confidence: data.confidence || 75,
      };
    } catch (error: any) {
      console.error('Translation error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Rate limit')) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Too many requests. Please wait a moment and try again.',
          variant: 'destructive',
        });
      } else if (error.message?.includes('credits')) {
        toast({
          title: 'AI Credits Exhausted',
          description: 'Please add credits to continue using AI translations.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Translation Error',
          description: 'Failed to translate. Please try again.',
          variant: 'destructive',
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    translateWithAI,
    isLoading,
  };
};
