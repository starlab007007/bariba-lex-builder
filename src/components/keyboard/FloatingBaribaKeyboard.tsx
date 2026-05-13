import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Trash2, Globe, ChevronDown, ChevronUp, Clock, Star, Search, Zap,
  Languages, Delete, ArrowBigUp, Volume2, X,
} from 'lucide-react';
import { useFloatingKeyboard } from '@/hooks/useFloatingKeyboard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  NASALS, SPECIALS, VOWEL_VARIANTS,
  COMBINING_GRAVE, COMBINING_ACUTE, COMBINING_TILDE,
  isLikelyBariba, nfc,
} from '@/data/baribaAlphabet';
import { PHRASES_RAPIDES } from '@/data/baribaPhrasesRapides';
import { useBaribaPredictor, Prediction } from '@/hooks/useBaribaPredictor';
import { useBaribaTTSWithFallback } from '@/hooks/useBaribaTTSWithFallback';

// ─── Layouts ───────────────────────────────────────────────────────────
const ROW_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const ROW1 = ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const ROW2 = ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'];
const ROW3 = ['w', 'x', 'c', 'v', 'b', 'n'];

// Symbols page (?123)
const SYMBOLS_ROW1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SYMBOLS_ROW2 = ['@', '#', '$', '_', '&', '-', '+', '(', ')', '/'];
const SYMBOLS_ROW3 = ['*', '"', "'", ':', ';', '!', '?', '%', '=', '\\'];

type PanelTab = 'none' | 'history' | 'favorites' | 'words' | 'phrases';
type KeyboardMode = 'letters' | 'symbols';

export default function FloatingBaribaKeyboard() {
  const {
    text, setText, history, favorites, recentWords, settings,
    textareaRef, insertChar, copyToClipboard, clearText, clearHistory,
    toggleFavorite, isFavorite, historySearch, setHistorySearch,
  } = useFloatingKeyboard();
  const { toast } = useToast();
  const predictor = useBaribaPredictor();
  const tts = useBaribaTTSWithFallback();

  const [activePanel, setActivePanel] = useState<PanelTab>('none');
  const [lang, setLang] = useState<'bariba' | 'francais'>('bariba');
  const [mode, setMode] = useState<KeyboardMode>('letters');
  const [shift, setShift] = useState(false);
  const [shiftLock, setShiftLock] = useState(false);
  const [showDigits, setShowDigits] = useState(true);
  const [popup, setPopup] = useState<{ key: string; variants: string[] } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<{ src: string; out: string; dir: 'ba2fr' | 'fr2ba' } | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupTriggerRef = useRef<string | null>(null);
  const translateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePanel = (tab: PanelTab) => setActivePanel(p => p === tab ? 'none' : tab);

  // ─── Predictions (mots + phrases + tons) ────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const m = before.match(/[\p{L}\u0300-\u036F]+$/u);
    const partial = m ? m[0] : '';
    const ctx = m ? before.slice(0, before.length - partial.length) : before;
    setPredictions(predictor.getPredictions(partial, ctx));
  }, [text, predictor, textareaRef]);

  // ─── Auto-translation (debounce 800 ms) ─────────────────────────────
  useEffect(() => {
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    const t = text.trim();
    if (!t || t.length < 2) { setTranslation(null); return; }
    translateTimerRef.current = setTimeout(async () => {
      try {
        const dir: 'ba2fr' | 'fr2ba' = isLikelyBariba(t) ? 'ba2fr' : 'fr2ba';
        const sourceLang = dir === 'ba2fr' ? 'bariba' : 'french';
        const targetLang = dir === 'ba2fr' ? 'french' : 'bariba';
        const { data, error } = await supabase.functions.invoke('bariba-translate', {
          body: { text: t, sourceLang, targetLang },
        });
        if (error) return;
        const out = nfc(((data as any)?.translation || (data as any)?.translated_text || (data as any)?.text || '').toString());
        if (out && out.toLowerCase() !== t.toLowerCase()) setTranslation({ src: t, out, dir });
      } catch { /* silent */ }
    }, 800);
    return () => { if (translateTimerRef.current) clearTimeout(translateTimerRef.current); };
  }, [text]);

  // ─── Insertion helpers ──────────────────────────────────────────────
  const type = useCallback((c: string) => {
    insertChar(nfc(c));
    if (shift && !shiftLock) setShift(false);
  }, [insertChar, shift, shiftLock]);

  const onAlphaTap = (c: string) => type(shift || shiftLock ? c.toUpperCase() : c);

  // Diacritique combinant — toggle si déjà présent
  const toggleCombining = useCallback((mark: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const prev = text.slice(0, pos);
    const after = text.slice(pos);
    if (prev.endsWith(mark)) {
      const next = prev.slice(0, -1) + after;
      setText(next);
      requestAnimationFrame(() => {
        if (el) { el.selectionStart = el.selectionEnd = pos - 1; el.focus(); }
      });
    } else {
      insertChar(mark);
    }
  }, [text, insertChar, setText, textareaRef]);

  const insertToneLow = useCallback(() => toggleCombining(COMBINING_GRAVE), [toggleCombining]);
  const insertToneHigh = useCallback(() => toggleCombining(COMBINING_ACUTE), [toggleCombining]);
  const insertNasal = useCallback(() => toggleCombining(COMBINING_TILDE), [toggleCombining]);

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

  // Long-press handlers
  const startLongPress = (key: string) => {
    popupTriggerRef.current = key;
    const variants = VOWEL_VARIANTS[key.toLowerCase()];
    if (!variants) return;
    longPressRef.current = setTimeout(() => {
      setPopup({ key, variants });
    }, 380);
  };
  const cancelLongPress = () => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  };
  const onAlphaPointerDown = (c: string) => startLongPress(c);
  const onAlphaPointerUp = (c: string) => {
    cancelLongPress();
    if (popup && popup.key === c) return;
    if (popupTriggerRef.current === c) onAlphaTap(c);
    popupTriggerRef.current = null;
  };
  const pickVariant = (v: string) => {
    insertChar(nfc(v));
    setPopup(null);
    if (shift && !shiftLock) setShift(false);
  };

  const onShift = () => {
    if (shiftLock) { setShiftLock(false); setShift(false); return; }
    if (shift) { setShiftLock(true); return; }
    setShift(true);
  };

  // ─── Insertion suggestion / phrase ──────────────────────────────────
  const insertPrediction = useCallback((p: Prediction) => {
    if (p.type === 'tone') {
      insertChar(nfc(p.word));
      return;
    }
    const el = textareaRef.current;
    if (!el) { insertChar(nfc(p.word) + ' '); predictor.learnWord(p.word); return; }
    const cursor = el.selectionStart;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const m = before.match(/[\p{L}\u0300-\u036F]+$/u);
    const partial = m ? m[0] : '';
    const newBefore = before.slice(0, before.length - partial.length) + nfc(p.word) + ' ';
    setText(newBefore + after);
    predictor.learnWord(p.word);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = newBefore.length;
      el.focus();
    });
  }, [text, setText, insertChar, predictor, textareaRef]);

  const insertPhrase = useCallback((ba: string) => {
    insertChar(nfc(ba) + ' ');
    predictor.learnWord(ba);
  }, [insertChar, predictor]);

  // ─── Translation actions ─────────────────────────────────────────────
  const insertTranslation = useCallback(() => {
    if (!translation) return;
    setText(nfc(translation.out));
    setTranslation(null);
  }, [translation, setText]);

  const translateNow = useCallback(async () => {
    const t = text.trim();
    if (!t) return;
    setTranslating(true);
    try {
      const dir = isLikelyBariba(t) ? 'ba2fr' : 'fr2ba';
      const sourceLang = dir === 'ba2fr' ? 'bariba' : 'french';
      const targetLang = dir === 'ba2fr' ? 'french' : 'bariba';
      const { data, error } = await supabase.functions.invoke('bariba-translate', {
        body: { text: t, sourceLang, targetLang },
      });
      if (error) throw error;
      const out = nfc(((data as any)?.translation || (data as any)?.translated_text || (data as any)?.text || '').toString());
      if (!out) throw new Error('Pas de traduction');
      await navigator.clipboard.writeText(out);
      toast({ title: '🌍 Traduit & copié', description: out.length > 80 ? out.slice(0, 77) + '…' : out });
    } catch (e: any) {
      toast({ title: 'Traduction indisponible', description: e?.message?.slice(0, 100) || 'Réessayez plus tard', variant: 'destructive' });
    } finally { setTranslating(false); }
  }, [text, toast]);

  // NFC-normalized copy
  const copyNormalized = useCallback(async () => {
    if (!text.trim()) return;
    const normalized = nfc(text);
    if (normalized !== text) setText(normalized);
    await copyToClipboard();
  }, [text, setText, copyToClipboard]);

  // ─── Render helpers ──────────────────────────────────────────────────
  const Key = ({
    label, onTap, flex = 1, variant = 'default', onPointerDown, onPointerUp,
  }: {
    label: React.ReactNode;
    onTap?: () => void;
    flex?: number;
    variant?: 'default' | 'special' | 'action' | 'accent' | 'nasal' | 'tone';
    onPointerDown?: () => void;
    onPointerUp?: () => void;
  }) => {
    const base = 'h-11 rounded-lg font-semibold text-base flex items-center justify-center select-none active:scale-95 transition-transform shadow-sm';
    const variants = {
      default: 'bg-muted/70 text-foreground hover:bg-muted',
      special: 'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 text-amber-900 dark:text-amber-100',
      action: 'bg-slate-300/70 dark:bg-slate-700/70 text-foreground text-sm',
      accent: 'bg-gradient-to-b from-orange-200 to-orange-300 dark:from-orange-900/50 dark:to-orange-800/50 text-orange-900 dark:text-orange-100',
      nasal: 'bg-[#0F3460] text-white',
      tone: 'bg-gradient-to-b from-yellow-200 to-amber-300 dark:from-yellow-900/40 dark:to-amber-800/40 text-yellow-900 dark:text-yellow-100',
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
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={translateNow} disabled={translating || !text.trim()} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40" title="Traduire & copier">
            <Languages className={`w-4 h-4 ${translating ? 'animate-pulse text-emerald-500' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={() => togglePanel('phrases')} className={`p-1.5 rounded-lg ${activePanel === 'phrases' ? 'bg-emerald-500/20' : 'hover:bg-muted'}`} title="Phrases rapides">
            <Zap className={`w-4 h-4 ${activePanel === 'phrases' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={() => togglePanel('favorites')} className={`p-1.5 rounded-lg ${activePanel === 'favorites' ? 'bg-amber-500/20' : 'hover:bg-muted'}`} title="Favoris">
            <Star className={`w-4 h-4 ${activePanel === 'favorites' ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
          </button>
          <button onClick={() => togglePanel('history')} className={`p-1.5 rounded-lg ${activePanel === 'history' ? 'bg-blue-500/20' : 'hover:bg-muted'}`} title="Historique">
            <Clock className={`w-4 h-4 ${activePanel === 'history' ? 'text-blue-500' : 'text-muted-foreground'}`} />
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
          placeholder={lang === 'bariba' ? 'Sɛmɛ wãa nɔ̃ɔ...' : 'Écrivez votre texte ici...'}
          className="w-full h-full resize-none bg-muted/30 rounded-xl p-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-muted-foreground/50"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Translation banner */}
      <AnimatePresence>
        {translation && (
          <motion.button
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onClick={insertTranslation}
            className="mx-3 mb-1 px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 text-left flex items-center gap-2 overflow-hidden"
          >
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 shrink-0">
              🌍 {translation.dir === 'ba2fr' ? 'BA→FR' : 'FR→BA'}
            </span>
            <span className="text-sm text-foreground truncate flex-1">{translation.out}</span>
            <X className="w-3 h-3 text-muted-foreground shrink-0" onClick={(e) => { e.stopPropagation(); setTranslation(null); }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Predictions bar (3 chips: phrase, mot, ton) */}
      <AnimatePresence>
        {predictions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-1 overflow-hidden"
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {predictions.map((p, i) => {
                const cls = p.type === 'phrase'
                  ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700'
                  : p.type === 'tone'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                    : 'bg-card text-foreground border border-border';
                const dot = p.type === 'phrase' ? '● ' : '';
                return (
                  <button
                    key={i + p.word}
                    onClick={() => insertPrediction(p)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity ${cls}`}
                  >
                    {dot}{p.word}
                    {p.translation && <span className="ml-1 text-[10px] opacity-60">{p.translation.slice(0, 18)}</span>}
                  </button>
                );
              })}
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
            <div className="p-3 max-h-48 overflow-y-auto">
              {activePanel === 'phrases' && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Phrases rapides ({PHRASES_RAPIDES.length})
                    </span>
                    <span className="text-[10px] text-muted-foreground">tap = bariba · long = fr · 🔊 = écouter</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PHRASES_RAPIDES.map((p, i) => (
                      <div key={i} className="flex items-center gap-1 bg-muted/40 rounded-lg p-1.5">
                        <button
                          onClick={() => insertPhrase(p.ba)}
                          onContextMenu={(e) => { e.preventDefault(); insertChar(p.fr + ' '); }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="text-sm font-medium text-foreground truncate">{p.ba}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.fr}</div>
                        </button>
                        <button
                          onClick={() => tts.speak(p.ba)}
                          className="shrink-0 p-1 rounded hover:bg-emerald-500/20"
                          title="Écouter"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── KEYBOARD ──────────────────────────────────────────── */}
      <div className="border-t border-border/50 px-1.5 py-1.5 space-y-1.5 bg-muted/20">
        {mode === 'letters' ? (
          <>
            {showDigits && (
              <div className="flex gap-1">
                {ROW_DIGITS.map(d => (
                  <Key key={d} label={d} onTap={() => insertChar(d)} />
                ))}
              </div>
            )}

            <div className="flex gap-1">
              {ROW1.map(c => (
                <Key key={c} label={shift || shiftLock ? c.toUpperCase() : c}
                  onPointerDown={() => onAlphaPointerDown(c)} onPointerUp={() => onAlphaPointerUp(c)} />
              ))}
            </div>
            <div className="flex gap-1 px-3">
              {ROW2.map(c => (
                <Key key={c} label={shift || shiftLock ? c.toUpperCase() : c}
                  onPointerDown={() => onAlphaPointerDown(c)} onPointerUp={() => onAlphaPointerUp(c)} />
              ))}
            </div>
            <div className="flex gap-1">
              <Key variant="action" flex={1.5}
                label={<ArrowBigUp className={`w-5 h-5 ${shiftLock ? 'text-amber-500' : shift ? 'text-blue-500' : ''}`} />}
                onTap={onShift} />
              {ROW3.map(c => (
                <Key key={c} label={shift || shiftLock ? c.toUpperCase() : c}
                  onPointerDown={() => onAlphaPointerDown(c)} onPointerUp={() => onAlphaPointerUp(c)} />
              ))}
              <Key variant="action" flex={1.5} label={<Delete className="w-5 h-5" />} onTap={backspace} />
            </div>

            {/* Bariba nasales row */}
            {lang === 'bariba' && (
              <div className="flex gap-1">
                {NASALS.map(({ lo, up }) => (
                  <Key key={lo} variant="nasal"
                    label={shift || shiftLock ? up : lo}
                    onTap={() => type(shift || shiftLock ? up : lo)}
                  />
                ))}
              </div>
            )}

            {/* Bariba specials + tons row */}
            {lang === 'bariba' && (
              <div className="flex gap-1">
                {SPECIALS.map(({ lo, up }) => (
                  <Key key={lo} variant="special" label={shift || shiftLock ? up : lo}
                    onPointerDown={() => onAlphaPointerDown(lo)} onPointerUp={() => onAlphaPointerUp(lo)} />
                ))}
                <Key variant="tone" label={<span className="text-lg">{'\u25CC\u0300'}</span>} onTap={insertToneLow} />
                <Key variant="tone" label={<span className="text-lg">{'\u25CC\u0301'}</span>} onTap={insertToneHigh} />
                <Key variant="tone" label={<span className="text-lg">{'\u25CC\u0303'}</span>} onTap={insertNasal} />
              </div>
            )}

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
              <button key={v} onClick={() => pickVariant(v)}
                className="min-w-10 h-10 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-semibold text-base">
                {v}
              </button>
            ))}
            <button onClick={() => setPopup(null)}
              className="min-w-10 h-10 px-2 rounded-lg bg-muted text-muted-foreground text-sm">
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
