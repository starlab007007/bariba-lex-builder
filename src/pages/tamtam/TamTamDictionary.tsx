import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Keyboard, Volume2, Loader2, Search, BookOpen, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { BaribaKeyboardInput, SearchLanguage } from '@/components/tamtam/BaribaKeyboardInput';
import { VocalDictionaryResult } from '@/components/tamtam/VocalDictionaryResult';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { NewWordSubmission } from '@/components/tamtam/NewWordSubmission';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { useContributionPoints, getLevel } from '@/hooks/useContributionPoints';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';

type InputMode = 'voice' | 'keyboard';
type SearchDirection = 'ba-fr' | 'fr-ba';

export default function TamTamDictionary() {
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang, isSpeaking } = useUnifiedAudio();
  const { getSuggestions, searchInDefinitions, findExactMatch, isLoading: isLoadingDict, totalEntries } = usePhoneticSuggestions();
  const { totalPoints, level, submissionCount, isLoading: isLoadingContrib } = useContributionPoints();
  const { transcribe: transcribeBariba, isTranscribing: isSTTLoading, isWakingUp: isSTTWakingUp } = useBaribaSTT();
  
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');
  const [searchDirection, setSearchDirection] = useState<SearchDirection>('ba-fr');
  const [keyboardLang, setKeyboardLang] = useState<SearchLanguage>('ba');
  const [selectedEntry, setSelectedEntry] = useState<PhoneticEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState<PhoneticEntry[]>([]);
  const [notFoundWord, setNotFoundWord] = useState<string>('');
  const [sttStatusMsg, setSttStatusMsg] = useState<string>('');

  // Gestion de la commande vocale avec transcription Bariba directe
  const handleVoiceCommand = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setIsProcessing(true);
    setSttStatusMsg('');
    triggerFeedback('send');
    
    try {
      let query = result.transcription?.toLowerCase().trim() || '';

      // Si Bariba et pas de transcription → appel STT direct
      if (result.sourceLang === 'ba' && !query && result.audioBase64) {
        setSttStatusMsg(isSTTWakingUp ? '⏳ Réveil du service Bariba...' : '🎤 Transcription Bariba en cours...');
        console.log('[TamTamDictionary] No transcription for Bariba audio → calling STT');
        const sttResult = await transcribeBariba(result.audioBase64, { robustMode: true, speakerType: 'Auto' });
        if (sttResult?.transcription) {
          query = sttResult.transcription.toLowerCase().trim();
          setSttStatusMsg(`✅ Transcrit : "${sttResult.transcription}"`);
          console.log('[TamTamDictionary] STT result:', query);
        } else {
          setSttStatusMsg('❌ Transcription échouée - réessayez');
        }
      }

      setLastQuery(query);
      
      if (!query) {
        const errorMsg = currentLang === 'ba' ? "Kò gbọ́ ɔ̀rɔ̀ kan" : "Aucun mot détecté - parlez en Bariba";
        await speakCurrentLang(errorMsg);
        return;
      }
      
      console.log('[TamTamDictionary] Voice query:', query, 'Lang:', result.sourceLang);
      
      let foundEntry: PhoneticEntry | null = null;
      
      if (result.sourceLang === 'ba') {
        foundEntry = findExactMatch(query);
        if (!foundEntry) {
          const suggestions = getSuggestions(query, 1);
          foundEntry = suggestions[0] || null;
        }
      } else {
        const results = searchInDefinitions(query, 1);
        foundEntry = results[0] || null;
      }
      
      if (foundEntry) {
        setSelectedEntry(foundEntry);
        addToHistory(foundEntry);
        triggerFeedback('success');
        setSttStatusMsg('');
        
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
      setSttStatusMsg('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectWord = async (entry: PhoneticEntry) => {
    setSelectedEntry(entry);
    setNotFoundWord('');
    addToHistory(entry);
    triggerFeedback('success');
    await speakCurrentLang(entry.definition);
  };
  
  const handleKeyboardLangChange = (lang: SearchLanguage) => {
    setKeyboardLang(lang);
    setSearchDirection(lang === 'ba' ? 'ba-fr' : 'fr-ba');
  };

  const addToHistory = (entry: PhoneticEntry) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(e => e.word !== entry.word);
      return [entry, ...filtered].slice(0, 5);
    });
  };

  const toggleInputMode = () => {
    const newMode = inputMode === 'voice' ? 'keyboard' : 'voice';
    setInputMode(newMode);
    triggerFeedback('click');
    
    const modeAnnounce = newMode === 'voice' 
      ? (currentLang === 'ba' ? "Ètò ohùn" : "Mode vocal")
      : (currentLang === 'ba' ? "Ètò ìkọ̀wé" : "Mode clavier");
    speakCurrentLang(modeAnnounce);
  };

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
  
  const handleCloseResult = () => {
    setSelectedEntry(null);
    setNotFoundWord('');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Header + toggles fixes */}
      <div className="flex-shrink-0 z-40 px-4 pt-4 pb-2 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h1 className="text-xl font-bold text-gray-800">
              {currentLang === 'ba' ? 'Gbɛ́-sɔ́ɔ̀rù' : 'Dictionnaire'}
            </h1>
          </div>
        </div>

        {/* Toggles mode */}
        <div className="flex gap-2">
          <button
            onClick={toggleInputMode}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              inputMode === 'keyboard' 
                ? 'bg-white shadow-md text-gray-800' 
                : 'bg-white/60 text-gray-500 hover:bg-white/80'
            }`}
          >
            <Keyboard className="w-5 h-5" />
            {currentLang === 'ba' ? "Ìkọ̀wé" : "Clavier"}
          </button>
          
          <button
            onClick={() => { setInputMode('voice'); triggerFeedback('click'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              inputMode === 'voice' 
                ? 'bg-white shadow-md text-gray-800' 
                : 'bg-white/60 text-gray-500 hover:bg-white/80'
            }`}
          >
            <Mic className="w-5 h-5" />
            {currentLang === 'ba' ? "Ohùn" : "Vocal"}
          </button>
        </div>
        
        {/* Word count badge */}
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-gray-500 text-sm">
            {totalEntries > 0 ? `${totalEntries.toLocaleString()} mots` : 'Chargement...'}
          </span>
          {!isLoadingContrib && totalPoints > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white shadow-sm text-gray-600 text-xs">
              {getLevel(totalPoints).emoji} {totalPoints} pts · {level}
            </span>
          )}
        </div>
      </div>

      {/* Contenu principal scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Zone d'entrée */}
        <motion.div
          layout
          className="bg-white rounded-3xl shadow-md p-4 mb-4"
        >
          {inputMode === 'voice' ? (
            <div className="flex flex-col items-center py-6">
              <p className="text-gray-500 mb-4 text-center">
                {currentLang === 'ba' 
                  ? "Tẹ̀ bọ́tìn náà kí o sọ ɔ̀rɔ̀" 
                  : "Appuyez et dites un mot"}
              </p>
              
              <TamTamMicButton
                size="lg"
                onRecordingComplete={handleVoiceCommand}
                autoTranscribe={false}
                autoTranslate={false}
                sourceLang={searchDirection === 'ba-fr' ? 'ba' : 'fr'}
                disabled={isProcessing}
              />
              
              {/* Indicateur STT Bariba */}
              <AnimatePresence>
                {(isProcessing || isSTTLoading) && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 flex flex-col items-center gap-2"
                  >
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">
                        {isSTTWakingUp
                          ? '⏳ Réveil du service Bariba...'
                          : isSTTLoading
                          ? '🎤 Transcription Bariba en cours...'
                          : (currentLang === 'ba' ? "Ń wá..." : "Recherche...")}
                      </span>
                    </div>
                    {isSTTWakingUp && (
                      <p className="text-xs text-muted-foreground text-center">
                        Première utilisation (~30s) - patientez
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Statut STT après transcription */}
              <AnimatePresence>
                {sttStatusMsg && !isProcessing && !isSTTLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 px-3 py-2 bg-indigo-50 rounded-xl text-sm text-indigo-700 text-center"
                  >
                    {sttStatusMsg}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {lastQuery && !isProcessing && !isSTTLoading && (
                <p className="mt-4 text-sm text-gray-500">
                  Recherche: "{lastQuery}"
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-3 text-sm">
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
            className="bg-white rounded-3xl shadow-md p-4"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              {currentLang === 'ba' ? "Àwọn ìwádìí tó ṣẹ̀ṣẹ̀" : "Recherches récentes"}
            </h3>
            
            <div className="space-y-2">
              {searchHistory.map((entry, index) => (
                <button
                  key={`${entry.word}-${index}`}
                  onClick={() => handleSelectWord(entry)}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  <span className="text-lg">📖</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-800">{entry.word}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{entry.definition}</p>
                  </div>
                  <Volume2 className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* État de chargement initial */}
        {isLoadingDict && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-500">
              {currentLang === 'ba' ? "Ń gbé gbɛ́-sɔ́ɔ̀rù..." : "Chargement du dictionnaire..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
