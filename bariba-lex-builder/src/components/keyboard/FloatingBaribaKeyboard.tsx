import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Trash2, Globe, ChevronDown, ChevronUp, Clock, Star, Search, Zap } from 'lucide-react';
import { useFloatingKeyboard } from '@/hooks/useFloatingKeyboard';

const BARIBA_CHARS_ROW1 = ['ɔ', 'ɛ', 'ŋ', 'ã', 'ĩ', 'ũ'];
const BARIBA_CHARS_ROW2 = ['ɔ̀', 'ɔ́', 'ɔ̃', 'ɛ̀', 'ɛ́', 'ɛ̃'];
const BARIBA_CHARS_ROW3 = ['à', 'á', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú', 'ǹ'];

type PanelTab = 'none' | 'history' | 'favorites' | 'words';

export default function FloatingBaribaKeyboard() {
  const {
    text, setText, suggestions, history, favorites, recentWords, settings,
    textareaRef, insertChar, insertSuggestion,
    copyToClipboard, clearText, clearHistory,
    toggleFavorite, isFavorite, historySearch, setHistorySearch,
  } = useFloatingKeyboard();
  const [showExtended, setShowExtended] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelTab>('none');
  const [lang, setLang] = useState<'bariba' | 'francais'>('bariba');

  const togglePanel = (tab: PanelTab) => setActivePanel(prev => prev === tab ? 'none' : tab);

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
          {settings.phoneticMode && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
              <Zap className="w-2.5 h-2.5" /> Phonétique
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => togglePanel('favorites')} className={`p-1.5 rounded-lg ${activePanel === 'favorites' ? 'bg-amber-500/20' : 'hover:bg-muted'}`} title="Favoris">
            <Star className={`w-4 h-4 ${activePanel === 'favorites' ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={() => togglePanel('history')} className={`p-1.5 rounded-lg ${activePanel === 'history' ? 'bg-blue-500/20' : 'hover:bg-muted'}`} title="Historique">
            <Clock className={`w-4 h-4 ${activePanel === 'history' ? 'text-blue-500' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={() => togglePanel('words')} className={`p-1.5 rounded-lg ${activePanel === 'words' ? 'bg-purple-500/20' : 'hover:bg-muted'}`} title="Mots récents">
            <Search className={`w-4 h-4 ${activePanel === 'words' ? 'text-purple-500' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={clearText} className="p-1.5 rounded-lg hover:bg-muted" title="Effacer">
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
          placeholder={lang === 'bariba' ? 'Sɛmɛ wãa nɔ̃ɔ... (oo→ɔ, ee→ɛ, ng→ŋ)' : 'Écrivez votre texte ici...'}
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

      {/* Panels (History / Favorites / Recent Words) */}
      <AnimatePresence>
        {activePanel !== 'none' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 overflow-hidden"
          >
            <div className="p-3 max-h-40 overflow-y-auto">
              {/* ── History Panel ── */}
              {activePanel === 'history' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <input
                        type="text"
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full pl-6 pr-2 py-1 text-xs rounded-lg bg-muted/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                      />
                    </div>
                    {history.length > 0 && (
                      <button onClick={clearHistory} className="text-[10px] text-destructive shrink-0">Effacer</button>
                    )}
                  </div>
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 text-center py-2">Aucun texte copié</p>
                  ) : (
                    <div className="space-y-1">
                      {history.map((h, i) => (
                        <div key={i} className="flex items-center gap-1 group">
                          <button
                            onClick={() => setText(h)}
                            className="flex-1 text-left px-2 py-1.5 text-xs rounded-lg hover:bg-muted truncate"
                          >
                            {h}
                          </button>
                          <button
                            onClick={() => toggleFavorite(h)}
                            className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Star className={`w-3 h-3 ${isFavorite(h) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Favorites Panel ── */}
              {activePanel === 'favorites' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500" /> Favoris ({favorites.length})
                    </span>
                  </div>
                  {favorites.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 text-center py-2">
                      Ajoutez des phrases depuis l'historique ⭐
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {favorites.map((f, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <button
                            onClick={() => setText(f)}
                            className="flex-1 text-left px-2 py-1.5 text-xs rounded-lg hover:bg-amber-500/10 truncate"
                          >
                            ⭐ {f}
                          </button>
                          <button
                            onClick={() => toggleFavorite(f)}
                            className="shrink-0 p-1 rounded hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3 text-destructive/60" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── Recent Words Panel ── */}
              {activePanel === 'words' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Mots récents</span>
                  </div>
                  {recentWords.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 text-center py-2">Les mots sélectionnés apparaîtront ici</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {recentWords.slice(0, 20).map((w, i) => (
                        <button
                          key={i}
                          onClick={() => insertChar(w + ' ')}
                          className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-medium hover:bg-purple-500/20 transition-colors"
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  )}
                </>
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

      {/* Copy button + auto-copy indicator */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={copyToClipboard}
          disabled={!text.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25"
        >
          <Copy className="w-5 h-5" />
          {settings.autoCopy ? 'Copier (auto-copie activée)' : 'Copier dans le presse-papier'}
        </button>
        {text.trim() && (
          <button
            onClick={() => toggleFavorite(text.trim())}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/10 transition-colors"
          >
            <Star className={`w-4 h-4 ${isFavorite(text.trim()) ? 'fill-amber-500' : ''}`} />
            {isFavorite(text.trim()) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          </button>
        )}
      </div>
    </div>
  );
}