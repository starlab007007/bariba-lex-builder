import { useState, useCallback, useRef, useMemo } from 'react';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { useToast } from '@/hooks/use-toast';

// ═══════════════════════════════════════════════════════════════
// Storage keys
// ═══════════════════════════════════════════════════════════════
const HISTORY_KEY = 'fitila_keyboard_history';
const FAVORITES_KEY = 'fitila_keyboard_favorites';
const RECENT_WORDS_KEY = 'fitila_keyboard_recent_words';
const SETTINGS_KEY = 'fitila_keyboard_settings';
const MAX_HISTORY = 30;
const MAX_RECENT_WORDS = 50;

// ═══════════════════════════════════════════════════════════════
// Phonetic auto-replacement map (latin → bariba)
// ═══════════════════════════════════════════════════════════════
const PHONETIC_REPLACEMENTS: [RegExp, string][] = [
  [/oo/g, 'ɔ'],
  [/ee/g, 'ɛ'],
  [/ng/g, 'ŋ'],
  [/an/g, 'ã'],
  [/in/g, 'ĩ'],
  [/un/g, 'ũ'],
  [/o`/g, 'ɔ̀'], [/o'/g, 'ɔ́'], [/o~/g, 'ɔ̃'],
  [/e`/g, 'ɛ̀'], [/e'/g, 'ɛ́'], [/e~/g, 'ɛ̃'],
  [/a`/g, 'à'], [/a'/g, 'á'],
  [/i`/g, 'ì'], [/i'/g, 'í'],
  [/u`/g, 'ù'], [/u'/g, 'ú'],
  [/n`/g, 'ǹ'],
];

// ═══════════════════════════════════════════════════════════════
// Settings type
// ═══════════════════════════════════════════════════════════════
export interface KeyboardSettings {
  autoCopy: boolean;
  phoneticMode: boolean;
  theme: 'system' | 'light' | 'dark';
}

const DEFAULT_SETTINGS: KeyboardSettings = {
  autoCopy: false,
  phoneticMode: true,
  theme: 'system',
};

function loadJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════
export function useFloatingKeyboard() {
  const { getSuggestions } = usePhoneticSuggestions();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<PhoneticEntry[]>([]);
  const [history, setHistory] = useState<string[]>(() => loadJSON(HISTORY_KEY, []));
  const [favorites, setFavorites] = useState<string[]>(() => loadJSON(FAVORITES_KEY, []));
  const [recentWords, setRecentWords] = useState<string[]>(() => loadJSON(RECENT_WORDS_KEY, []));
  const [settings, setSettingsState] = useState<KeyboardSettings>(() => loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [historySearch, setHistorySearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Phonetic replacement ──
  const applyPhonetic = useCallback((val: string): string => {
    if (!settings.phoneticMode) return val;
    let result = val;
    for (const [pattern, replacement] of PHONETIC_REPLACEMENTS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }, [settings.phoneticMode]);

  const getCurrentWord = useCallback((val: string, cursorPos: number): string => {
    const before = val.slice(0, cursorPos);
    const match = before.match(/[\wɔɛŋãàáèéìíòóùúũĩɔ̀ɔ́ɔ̃ɛ̀ɛ́ɛ̃ǹ]+$/u);
    return match ? match[0] : '';
  }, []);

  const updateSuggestions = useCallback((val: string) => {
    const processed = applyPhonetic(val);
    setText(processed);
    const cursor = textareaRef.current?.selectionStart ?? processed.length;
    const word = getCurrentWord(processed, cursor);
    if (word.length >= 2) {
      setSuggestions(getSuggestions(word, 8));
    } else {
      setSuggestions([]);
    }
  }, [getSuggestions, getCurrentWord, applyPhonetic]);

  const insertChar = useCallback((char: string) => {
    const el = textareaRef.current;
    if (!el) { setText(prev => prev + char); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = text.slice(0, start) + char + text.slice(end);
    updateSuggestions(newVal);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + char.length;
      el.focus();
    });
  }, [text, updateSuggestions]);

  const trackWord = useCallback((word: string) => {
    const updated = [word, ...recentWords.filter(w => w !== word)].slice(0, MAX_RECENT_WORDS);
    setRecentWords(updated);
    localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(updated));
  }, [recentWords]);

  const insertSuggestion = useCallback((word: string) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const currentWord = getCurrentWord(text, cursor);
    const before = text.slice(0, cursor - currentWord.length);
    const after = text.slice(cursor);
    const newVal = before + word + ' ' + after;
    updateSuggestions(newVal);
    setSuggestions([]);
    trackWord(word);
    requestAnimationFrame(() => {
      if (el) {
        const pos = before.length + word.length + 1;
        el.selectionStart = el.selectionEnd = pos;
        el.focus();
      }
    });
  }, [text, getCurrentWord, updateSuggestions, trackWord]);

  // ── Copy ──
  const copyToClipboard = useCallback(async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      const newHistory = [text, ...history.filter(h => h !== text)].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      toast({ title: '✅ Copié !', description: 'Collez dans WhatsApp ou toute autre application' });
    } catch {
      toast({ title: '❌ Erreur', description: 'Impossible de copier', variant: 'destructive' });
    }
  }, [text, history, toast]);

  // ── Auto-copy on suggestion insert ──
  const insertSuggestionAutoCopy = useCallback((word: string) => {
    insertSuggestion(word);
    if (settings.autoCopy) {
      // small delay so text state updates
      setTimeout(async () => {
        try {
          const el = textareaRef.current;
          if (el) await navigator.clipboard.writeText(el.value);
        } catch { /* silent */ }
      }, 100);
    }
  }, [insertSuggestion, settings.autoCopy]);

  // ── Favorites ──
  const toggleFavorite = useCallback((phrase: string) => {
    const isFav = favorites.includes(phrase);
    const updated = isFav ? favorites.filter(f => f !== phrase) : [phrase, ...favorites];
    setFavorites(updated);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    toast({ title: isFav ? '💔 Retiré des favoris' : '⭐ Ajouté aux favoris' });
  }, [favorites, toast]);

  const isFavorite = useCallback((phrase: string) => favorites.includes(phrase), [favorites]);

  // ── Filtered history ──
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(h => h.toLowerCase().includes(q));
  }, [history, historySearch]);

  // ── Clear ──
  const clearText = useCallback(() => { setText(''); setSuggestions([]); }, []);
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  // ── Settings ──
  const updateSettings = useCallback((patch: Partial<KeyboardSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Export / Import ──
  const exportData = useCallback(() => {
    const data = {
      version: 1,
      history,
      favorites,
      recentWords,
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitila-keyboard-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: '📦 Export réussi !' });
  }, [history, favorites, recentWords, settings, toast]);

  const importData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.history) { setHistory(data.history); localStorage.setItem(HISTORY_KEY, JSON.stringify(data.history)); }
        if (data.favorites) { setFavorites(data.favorites); localStorage.setItem(FAVORITES_KEY, JSON.stringify(data.favorites)); }
        if (data.recentWords) { setRecentWords(data.recentWords); localStorage.setItem(RECENT_WORDS_KEY, JSON.stringify(data.recentWords)); }
        if (data.settings) { setSettingsState(data.settings); localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings)); }
        toast({ title: '✅ Import réussi !', description: `${data.history?.length || 0} textes, ${data.favorites?.length || 0} favoris` });
      } catch {
        toast({ title: '❌ Fichier invalide', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  }, [toast]);

  return {
    text, setText: updateSuggestions, suggestions, history: filteredHistory,
    allHistory: history, favorites, recentWords, settings,
    textareaRef, insertChar, insertSuggestion: insertSuggestionAutoCopy,
    copyToClipboard, clearText, clearHistory,
    toggleFavorite, isFavorite, historySearch, setHistorySearch,
    updateSettings, exportData, importData,
  };
}