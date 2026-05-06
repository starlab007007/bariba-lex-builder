import { useCallback } from 'react';

interface BaribaKeyboardPlugin {
  getHistory(): Promise<{ history: string }>;
  getSuggestions(): Promise<{ suggestions: string; lastWord: string }>;
  clearHistory(): Promise<void>;
  saveWord(options: { word: string }): Promise<void>;
}

let plugin: BaribaKeyboardPlugin | null = null;

async function getPlugin(): Promise<BaribaKeyboardPlugin | null> {
  if (plugin) return plugin;
  try {
    const { registerPlugin } = await import('@capacitor/core');
    plugin = registerPlugin<BaribaKeyboardPlugin>('BaribaKeyboard');
    return plugin;
  } catch {
    return null;
  }
}

export function useBaribaKeyboard() {
  const getHistory = useCallback(async (): Promise<string[]> => {
    try {
      const p = await getPlugin();
      if (!p) return [];
      const result = await p.getHistory();
      return JSON.parse(result.history || '[]');
    } catch {
      return [];
    }
  }, []);

  const getSuggestions = useCallback(async (): Promise<{ suggestions: string[]; lastWord: string }> => {
    try {
      const p = await getPlugin();
      if (!p) return { suggestions: [], lastWord: '' };
      const result = await p.getSuggestions();
      return {
        suggestions: JSON.parse(result.suggestions || '[]'),
        lastWord: result.lastWord || '',
      };
    } catch {
      return { suggestions: [], lastWord: '' };
    }
  }, []);

  const clearHistory = useCallback(async (): Promise<void> => {
    try {
      const p = await getPlugin();
      if (p) await p.clearHistory();
    } catch {
      // silent
    }
  }, []);

  const saveWord = useCallback(async (word: string): Promise<void> => {
    try {
      const p = await getPlugin();
      if (p) await p.saveWord({ word });
    } catch {
      // silent
    }
  }, []);

  return { getHistory, getSuggestions, clearHistory, saveWord };
}