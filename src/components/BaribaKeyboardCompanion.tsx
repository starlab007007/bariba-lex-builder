import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { useBaribaKeyboard } from '@/hooks/useBaribaKeyboard';
import { useAdvancedPhonetics } from '@/hooks/useAdvancedPhonetics';
import { useToast } from '@/hooks/use-toast';

export default function BaribaKeyboardCompanion() {
  const { getHistory, getSuggestions, clearHistory, saveWord } = useBaribaKeyboard();
  const { toast } = useToast();
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastWord, setLastWord] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const enhancedSuggestions = useAdvancedPhonetics(lastWord, history);

  const sync = useCallback(async () => {
    const [h, s] = await Promise.all([getHistory(), getSuggestions()]);
    setHistory(h);
    setSuggestions(s.suggestions);
    setLastWord(s.lastWord);
  }, [getHistory, getSuggestions]);

  useEffect(() => {
    sync();
    const interval = setInterval(sync, 500);
    return () => clearInterval(interval);
  }, [sync]);

  const handleCopyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word);
      await saveWord(word);
      toast({ title: 'Copié !', description: word });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier', variant: 'destructive' });
    }
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
    setSuggestions([]);
    toast({ title: 'Historique effacé' });
  };

  const displaySuggestions = enhancedSuggestions.length > 0 ? enhancedSuggestions : suggestions;

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold">Clavier Bariba Natif</span>
          {history.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
              {history.length}
            </span>
          )}
        </div>
        {isVisible ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Suggestions */}
            {displaySuggestions.length > 0 && (
              <div className="px-4 py-2 border-t border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Suggestions
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {displaySuggestions.map((word, i) => (
                    <button
                      key={i}
                      onClick={() => handleCopyWord(word)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            <div className="px-4 py-2 border-t border-border/30">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Historique Bariba
                </p>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-[10px] text-destructive hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    Effacer
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 text-center py-3">
                  Les mots tapés avec le clavier natif apparaîtront ici
                </p>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {history.slice(0, 30).map((word, i) => (
                    <button
                      key={i}
                      onClick={() => handleCopyWord(word)}
                      className="px-2 py-1 rounded-lg bg-muted/50 text-xs hover:bg-muted transition-colors"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}