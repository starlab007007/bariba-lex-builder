import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Mic, Volume2, Loader2, Search, BookOpen } from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { SIG } from '@/components/fitila/signatureTheme';
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
  const [routeParams,setRouteParams]=useSearchParams();
  const navigate = useNavigate();
  const { t, currentLang } = useTamTamLanguage();
  const { speakCurrentLang, isSpeaking } = useUnifiedAudio();
  const { getSuggestions, searchInDefinitions, findExactMatch, isLoading: isLoadingDict, totalEntries } = usePhoneticSuggestions();
  const { totalPoints, level, submissionCount, isLoading: isLoadingContrib } = useContributionPoints();
  const { transcribe: transcribeBariba, isTranscribing: isSTTLoading, isWakingUp: isSTTWakingUp } = useBaribaSTT();
  
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');
  const [searchDirection, setSearchDirection] = useState<SearchDirection>(() => routeParams.get('direction')==='fr-ba' ? 'fr-ba' : 'ba-fr');
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

  useEffect(()=>{
    const wanted=routeParams.get('direction')==='fr-ba'?'fr-ba':'ba-fr';
    if(wanted!==searchDirection) setSearchDirection(wanted as SearchDirection);
  },[routeParams]);
  useEffect(()=>{
    const current=routeParams.get('direction')==='fr-ba'?'fr-ba':'ba-fr';
    if(current!==searchDirection){ const next=new URLSearchParams(routeParams); next.set('direction',searchDirection); setRouteParams(next,{replace:true}); }
  },[searchDirection]);

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

  const segClass = (active: boolean) =>
    `flex-1 flex h-[46px] items-center justify-center gap-2 rounded-[16px] border text-[14px] font-extrabold transition-colors ${
      active ? 'bg-white text-[#241F2E] border-[#C99530]' : 'bg-[#FBF9F2] text-[#8C8571] border-[#E4DFCC]'
    }`;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: SIG.appBackground, color: SIG.ink }}>
      <FitilaPageHeader title={t('dict_title')} subtitle="Recherche Bàátɔ̀nú ↔ Français, clavier et recherche vocale" />
      <div className="flex-shrink-0 z-40 px-[18px] pt-[30px] pb-2">
        <div className="flex gap-[10px]">
          <button onClick={() => { setInputMode('keyboard'); triggerFeedback('click'); }} className={segClass(inputMode === 'keyboard')}>
            <Keyboard className="w-[18px] h-[18px]" style={{ color: inputMode === 'keyboard' ? SIG.goldDeep : SIG.muted }} />
            {t('dict_keyboard')}
          </button>
          <button onClick={() => { setInputMode('voice'); triggerFeedback('click'); }} className={segClass(inputMode === 'voice')}>
            <Mic className="w-[18px] h-[18px]" style={{ color: inputMode === 'voice' ? SIG.goldDeep : SIG.muted }} />
            {t('dict_vocal')}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <span className="text-[12px] font-extrabold" style={{ color: SIG.muted }}>
            {totalEntries > 0 ? `${totalEntries.toLocaleString('fr-FR')} ${t('dict_words')}` : t('dict_loading')}
          </span>
          {!isLoadingContrib && totalPoints > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border text-[11px]" style={{ borderColor: SIG.hairline, color: SIG.muted }}>
              {getLevel(totalPoints).emoji} {totalPoints} {t('dict_pts')} · {level}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-[18px] pb-8">
        <motion.div layout className="bg-white rounded-[24px] border p-4 mb-[14px]" style={{ borderColor: SIG.hairline }}>
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
              <p className="mb-3 text-[13px]" style={{ color: SIG.muted }}>
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
            className="bg-white rounded-[24px] border p-4" style={{ borderColor: SIG.hairline }}
          >
            <h3 className="text-[13px] font-extrabold mb-3 text-[#8C8571] flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t('dict_recent_searches')}
            </h3>
            
            <div className="space-y-2">
              {searchHistory.map((entry, index) => (
                <button
                  key={`${entry.word}-${index}`}
                  onClick={() => handleSelectWord(entry)}
                  className="w-full flex items-center gap-3 p-3 bg-[#F7F5EC] rounded-[14px] hover:bg-[#F3E3B9]/50 transition-colors"
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

        {!selectedEntry && searchHistory.length === 0 && !isLoadingDict && (
          <div className="flex flex-col items-center pt-6 text-center">
            <BookOpen className="h-[44px] w-[44px]" style={{ color: '#B9B5A8' }} strokeWidth={1.6} />
            <h2 className="mt-4 text-[18px] font-extrabold" style={{ color: SIG.inkSoft }}>Cherchez un mot</h2>
            <p className="mt-2 max-w-[340px] text-left text-[14px] leading-[1.45]" style={{ color: SIG.inkSoft }}>
              Le dictionnaire embarqué reprend le parcours du site FITILA avec recherche et fiche détaillée.
            </p>
          </div>
        )}

        {isLoadingDict && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#C99530] animate-spin mb-4" />
            <p className="text-gray-500">
              {t('dict_loading_dict')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
