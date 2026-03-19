import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Keyboard, Globe } from 'lucide-react';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';

export type SearchLanguage = 'ba' | 'fr';

interface BaribaKeyboardInputProps {
  onSelectWord: (entry: PhoneticEntry) => void;
  placeholder?: string;
  className?: string;
  language?: SearchLanguage;
  onLanguageChange?: (lang: SearchLanguage) => void;
}

const BARIBA_CHARS = ['ɔ', 'ɛ', 'ã', 'ŋ', 'ɔ̀', 'ɔ́', 'ɛ̀', 'ɛ́', 'à', 'á', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú'];
const FRENCH_CHARS = ['é', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ô', 'î', 'ï', 'ç', 'œ', 'æ'];

export function BaribaKeyboardInput({ 
  onSelectWord, 
  placeholder,
  className = "",
  language = 'ba',
  onLanguageChange
}: BaribaKeyboardInputProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSpecialChars, setShowSpecialChars] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentLang, setCurrentLang] = useState<SearchLanguage>(language);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { t } = useFitilaLanguage();
  
  const { getSuggestions, searchInDefinitions, isLoading, totalEntries } = usePhoneticSuggestions();
  
  const SPECIAL_CHARS = currentLang === 'ba' ? BARIBA_CHARS : FRENCH_CHARS;
  
  const defaultPlaceholder = currentLang === 'ba' 
    ? t('keyboard_type_bariba')
    : t('keyboard_type_french');
  
  const suggestions = query.length >= 1 
    ? (currentLang === 'ba' 
        ? getSuggestions(query, 8) 
        : searchInDefinitions(query, 8))
    : [];
    
  const toggleLanguage = () => {
    const newLang = currentLang === 'ba' ? 'fr' : 'ba';
    setCurrentLang(newLang);
    setQuery('');
    setShowSuggestions(false);
    onLanguageChange?.(newLang);
  };
  
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleSelectSuggestion = (entry: PhoneticEntry) => {
    setQuery(entry.word);
    setShowSuggestions(false);
    onSelectWord(entry);
  };

  const insertSpecialChar = (char: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || query.length;
      const end = inputRef.current.selectionEnd || query.length;
      const newQuery = query.substring(0, start) + char + query.substring(end);
      setQuery(newQuery);
      
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = start + char.length;
          inputRef.current.selectionEnd = start + char.length;
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const clearQuery = () => {
    setQuery('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Language toggle */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-800 hover:bg-indigo-50 transition-colors"
        >
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>{currentLang === 'ba' ? '🇧🇯 Bariba' : '🇫🇷 Français'}</span>
        </button>
        <span className="text-xs text-gray-500">
          {currentLang === 'ba' ? t('keyboard_to_french') : t('keyboard_to_bariba')}
        </span>
      </div>

      {/* Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(e.target.value.length >= 1);
          }}
          onFocus={() => query.length >= 1 && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          className="w-full pl-12 pr-28 py-4 bg-white rounded-2xl border-2 border-gray-200 focus:border-indigo-400 text-gray-800 text-lg font-medium placeholder:text-gray-400 outline-none transition-all"
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            onClick={() => setShowSpecialChars(!showSpecialChars)}
            className={`p-2 rounded-xl transition-colors ${showSpecialChars ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50'}`}
            title={currentLang === 'ba' ? t('keyboard_special_bariba') : t('keyboard_special_french')}
          >
            <Keyboard className="w-5 h-5" />
          </button>
          
          {query && (
            <button onClick={clearQuery} className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Special chars */}
      <AnimatePresence>
        {showSpecialChars && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 p-3 bg-white rounded-2xl shadow-md overflow-hidden">
            <p className="text-xs text-gray-500 mb-2">
              {currentLang === 'ba' ? t('keyboard_special_bariba') : t('keyboard_special_french')}
            </p>
            <div className="flex flex-wrap gap-1">
              {SPECIAL_CHARS.map((char) => (
                <button key={char} onClick={() => insertSpecialChar(char)} className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl text-lg font-medium text-gray-800 hover:bg-indigo-500 hover:text-white transition-colors active:scale-95">
                  {char}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div ref={suggestionsRef} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">{t('keyboard_loading')}</div>
            ) : (
              <>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs text-gray-500">
                    {suggestions.length} {t('keyboard_suggestions')} {totalEntries.toLocaleString()} {t('keyboard_words')}
                  </p>
                </div>
                
                {suggestions.map((entry, index) => (
                  <motion.button
                    key={`${entry.word}-${index}`}
                    onClick={() => handleSelectSuggestion(entry)}
                    className={`w-full px-4 py-3 flex flex-col items-start text-left border-b border-gray-100 last:border-0 transition-colors ${
                      index === selectedIndex ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-bold text-gray-800 text-lg">
                        {currentLang === 'fr' ? entry.definition : entry.word}
                      </span>
                      {currentLang === 'ba' && entry.phonetic && entry.phonetic !== entry.word && (
                        <span className="text-sm text-indigo-500">[{entry.phonetic}]</span>
                      )}
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {entry.part_of_speech}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                      {currentLang === 'fr' ? entry.word : entry.definition}
                    </p>
                  </motion.button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results */}
      <AnimatePresence>
        {showSuggestions && query.length >= 1 && suggestions.length === 0 && !isLoading && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 bg-white rounded-2xl shadow-lg p-4 text-center">
            <p className="text-gray-500">{t('keyboard_no_result')} "{query}"</p>
            <p className="text-xs text-gray-400 mt-1">{t('keyboard_try_other')}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
