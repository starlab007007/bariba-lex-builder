import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Volume2, Loader2, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { usePhoneticSuggestions, PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { BaribaKeyboardInput, SearchLanguage } from '@/components/tamtam/BaribaKeyboardInput';
import { VocalDictionaryResult } from '@/components/tamtam/VocalDictionaryResult';
import { VoiceLangPanel } from '@/components/tamtam/VoiceLangPanel';
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
  const [voiceLang, setVoiceLang] = useState<'ba' | 'fr'>('ba');
  const [panelSuccess, setPanelSuccess] = useState(false);
  const [panelError, setPanelError] = useState('');

  const handleVoiceCommand = async (result: {
    audioBase64: string;
    transcription?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setIsProcessing(true);
    setPanelSuccess(false);
    setPanelError('');
    triggerFeedback('send');
    
    try {
      let query = result.transcription?.toLowerCase().trim() || '';

      if (result.sourceLang === 'ba' && !query && result.audioBase64) {
        console.log('[TamTamDictionary] No transcription for Bariba audio → calling STT');
        const sttResult = await transcribeBariba(result.audioBase64, { robustMode: true, speakerType: 'Auto' });
        if (sttResult?.transcription) {
          query = sttResult.transcription.toLowerCase().trim();
          console.log('[TamTamDictionary] STT result:', query);
        } else {
          setPanelError(t('dict_transcription_failed'));
          return;
        }
      }

      setLastQuery(query);
      
      if (!query) {
        setPanelError(t('dict_no_word_detected'));
        return;
      }
      
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
        setPanelSuccess(true);
        triggerFeedback('success');
        const announcement = `${foundEntry.word}. ${t('dict_meaning')}: ${foundEntry.definition}`;
        await speakCurrentLang(announcement);
      } else {
        setNotFoundWord(query);
        setPanelSuccess(true);
        const notFoundMsg = currentLang === 'ba' 
          ? `${t('dict_word_not_found_msg')} "${query}"` 
          : `Mot "${query}" non trouvé`;
        await speakCurrentLang(notFoundMsg);
      }
    } catch (error) {
      console.error('[TamTamDictionary] Error:', error);
      triggerFeedback('error');
      setPanelError(t('dict_error_retry'));
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
      ? t('dict_voice_mode')
      : t('dict_keyboard_mode');
    speakCurrentLang(modeAnnounce);
  };

  const toggleDirection = () => {
    const newDir = searchDirection === 'ba-fr' ? 'fr-ba' : 'ba-fr';
    setSearchDirection(newDir);
    setKeyboardLang(newDir === 'ba-fr' ? 'ba' : 'fr');
    triggerFeedback('click');
    
    const dirAnnounce = newDir === 'ba-fr'
      ? t('dict_bariba_to_french')
      : t('dict_french_to_bariba');
    speakCurrentLang(dirAnnounce);
  };
  
  const handleCloseResult = () => {
    setSelectedEntry(null);
    setNotFoundWord('');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
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
              {t('dict_title')}
            </h1>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setInputMode('keyboard'); triggerFeedback('click'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              inputMode === 'keyboard'
                ? 'bg-white shadow-md text-gray-800'
                : 'bg-white/60 text-gray-500 hover:bg-white/80'
            }`}
          >
            <Keyboard className="w-5 h-5" />
            {t('dict_keyboard')}
          </button>

          <button
            onClick={() => { setInputMode('voice'); triggerFeedback('click'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              inputMode === 'voice'
                ? 'bg-white shadow-md text-gray-800'
                : 'bg-white/60 text-gray-500 hover:bg-white/80'
            }`}
          >
            <span className="text-lg">🎤</span>
            {t('dict_vocal')}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-gray-500 text-sm">
            {totalEntries > 0 ? `${totalEntries.toLocaleString()} ${t('dict_words')}` : t('dict_loading')}
          </span>
          {!isLoadingContrib && totalPoints > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white shadow-sm text-gray-600 text-xs">
              {getLevel(totalPoints).emoji} {totalPoints} {t('dict_pts')} · {level}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <motion.div layout className="bg-white rounded-3xl shadow-md p-4 mb-4">
          {inputMode === 'voice' ? (
            <VoiceLangPanel
              defaultLang={voiceLang}
              onResult={handleVoiceCommand}
              onLangChange={(l) => {
                setVoiceLang(l);
                setSearchDirection(l === 'ba' ? 'ba-fr' : 'fr-ba');
              }}
              isProcessingExternal={isProcessing || isSTTLoading}
              isWakingUp={isSTTWakingUp}
              lastTranscription={lastQuery || undefined}
              lastError={panelError || undefined}
              showSuccess={panelSuccess}
              onSpeakAgain={() => {
                setPanelSuccess(false);
                setPanelError('');
              }}
              uiLang={currentLang as 'ba' | 'fr'}
              disabled={false}
            />
          ) : (
            <div>
              <p className="text-gray-500 mb-3 text-sm">
                {searchDirection === 'ba-fr'
                  ? t('dict_type_bariba')
                  : t('dict_type_french')}
              </p>
              <BaribaKeyboardInput
                onSelectWord={handleSelectWord}
                placeholder={searchDirection === 'ba-fr'
                  ? t('dict_type_bariba_placeholder')
                  : t('dict_type_french_placeholder')}
                language={keyboardLang}
                onLanguageChange={handleKeyboardLangChange}
              />
            </div>
          )}
        </motion.div>

        <div className="mb-4">
          <NewWordSubmission initialWord={notFoundWord} />
        </div>

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

        {searchHistory.length > 0 && !selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-3xl shadow-md p-4"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t('dict_recent_searches')}
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

        {isLoadingDict && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-500">
              {t('dict_loading_dict')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
