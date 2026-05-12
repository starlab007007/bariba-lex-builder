import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Trash2, Globe, ChevronDown, ChevronUp, Clock, Star, Search, Zap,
  Languages, Delete, ArrowBigUp,
} from 'lucide-react';
import { useFloatingKeyboard } from '@/hooks/useFloatingKeyboard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ─── Layouts ───────────────────────────────────────────────────────────
const ROW_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const ROW1 = ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const ROW2 = ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'];
const ROW3 = ['w', 'x', 'c', 'v', 'b', 'n'];

// Bariba specials (lower / upper)
const SPECIALS: Array<{ lo: string; up: string }> = [
  { lo: 'ɔ', up: 'Ɔ' }, { lo: 'ɛ', up: 'Ɛ' }, { lo: 'ŋ', up: 'Ŋ' },
  { lo: 'ã', up: 'Ã' }, { lo: 'ĩ', up: 'Ĩ' }, { lo: 'ũ', up: 'Ũ' },
];

// Long-press popups: vowel base → variants
const VOWEL_VARIANTS: Record<string, string[]> = {
  a: ['à', 'á', 'â', 'ä', 'ã', 'ã̀', 'ã́'],
  e: ['è', 'é', 'ê', 'ë', 'ɛ', 'ɛ̀', 'ɛ́', 'ɛ̃', 'ɛ̃̀'],
  i: ['ì', 'í', 'î', 'ï', 'ĩ', 'ĩ̀', 'ĩ́'],
  o: ['ò', 'ó', 'ô', 'ö', 'ɔ', 'ɔ̀', 'ɔ́', 'ɔ̃', 'ɔ̃̀'],
  u: ['ù', 'ú', 'û', 'ü', 'ũ', 'ũ̀', 'ṹ'],
  n: ['ŋ', 'ǹ', 'ñ'],
};

// Symbols page (?123)
const SYMBOLS_ROW1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SYMBOLS_ROW2 = ['@', '#', '$', '_', '&', '-', '+', '(', ')', '/'];
const SYMBOLS_ROW3 = ['*', '"', "'", ':', ';', '!', '?', '%', '=', '\\'];

const COMBINING_GRAVE = '\u0300';     // ton nasal bas
const COMBINING_ACUTE = '\u0301';
const COMBINING_TILDE = '\u0303';

type PanelTab = 'none' | 'history' | 'favorites' | 'words';
type KeyboardMode = 'letters' | 'symbols';

export default function FloatingBaribaKeyboard() {
  const {
    text, setText, suggestions, history, favorites, recentWords, settings,
    textareaRef, insertChar, insertSuggestion,
    copyToClipboard, clearText, clearHistory,
    toggleFavorite, isFavorite, historySearch, setHistorySearch,
  } = useFloatingKeyboard();
  const { toast } = useToast();

  const [activePanel, setActivePanel] = useState<PanelTab>('none');
  const [lang, setLang] = useState<'bariba' | 'francais'>('bariba');
  const [mode, setMode] = useState<KeyboardMode>('letters');
  const [shift, setShift] = useState(false);
  const [shiftLock, setShiftLock] = useState(false);
  const [showDigits, setShowDigits] = useState(true);
  const [popup, setPopup] = useState<{ key: string; variants: string[]; x: number } | null>(null);
  const [translating, setTranslating] = useState(false);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupTriggerRef = useRef<string | null>(null);

  const togglePanel = (tab: PanelTab) => setActivePanel(p => p === tab ? 'none' : tab);

  // ─── Insertion helpers ────────────────────────────────────────────────
  const type = useCallback((c: string) => {
    insertChar(c);
    if (shift && !shiftLock) setShift(false);
  }, [insertChar, shift, shiftLock]);

  const onAlphaTap = (c: string) => type(shift || shiftLock ? c.toUpperCase() : c);

  // Combining grave (ton nasal bas) — toggles after last char
  const insertToneLow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const prev = text.slice(0, pos);
    const after = text.slice(pos);
    // Toggle: if last code unit is U+0300, remove it
    if (prev.endsWith(COMBINING_GRAVE)) {
      const next = prev.slice(0, -1) + after;
      setText(next);
      requestAnimationFrame(() => {
        if (el) { el.selectionStart = el.selectionEnd = pos - 1; el.focus(); }
      });
    } else {
      insertChar(COMBINING_GRAVE);
    }
  }, [text, insertChar, setText, textareaRef]);

  const backspace = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start !== end) {
      const next = text.slice(0, start) + text.slice(end);
      setText(next);
      requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start; el.focus(); });
      return;
    }
    if (start === 0) return;
    const next = text.slice(0, start - 1) + text.slice(start);
    setText(next);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start - 1; el.focus(); });
  }, [text, setText, textareaRef]);

  // Long-press handlers (vowel popup)
  const startLongPress = (key: string, ev: React.PointerEvent) => {
    popupTriggerRef.current = key;
    const variants = VOWEL_VARIANTS[key.toLowerCase()];
    if (!variants) return;
    const x = ev.clientX;
    longPressRef.current = setTimeout(() => {
      setPopup({ key, variants, x });
    }, 380);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  };
  const onAlphaPointerDown = (c: string, ev: React.PointerEvent) => startLongPress(c, ev);
  const onAlphaPointerUp = (c: string) => {
    cancelLongPress();
    if (popup && popup.key === c) return; // popup open, don't double-insert
    if (popupTriggerRef.current === c) onAlphaTap(c);
    popupTriggerRef.current = null;
  };
  const pickVariant = (v: string) => {
    insertChar(v);
    setPopup(null);
    if (shift && !shiftLock) setShift(false);
  };

  // Shift toggle (single tap = once, double-tap = lock)
  const onShift = () => {
    if (shiftLock) { setShiftLock(false); setShift(false); return; }
    if (shift) { setShiftLock(true); return; }
    setShift(true);
  };

  // ─── Translate current word / sentence ────────────────────────────────
  const translate = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setTranslating(true);
    try {
      const sourceLang = lang === 'bariba' ? 'bariba' : 'french';
      const targetLang = lang === 'bariba' ? 'french' : 'bariba';
      const { data, error } = await supabase.functions.invoke('bariba-translate', {
        body: { text: t, sourceLang, targetLang },
      });
      if (error) throw error;
      const translated: string =
        data?.translation || data?.translated_text || data?.text || '';
      if (!translated) throw new Error('Pas de traduction');
      const normalized = translated.normalize('NFC');
      await navigator.clipboard.writeText(normalized);
      toast({
        title: '🌍 Traduit & copié',
        description: normalized.length > 80 ? normalized.slice(0, 77) + '…' : normalized,
      });
    } catch (e: any) {
      toast({
        title: 'Traduction indisponible',
        description: e?.message?.slice(0, 100) || 'Réessayez plus tard',
        variant: 'destructive',
      });
    } finally {
      setTranslating(false);
    }
  }, [text, lang, toast]);

  // NFC-normalized copy (compatibilité documents universels)
  const copyNormalized = useCallback(async () => {
    if (!text.trim()) return;
    const normalized = text.normalize('NFC');
    if (normalized !== text) setText(normalized);
    await copyToClipboard();
  }, [text, setText, copyToClipboard]);

  // ─── Render helpers ───────────────────────────────────────────────────
  const Key = ({
    label, onTap, flex = 1, variant = 'default', onPointerDown, onPointerUp,
  }: {
    label: React.ReactNode;
    onTap?: () => void;
    flex?: number;
    variant?: 'default' | 'special' | 'action' | 'accent';
    onPointerDown?: (ev: React.PointerEvent) => void;
    onPointerUp?: () => void;
  }) => {
    const base = 'h-11 rounded-lg font-semibold text-base flex items-center justify-center select-none active:scale-95 transition-transform shadow-sm';
    const variants = {
      default: 'bg-muted/70 text-foreground hover:bg-muted',
      special: 'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 text-amber-900 dark:text-amber-100',
      action: 'bg-slate-300/70 dark:bg-slate-700/70 text-foreground text-sm',
      accent: 'bg-gradient-to-b from-orange-200 to-orange-300 dark:from-orange-900/50 dark:to-orange-800/50 text-orange-900 dark:text-orange-100',
    };
    return (
      <button
        onPointerDown={onPointerDown}
        onPointerUp={() => { onPointerUp?.(); }}
        onPointerCancel={() => cancelLongPress()}
        onPointerLeave={() => cancelLongPress()}
        onClick={onPointerDown ? undefined : onTap}
        style={{ flex }}
        className={`${base} ${variants[variant]}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
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
          <button onClick={translate} disabled={translating || !text.trim()} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40" title="Traduire">
            <Languages className={`w-4 h-4 ${translating ? 'animate-pulse text-emerald-500' : 'text-muted-foreground'}`} />
          </button>
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
                  {s.definition && <span className="ml-1 text-[10px] opacity-60">{s.definition.slice(0, 15)}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panels */}
      <AnimatePresence>
        {activePanel !== 'none' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 overflow-hidden"
          >
            <div className="p-3 max-h-40 overflow-y-auto">
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

      {/* ─── KEYBOARD ────────────────────────────────────────────── */}
      <div className="border-t border-border/50 px-1.5 py-1.5 space-y-1.5 bg-muted/20">
        {mode === 'letters' ? (
          <>
            {/* Digits row (toggleable) */}
            {showDigits && (
              <div className="flex gap-1">
                {ROW_DIGITS.map(d => (
                  <Key key={d} label={d} onTap={() => insertChar(d)} />
                ))}
              </div>
            )}

            {/* Row 1 (a-p) */}
            <div className="flex gap-1">
              {ROW1.map(c => (
                <Key
                  key={c}
                  label={shift || shiftLock ? c.toUpperCase() : c}
                  onPointerDown={(ev) => onAlphaPointerDown(c, ev)}
                  onPointerUp={() => onAlphaPointerUp(c)}
                />
              ))}
            </div>

            {/* Row 2 (q-m) */}
            <div className="flex gap-1 px-3">
              {ROW2.map(c => (
                <Key
                  key={c}
                  label={shift || shiftLock ? c.toUpperCase() : c}
                  onPointerDown={(ev) => onAlphaPointerDown(c, ev)}
                  onPointerUp={() => onAlphaPointerUp(c)}
                />
              ))}
            </div>

            {/* Row 3 : Shift + w-n + Backspace */}
            <div className="flex gap-1">
              <Key
                variant="action"
                flex={1.5}
                label={<ArrowBigUp className={`w-5 h-5 ${shiftLock ? 'text-amber-500' : shift ? 'text-blue-500' : ''}`} />}
                onTap={onShift}
              />
              {ROW3.map(c => (
                <Key
                  key={c}
                  label={shift || shiftLock ? c.toUpperCase() : c}
                  onPointerDown={(ev) => onAlphaPointerDown(c, ev)}
                  onPointerUp={() => onAlphaPointerUp(c)}
                />
              ))}
              <Key variant="action" flex={1.5} label={<Delete className="w-5 h-5" />} onTap={backspace} />
            </div>

            {/* Bariba specials row */}
            {lang === 'bariba' && (
              <div className="flex gap-1">
                {SPECIALS.map(({ lo, up }) => {
                  const c = shift || shiftLock ? up : lo;
                  return (
                    <Key
                      key={lo}
                      variant="special"
                      label={c}
                      onPointerDown={(ev) => onAlphaPointerDown(lo, ev)}
                      onPointerUp={() => onAlphaPointerUp(lo)}
                    />
                  );
                })}
                {/* Tone-low combining grave (◌̀) */}
                <Key
                  variant="accent"
                  label={<span className="text-lg">◌̀</span>}
                  onTap={insertToneLow}
                />
              </div>
            )}

            {/* Bottom row : ?123 + , + space + . + Enter */}
            <div className="flex gap-1">
              <Key variant="action" flex={1.5} label="?123" onTap={() => setMode('symbols')} />
              <Key label="," onTap={() => insertChar(',')} />
              <Key flex={5} variant="action" label="espace" onTap={() => insertChar(' ')} />
              <Key label="." onTap={() => insertChar('.')} />
              <Key variant="action" flex={1.5} label="↵" onTap={() => insertChar('\n')} />
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1">
              {SYMBOLS_ROW1.map(s => <Key key={s} label={s} onTap={() => insertChar(s)} />)}
            </div>
            <div className="flex gap-1">
              {SYMBOLS_ROW2.map(s => <Key key={s} label={s} onTap={() => insertChar(s)} />)}
            </div>
            <div className="flex gap-1">
              <Key variant="action" flex={1.5} label="≈" onTap={() => insertChar('≈')} />
              {SYMBOLS_ROW3.map(s => <Key key={s} label={s} onTap={() => insertChar(s)} />)}
              <Key variant="action" flex={1.5} label={<Delete className="w-5 h-5" />} onTap={backspace} />
            </div>
            <div className="flex gap-1">
              <Key variant="action" flex={1.5} label="ABC" onTap={() => setMode('letters')} />
              <Key label="<" onTap={() => insertChar('<')} />
              <Key flex={5} variant="action" label="espace" onTap={() => insertChar(' ')} />
              <Key label=">" onTap={() => insertChar('>')} />
              <Key variant="action" flex={1.5} label="↵" onTap={() => insertChar('\n')} />
            </div>
          </>
        )}

        {/* Toggle digits visibility */}
        <button
          onClick={() => setShowDigits(s => !s)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground py-0.5"
        >
          {showDigits ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showDigits ? 'Cacher chiffres' : 'Afficher chiffres'}
        </button>
      </div>

      {/* Long-press popup */}
      <AnimatePresence>
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-44 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-2xl p-2 flex gap-1 flex-wrap max-w-[90vw] justify-center"
          >
            {popup.variants.map(v => (
              <button
                key={v}
                onClick={() => pickVariant(v)}
                className="min-w-10 h-10 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-semibold text-base"
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setPopup(null)}
              className="min-w-10 h-10 px-2 rounded-lg bg-muted text-muted-foreground text-sm"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy + favorites */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={copyNormalized}
          disabled={!text.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25"
        >
          <Copy className="w-5 h-5" />
          {settings.autoCopy ? 'Copier (auto)' : 'Copier (compatible tout document)'}
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
