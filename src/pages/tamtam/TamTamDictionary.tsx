import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Keyboard, Volume2, Loader2, Search, BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { BaribaKeyboardInput, SearchLanguage } from '@/components/tamtam/BaribaKeyboardInput';
import { VocalDictionaryResult } from '@/components/tamtam/VocalDictionaryResult';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { NewWordSubmission } from '@/components/tamtam/NewWordSubmission';
import { KuaishouLayout } from '@/components/tamtam/KuaishouLayout';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useContributionPoints, getLevel } from '@/hooks/useContributionPoints';

type InputMode = 'voice' | 'keyboard';
type SearchDirection = 'ba-fr' | 'fr-ba';

export default function TamTamDictionary() {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang, isSpeaking } = useUnifiedAudio();
  const { getSuggestions, searchInDefinitions, findExactMatch, isLoading: isLoadingDict, totalEntries } = usePhoneticSuggestions();
  const { totalPoints, level, submissionCount, isLoading: isLoadingContrib } = useContributionPoints();
  
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');
  const [searchDirection, setSearchDirection] = useState<SearchDirection>('ba-fr');
  const [keyboardLang, setKeyboardLang] = useState<SearchLanguage>('ba');
  const [selectedEntry, setSelectedEntry] = useState<PhoneticEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState<PhoneticEntry[]>([]);
  const [notFoundWord, setNotFoundWord] = useState<string>('');

  // No auto-announce in keyboard mode

  // Traitement de la commande vocale
  const handleVoiceCommand = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setIsProcessing(true);
    triggerFeedback('send');
    
    try {
      const query = result.transcription?.toLowerCase().trim() || '';
      setLastQuery(query);
      
      if (!query) {
        const errorMsg = currentLang === 'ba' ? "Kò gbọ́ ɔ̀rɔ̀ kan" : "Aucun mot détecté";
        await speakCurrentLang(errorMsg);
        return;
      }
      
      console.log('[TamTamDictionary] Voice query:', query, 'Lang:', result.sourceLang);
      
      // Rechercher dans le dictionnaire selon la direction
      let foundEntry: PhoneticEntry | null = null;
      
      if (result.sourceLang === 'ba') {
        // Recherche bariba -> français
        foundEntry = findExactMatch(query);
        if (!foundEntry) {
          const suggestions = getSuggestions(query, 1);
          foundEntry = suggestions[0] || null;
        }
      } else {
        // Recherche français -> bariba
        const results = searchInDefinitions(query, 1);
        foundEntry = results[0] || null;
      }
      
      if (foundEntry) {
        setSelectedEntry(foundEntry);
        addToHistory(foundEntry);
        triggerFeedback('success');
        
        // Lecture automatique du résultat
        const announcement = currentLang === 'ba'
          ? `${foundEntry.word}. Ìtúmọ̀: ${foundEntry.definition}`
          : `${foundEntry.word}. Définition: ${foundEntry.definition}`;
        await speakCurrentLang(announcement);
      } else {
        setNotFoundWord(query);
        const notFoundMsg = currentLang === 'ba' 
          ? `Kò rí ɔ̀rɔ̀ "${query}"` 
          : `Mot "${query}" non trouvé`;
        await speakCurrentLang(notFoundMsg);
      }
    } catch (error) {
      console.error('[TamTamDictionary] Error:', error);
      triggerFeedback('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sélection d'un mot depuis le clavier
  const handleSelectWord = async (entry: PhoneticEntry) => {
    setSelectedEntry(entry);
    setNotFoundWord('');
    addToHistory(entry);
    triggerFeedback('success');
    
    // Lecture automatique
    await speakCurrentLang(entry.definition);
  };
  
  // Sync keyboard language with search direction
  const handleKeyboardLangChange = (lang: SearchLanguage) => {
    setKeyboardLang(lang);
    setSearchDirection(lang === 'ba' ? 'ba-fr' : 'fr-ba');
  };

  // Ajouter à l'historique
  const addToHistory = (entry: PhoneticEntry) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(e => e.word !== entry.word);
      return [entry, ...filtered].slice(0, 5);
    });
  };

  // Basculer le mode d'entrée
  const toggleInputMode = () => {
    const newMode = inputMode === 'voice' ? 'keyboard' : 'voice';
    setInputMode(newMode);
    triggerFeedback('click');
    
    const modeAnnounce = newMode === 'voice' 
      ? (currentLang === 'ba' ? "Ètò ohùn" : "Mode vocal")
      : (currentLang === 'ba' ? "Ètò ìkọ̀wé" : "Mode clavier");
    speakCurrentLang(modeAnnounce);
  };

  // Basculer la direction de recherche
  const toggleDirection = () => {
    const newDir = searchDirection === 'ba-fr' ? 'fr-ba' : 'ba-fr';
    setSearchDirection(newDir);
    setKeyboardLang(newDir === 'ba-fr' ? 'ba' : 'fr');
    triggerFeedback('click');
    
    const dirAnnounce = newDir === 'ba-fr'
      ? (currentLang === 'ba' ? "Bàátɔ̀nú sí Fàránsé" : "Bariba vers Français")
      : (currentLang === 'ba' ? "Fàránsé sí Bàátɔ̀nú" : "Français vers Bariba");
    speakCurrentLang(dirAnnounce);
  };
  
  // Clear selected entry
  const handleCloseResult = () => {
    setSelectedEntry(null);
    setNotFoundWord('');
  };

  return (
    <KuaishouLayout
      titleFr="Dictionnaire"
      titleBa="Gbɛ́-sɔ́ɔ̀rù"
      emoji="📖"
      showBack={true}
      showMenu={false}
      showNav={false}
    >
      {/* Toggles mode et direction */}
      <div className="px-3 sm:px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {/* Toggle mode */}
          <button
            onClick={toggleInputMode}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              inputMode === 'voice' 
                ? 'kuaishou-btn-primary' 
                : 'kuaishou-btn-secondary'
            }`}
          >
            {inputMode === 'voice' ? <Mic className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
            {inputMode === 'voice' 
              ? (currentLang === 'ba' ? "Ohùn" : "Vocal")
              : (currentLang === 'ba' ? "Ìkọ̀wé" : "Clavier")}
          </button>
          
          {/* Toggle vocal */}
          <button
            onClick={() => { setInputMode('voice'); triggerFeedback('click'); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl kuaishou-btn-secondary"
          >
            <Mic className="w-5 h-5" />
            {currentLang === 'ba' ? "Ohùn" : "Vocal"}
          </button>
        </div>
        
        {/* Word count badge */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="text-white/50 text-sm">
            {totalEntries > 0 ? `${totalEntries.toLocaleString()} mots` : 'Chargement...'}
          </span>
          {!isLoadingContrib && totalPoints > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-xs">
              {getLevel(totalPoints).emoji} {totalPoints} pts · {level}
            </span>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="px-3 sm:px-4 -mt-4 pb-8">
        {/* Zone d'entrée - updated styling */}
        <motion.div
          layout
          className="kuaishou-card p-4 mb-4"
        >
          {inputMode === 'voice' ? (
            /* Mode vocal */
            <div className="flex flex-col items-center py-6">
              <p className="text-tamtam-text-muted mb-4 text-center">
                {currentLang === 'ba' 
                  ? "Tẹ̀ bọ́tìn náà kí o sọ ɔ̀rɔ̀" 
                  : "Appuyez et dites un mot"}
              </p>
              
              <TamTamMicButton
                size="lg"
                onRecordingComplete={handleVoiceCommand}
                autoTranscribe={true}
                autoTranslate={false}
                sourceLang={searchDirection === 'ba-fr' ? 'ba' : 'fr'}
                disabled={isProcessing}
              />
              
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-center gap-2 text-tamtam-primary"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{currentLang === 'ba' ? "Ń wá..." : "Recherche..."}</span>
                </motion.div>
              )}
              
              {lastQuery && !isProcessing && (
                <p className="mt-4 text-sm text-tamtam-text-muted">
                  Recherche: "{lastQuery}"
                </p>
              )}
            </div>
          ) : (
            /* Mode clavier */
            <div>
              <p className="text-tamtam-text-muted mb-3 text-sm">
                {searchDirection === 'ba-fr'
                  ? (currentLang === 'ba' ? "Kọ ɔ̀rɔ̀ Bàátɔ̀nú" : "Tapez un mot bariba")
                  : (currentLang === 'ba' ? "Kọ ɔ̀rɔ̀ Fàránsé" : "Tapez un mot français")}
              </p>
              
              <BaribaKeyboardInput
                onSelectWord={handleSelectWord}
                placeholder={searchDirection === 'ba-fr' 
                  ? "Tapez un mot bariba..." 
                  : "Tapez un mot français..."}
                language={keyboardLang}
                onLanguageChange={handleKeyboardLangChange}
              />
            </div>
          )}
        </motion.div>

        {/* Bouton proposer un nouveau mot */}
        <div className="mb-4">
          <NewWordSubmission initialWord={notFoundWord} />
        </div>

        {/* Résultat sélectionné */}
        <AnimatePresence mode="wait">
          {selectedEntry && (
            <motion.div
              key={selectedEntry.word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4"
            >
              <VocalDictionaryResult 
                entry={selectedEntry} 
                onClose={handleCloseResult}
                showFeedback={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Historique */}
        {searchHistory.length > 0 && !selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-tamtam-surface rounded-3xl shadow-tamtam-soft p-4"
          >
            <h3 className="text-sm font-medium text-tamtam-text-muted mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              {currentLang === 'ba' ? "Àwọn ìwádìí tó ṣẹ̀ṣẹ̀" : "Recherches récentes"}
            </h3>
            
            <div className="space-y-2">
              {searchHistory.map((entry, index) => (
                <button
                  key={`${entry.word}-${index}`}
                  onClick={() => handleSelectWord(entry)}
                  className="w-full flex items-center gap-3 p-3 bg-tamtam-bg rounded-xl hover:bg-tamtam-primary/10 transition-colors"
                >
                  <span className="text-lg">📖</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-tamtam-text">{entry.word}</p>
                    <p className="text-sm text-tamtam-text-muted line-clamp-1">{entry.definition}</p>
                  </div>
                  <Volume2 className="w-4 h-4 text-tamtam-text-muted" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* État de chargement initial */}
        {isLoadingDict && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-tamtam-primary animate-spin mb-4" />
            <p className="text-tamtam-text-muted">
              {currentLang === 'ba' ? "Ń gbé gbɛ́-sɔ́ɔ̀rù..." : "Chargement du dictionnaire..."}
            </p>
          </div>
        )}
      </div>
    </KuaishouLayout>
  );
}
