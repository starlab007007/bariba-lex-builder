import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Pre-warm HuggingFace Spaces au mount de l'app.
 * Appel silencieux et non-bloquant.
 */
export function useHFPreWarm() {
  useEffect(() => {
    const warm = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('hf-keep-alive', {
          body: {},
        });
        if (error) {
          console.warn('[HF PreWarm] Error:', error.message);
        } else {
          console.log('[HF PreWarm] Spaces status:', data);
        }
      } catch (e) {
        // Silencieux - le pre-warm n'est pas critique
        console.warn('[HF PreWarm] Failed silently');
      }
    };

    // Déclencher après un court délai pour ne pas bloquer le rendu initial
    const timer = setTimeout(warm, 2000);
    return () => clearTimeout(timer);
  }, []);
}
