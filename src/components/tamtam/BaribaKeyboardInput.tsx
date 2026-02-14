import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Keyboard, Globe } from 'lucide-react';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';

export type SearchLanguage = 'ba' | 'fr';

interface BaribaKeyboardInputProps {
  onSelectWord: (entry: PhoneticEntry) => void;
  placeholder?: string;
  className?: string;
  language?: SearchLanguage;
  onLanguageChange?: (lang: SearchLanguage) => void;
}

// Caractères spéciaux bariba
const BARIBA_CHARS = ['ɔ', 'ɛ', 'ã', 'ŋ', 'ɔ̀', 'ɔ́', 'ɛ̀', 'ɛ́', 'à', 'á', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú'];

// Caractères spéciaux français
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
  
  const { getSuggestions, searchInDefinitions, isLoading, totalEntries } = usePhoneticSuggestions();
  
  // Characters based on language
  const SPECIAL_CHARS = currentLang === 'ba' ? BARIBA_CHARS : FRENCH_CHARS;
  
  // Default placeholder based on language
  const defaultPlaceholder = currentLang === 'ba' 
    ? "Tapez un mot bariba..." 
    : "Tapez un mot français...";
  
  // Obtenir les suggestions basées sur la requête et la langue
  const suggestions = query.length >= 1 
    ? (currentLang === 'ba' 
        ? getSuggestions(query, 8) 
        : searchInDefinitions(query, 8))
    : [];
    
  // Toggle language
  const toggleLanguage = () => {
    const newLang = currentLang === 'ba' ? 'fr' : 'ba';
    setCurrentLang(newLang);
    setQuery('');
    setShowSuggestions(false);
    onLanguageChange?.(newLang);
  };
  
  // Réinitialiser l'index sélectionné quand les suggestions changent
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length]);

  // Gérer les touches du clavier
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

  // Sélectionner une suggestion
  const handleSelectSuggestion = (entry: PhoneticEntry) => {
    setQuery(entry.word);
    setShowSuggestions(false);
    onSelectWord(entry);
  };

  // Insérer un caractère spécial
  const insertSpecialChar = (char: string) => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || query.length;
      const end = inputRef.current.selectionEnd || query.length;
      const newQuery = query.substring(0, start) + char + query.substring(end);
      setQuery(newQuery);
      
      // Repositionner le curseur après le caractère inséré
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = start + char.length;
          inputRef.current.selectionEnd = start + char.length;
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  // Effacer la requête
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
          className="flex items-center gap-2 px-3 py-2 bg-tamtam-bg rounded-xl text-sm font-medium text-tamtam-text hover:bg-tamtam-primary/10 transition-colors"
        >
          <Globe className="w-4 h-4 text-tamtam-primary" />
          <span>{currentLang === 'ba' ? '🇧🇯 Bariba' : '🇫🇷 Français'}</span>
        </button>
        <span className="text-xs text-tamtam-text-muted">
          {currentLang === 'ba' ? '→ Français' : '→ Bariba'}
        </span>
      </div>

      {/* Champ de saisie */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-tamtam-text-muted">
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
          className="w-full pl-12 pr-28 py-4 bg-tamtam-surface rounded-2xl border-2 border-transparent focus:border-tamtam-primary text-tamtam-text text-lg font-medium placeholder:text-tamtam-text-muted/50 outline-none transition-all"
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Bouton caractères spéciaux */}
          <button
            onClick={() => setShowSpecialChars(!showSpecialChars)}
            className={`p-2 rounded-xl transition-colors ${showSpecialChars ? 'bg-tamtam-primary text-white' : 'bg-tamtam-bg text-tamtam-text-muted hover:bg-tamtam-primary/20'}`}
            title={currentLang === 'ba' ? 'Caractères bariba' : 'Caractères français'}
          >
            <Keyboard className="w-5 h-5" />
          </button>
          
          {/* Bouton effacer */}
          {query && (
            <button
              onClick={clearQuery}
              className="p-2 rounded-xl bg-tamtam-bg text-tamtam-text-muted hover:bg-red-100 hover:text-red-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Clavier de caractères spéciaux */}
      <AnimatePresence>
        {showSpecialChars && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-3 bg-tamtam-surface rounded-2xl shadow-tamtam-soft overflow-hidden"
          >
            <p className="text-xs text-tamtam-text-muted mb-2">
              {currentLang === 'ba' ? 'Caractères spéciaux bariba :' : 'Caractères spéciaux français :'}
            </p>
            <div className="flex flex-wrap gap-1">
              {SPECIAL_CHARS.map((char) => (
                <button
                  key={char}
                  onClick={() => insertSpecialChar(char)}
                  className="w-10 h-10 flex items-center justify-center bg-tamtam-bg rounded-xl text-lg font-medium text-tamtam-text hover:bg-tamtam-primary hover:text-white transition-colors active:scale-95"
                >
                  {char}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Liste des suggestions */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 left-0 right-0 mt-2 bg-tamtam-surface rounded-2xl shadow-lg border border-tamtam-bg overflow-hidden max-h-80 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 text-center text-tamtam-text-muted">
                Chargement...
              </div>
            ) : (
              <>
                <div className="px-4 py-2 bg-tamtam-bg/50 border-b border-tamtam-bg">
                  <p className="text-xs text-tamtam-text-muted">
                    {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} sur {totalEntries.toLocaleString()} mots
                  </p>
                </div>
                
                {suggestions.map((entry, index) => (
                  <motion.button
                    key={`${entry.word}-${index}`}
                    onClick={() => handleSelectSuggestion(entry)}
                    className={`w-full px-4 py-3 flex flex-col items-start text-left border-b border-tamtam-bg/50 last:border-0 transition-colors ${
                      index === selectedIndex ? 'bg-tamtam-primary/10' : 'hover:bg-tamtam-bg/50'
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-bold text-tamtam-text text-lg">
                        {currentLang === 'fr' ? entry.definition : entry.word}
                      </span>
                      {currentLang === 'ba' && entry.phonetic && entry.phonetic !== entry.word && (
                        <span className="text-sm text-tamtam-primary/70">[{entry.phonetic}]</span>
                      )}
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-tamtam-bg text-tamtam-text-muted">
                        {entry.part_of_speech}
                      </span>
                    </div>
                    <p className="text-sm text-tamtam-text-muted line-clamp-1 mt-1">
                      {currentLang === 'fr' ? entry.word : entry.definition}
                    </p>
                  </motion.button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message si aucune suggestion */}
      <AnimatePresence>
        {showSuggestions && query.length >= 1 && suggestions.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 left-0 right-0 mt-2 bg-tamtam-surface rounded-2xl shadow-lg p-4 text-center"
          >
            <p className="text-tamtam-text-muted">Aucun mot trouvé pour "{query}"</p>
            <p className="text-xs text-tamtam-text-muted/70 mt-1">Essayez une autre orthographe</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
