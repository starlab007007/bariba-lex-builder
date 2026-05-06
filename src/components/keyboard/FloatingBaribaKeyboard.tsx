import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Globe, ChevronDown, ChevronUp, Clock, X } from 'lucide-react';
import { useFloatingKeyboard } from '@/hooks/useFloatingKeyboard';

const BARIBA_CHARS_ROW1 = ['ɔ', 'ɛ', 'ŋ', 'ã', 'ĩ', 'ũ'];
const BARIBA_CHARS_ROW2 = ['ɔ̀', 'ɔ́', 'ɔ̃', 'ɛ̀', 'ɛ́', 'ɛ̃'];
const BARIBA_CHARS_ROW3 = ['à', 'á', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú', 'ǹ'];

export default function FloatingBaribaKeyboard() {
  const {
    text, setText, suggestions, history,
    textareaRef, insertChar, insertSuggestion,
    copyToClipboard, clearText, clearHistory,
  } = useFloatingKeyboard();
  const [showExtended, setShowExtended] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lang, setLang] = useState<'bariba' | 'francais'>('bariba');

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            ⌨️ Fitila
          </span>
          <button
            onClick={() => setLang(l => l === 'bariba' ? 'francais' : 'bariba')}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium"
          >
            <Globe className="w-3 h-3" />
            {lang === 'bariba' ? 'Bariba' : 'Français'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 rounded-lg hover:bg-muted"
            title="Historique"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={clearText}
            className="p-1.5 rounded-lg hover:bg-muted"
            title="Effacer"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Text area */}
      <div className="flex-1 p-3 min-h-0">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={lang === 'bariba' ? 'Sɛmɛ wãa nɔ̃ɔ...' : 'Écrivez votre texte ici...'}
          className="w-full h-full resize-none bg-muted/30 rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-muted-foreground/50"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-1 overflow-hidden"
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => insertSuggestion(s.word)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-500/25 transition-colors"
                >
                  {s.word}
                  <span className="ml-1 text-[10px] opacity-60">{s.definition?.slice(0, 15)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 overflow-hidden"
          >
            <div className="p-3 max-h-32 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Historique</span>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-[10px] text-destructive">
                    Tout effacer
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">Aucun texte copié</p>
              ) : (
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setText(h)}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-muted truncate"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bariba special characters */}
      {lang === 'bariba' && (
        <div className="border-t border-border/50 px-2 py-1.5 space-y-1">
          <div className="flex gap-1 justify-center flex-wrap">
            {BARIBA_CHARS_ROW1.map(c => (
              <button
                key={c}
                onClick={() => insertChar(c)}
                className="w-10 h-9 rounded-lg bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 text-amber-900 dark:text-amber-100 font-semibold text-base hover:scale-105 active:scale-95 transition-transform shadow-sm"
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-1 justify-center flex-wrap">
            {BARIBA_CHARS_ROW2.map(c => (
              <button
                key={c}
                onClick={() => insertChar(c)}
                className="w-10 h-9 rounded-lg bg-gradient-to-b from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-900 dark:text-orange-100 font-semibold text-base hover:scale-105 active:scale-95 transition-transform shadow-sm"
              >
                {c}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {showExtended && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-1 justify-center flex-wrap pt-1">
                  {BARIBA_CHARS_ROW3.map(c => (
                    <button
                      key={c}
                      onClick={() => insertChar(c)}
                      className="w-8 h-8 rounded-lg bg-muted text-foreground font-medium text-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowExtended(!showExtended)}
            className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground py-0.5"
          >
            {showExtended ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showExtended ? 'Moins' : 'Plus de caractères'}
          </button>
        </div>
      )}

      {/* Copy button */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={copyToClipboard}
          disabled={!text.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25"
        >
          <Copy className="w-5 h-5" />
          Copier dans le presse-papier
        </button>
      </div>
    </div>
  );
}