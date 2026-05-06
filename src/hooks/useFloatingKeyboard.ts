import { useState, useCallback, useRef } from 'react';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { useToast } from '@/hooks/use-toast';

const HISTORY_KEY = 'fitila_keyboard_history';
const MAX_HISTORY = 10;

export function useFloatingKeyboard() {
  const { getSuggestions } = usePhoneticSuggestions();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<PhoneticEntry[]>([]);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getCurrentWord = useCallback((val: string, cursorPos: number): string => {
    const before = val.slice(0, cursorPos);
    const match = before.match(/[\wɔɛŋãàáèéìíòóùúũĩɔ̀ɔ́ɔ̃ɛ̀ɛ́ɛ̃ǹ]+$/u);
    return match ? match[0] : '';
  }, []);

  const updateSuggestions = useCallback((val: string) => {
    setText(val);
    const cursor = textareaRef.current?.selectionStart ?? val.length;
    const word = getCurrentWord(val, cursor);
    if (word.length >= 2) {
      setSuggestions(getSuggestions(word, 6));
    } else {
      setSuggestions([]);
    }
  }, [getSuggestions, getCurrentWord]);

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

  const insertSuggestion = useCallback((word: string) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const currentWord = getCurrentWord(text, cursor);
    const before = text.slice(0, cursor - currentWord.length);
    const after = text.slice(cursor);
    const newVal = before + word + ' ' + after;
    updateSuggestions(newVal);
    setSuggestions([]);
    requestAnimationFrame(() => {
      if (el) {
        const pos = before.length + word.length + 1;
        el.selectionStart = el.selectionEnd = pos;
        el.focus();
      }
    });
  }, [text, getCurrentWord, updateSuggestions]);

  const copyToClipboard = useCallback(async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      // Save to history
      const newHistory = [text, ...history.filter(h => h !== text)].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      toast({ title: '✅ Copié !', description: 'Collez dans WhatsApp ou toute autre application' });
    } catch {
      toast({ title: '❌ Erreur', description: 'Impossible de copier', variant: 'destructive' });
    }
  }, [text, history, toast]);

  const clearText = useCallback(() => {
    setText('');
    setSuggestions([]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return {
    text, setText: updateSuggestions, suggestions, history,
    textareaRef, insertChar, insertSuggestion,
    copyToClipboard, clearText, clearHistory,
  };
}