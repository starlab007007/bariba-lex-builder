import { useState, useRef, useEffect } from 'react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Keyboard, 
  Camera, 
  ClipboardPaste, 
  FileText,
  ArrowLeftRight,
  Volume2,
  Copy,
  Trash2,
  Loader2,
  Send,
  Bot,
  Star,
  History,
  Search,
  X,
  Sparkles,
  MessageSquare,
  Globe
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartTranslator, InputMode } from '@/hooks/useSmartTranslator';
import { useLanguageDetection } from '@/hooks/useLanguageDetection';
import { useTranslationHistory, TranslationHistoryItem } from '@/hooks/useTranslationHistory';
import { PhotoTranslator } from '@/components/tamtam/PhotoTranslator';
import { VoiceLangPanel } from '@/components/tamtam/VoiceLangPanel';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { OfflineIndicator } from '@/components/tamtam/OfflineIndicator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface ChatMessage {
  id: string;
  type: 'user' | 'translator';
  sourceText: string;
  translatedText?: string;
  sourceLanguage: 'bariba' | 'french';
  targetLanguage: 'bariba' | 'french';
  inputMode: InputMode;
  timestamp: Date;
}

const inputModes: { id: InputMode; icon: React.ReactNode; label: string; color: string }[] = [
  { id: 'audio', icon: <Mic className="w-5 h-5" />, label: 'Voix', color: 'from-orange-500 to-red-500' },
  { id: 'text', icon: <Keyboard className="w-5 h-5" />, label: 'Texte', color: 'from-blue-500 to-indigo-500' },
  { id: 'photo', icon: <Camera className="w-5 h-5" />, label: 'Photo', color: 'from-purple-500 to-pink-500' },
  { id: 'paste', icon: <ClipboardPaste className="w-5 h-5" />, label: 'Coller', color: 'from-green-500 to-teal-500' },
  { id: 'scan', icon: <FileText className="w-5 h-5" />, label: 'Doc', color: 'from-amber-500 to-orange-500' },
];

export default function TamTamTranslator() {
  const location=useLocation();
  const navigate = useNavigate();
  const translator = useSmartTranslator();
  const { detectLanguage } = useLanguageDetection();
  const historyManager = useTranslationHistory();
  const { transcribe: transcribeBariba, isTranscribing: isSTTTranscribing, isWakingUp: isSTTWakingUp } = useBaribaSTT();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showHistory, setShowHistory] = useState(() => location.pathname.includes('/history'));
  const [historyTab, setHistoryTab] = useState<'recent' | 'favorites'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TranslationHistoryItem[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [conversationMode, setConversationMode] = useState(() => location.pathname.endsWith('/conversation') || !location.pathname.includes('/history'));
  const [detectedLang, setDetectedLang] = useState<'bariba' | 'french' | null>(null);
  const [baribaTranscribedText, setBaribaTranscribedText] = useState<string>('');
  const [voicePanelSuccess, setVoicePanelSuccess] = useState(false);
  const [voicePanelError, setVoicePanelError] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number>(() => window.visualViewport?.height ?? window.innerHeight);

  useEffect(()=>{
    const history=location.pathname.includes('/history');
    setShowHistory(history);
    if (location.pathname.endsWith('/conversation')) setConversationMode(true);
  },[location.pathname]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOpen(covered > 120);
      setViewportHeight(vv.height);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-detect language as user types
  useEffect(() => {
    if (autoDetectEnabled && textInput.length >= 3) {
      const result = detectLanguage(textInput);
      if (result.confidence > 0.6 && result.language !== 'unknown') {
        setDetectedLang(result.language);
        if (result.language !== translator.sourceLanguage) {
          translator.swapLanguages();
        }
      }
    }
  }, [textInput, autoDetectEnabled, detectLanguage]);

  // Add message to chat and history when translation completes
  useEffect(() => {
    if (translator.lastResult && translator.translatedText) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'translator',
        sourceText: translator.sourceText,
        translatedText: translator.translatedText,
        sourceLanguage: translator.sourceLanguage,
        targetLanguage: translator.targetLanguage,
        inputMode: translator.currentMode,
        timestamp: new Date()
      };
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.sourceText === newMessage.sourceText && lastMsg?.translatedText === newMessage.translatedText) {
          return prev;
        }
        return [...prev, newMessage];
      });

      const contextData = conversationMode ? {
        recentContext: historyManager.getRecentContext(3).map(h => ({
          source: h.source_text,
          translation: h.translated_text
        }))
      } : undefined;

      historyManager.addToHistory({
        source_text: translator.sourceText,
        translated_text: translator.translatedText,
        source_language: translator.sourceLanguage,
        target_language: translator.targetLanguage,
        input_mode: translator.currentMode,
        confidence_score: translator.lastResult.confidence,
        context_data: contextData
      });
    }
  }, [translator.lastResult, translator.translatedText]);

  const handleModeChange = (mode: InputMode) => {
    tamtamFeedback.play('click');
    translator.setCurrentMode(mode);
    setShowPhotoCapture(mode === 'photo');
    
    if (mode === 'text') {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleVoiceResult = async (result: {
    audioBase64: string;
    transcription?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setVoicePanelSuccess(false);
    setVoicePanelError('');

    if (result.sourceLang === 'ba' && result.audioBase64) {
      setBaribaTranscribedText('');
      const sttResult = await transcribeBariba(result.audioBase64, { robustMode: true, speakerType: 'Auto' });
      if (sttResult?.transcription) {
        setBaribaTranscribedText(sttResult.transcription);
        await translator.translateFromText(sttResult.transcription);
        setVoicePanelSuccess(true);
      } else {
        setVoicePanelError('Transcription échouée — réessayez');
        await translator.translateFromAudio(result.audioBase64);
      }
    } else if (result.sourceLang === 'fr') {
      if (result.transcription) {
        await translator.translateFromText(result.transcription);
        setVoicePanelSuccess(true);
      } else {
        setVoicePanelError('Aucun texte détecté — réessayez');
      }
    }
  };

  const handleTextSubmit = async () => {
    if (textInput.trim()) {
      if (autoDetectEnabled) {
        const result = detectLanguage(textInput);
        if (result.confidence > 0.6 && result.language !== 'unknown') {
          if (result.language !== translator.sourceLanguage) {
            translator.swapLanguages();
          }
        }
      }
      
      await translator.translateFromText(textInput);
      setTextInput('');
      setDetectedLang(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const handlePhotoCapture = async (imageBase64: string) => {
    setShowPhotoCapture(false);
    await translator.translateFromImage(imageBase64);
  };

  const handlePaste = async () => {
    await translator.translateFromClipboard();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await translator.translateFromDocument(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearChat = () => {
    tamtamFeedback.play('click');
    setMessages([]);
    translator.reset();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await historyManager.searchHistory(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleHistoryItemClick = (item: TranslationHistoryItem) => {
    setTextInput(item.source_text);
    setShowHistory(false); if(location.pathname.includes('/history')) navigate('/translator');
    tamtamFeedback.play('click');
  };

  const speakText = async (text: string, lang: 'bariba' | 'french') => {
    tamtamFeedback.play('click');
    if (lang === 'bariba') {
      translator.speakSource();
    } else {
      translator.speakTranslation();
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      tamtamFeedback.play('success');
    } catch (error) {
      tamtamFeedback.play('error');
    }
  };

  // Language badge component — light theme
  const LanguageBadge = ({ lang, size = 'sm', detected = false }: { lang: 'bariba' | 'french'; size?: 'sm' | 'lg'; detected?: boolean }) => (
    <span className={`inline-flex items-center gap-1 ${
      size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'
    } rounded-full font-medium ${
      lang === 'bariba' 
        ? 'bg-[#F3E3B9] text-[#9C6B1D] border border-[#E7D29B]' 
        : 'bg-white text-[#241F2E] border border-[#E4DFCC]'
    } ${detected ? 'ring-2 ring-[#3F6E52]/40 ring-offset-1 ring-offset-transparent' : ''}`}>
      <span>{lang === 'bariba' ? '🇧🇯' : '🇫🇷'}</span>
      <span>{lang === 'bariba' ? 'Bàátɔ̀nú' : 'Français'}</span>
      {detected && <Sparkles className="w-3 h-3 text-[#3F6E52]" />}
    </span>
  );

  // History panel — light theme
  const HistoryPanel = () => (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-[#F7F5EC] shadow-xl z-50 flex flex-col border-l border-[#E4DFCC]"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-[#241F2E] flex items-center gap-2">
          <History className="w-5 h-5" />
          Historique
        </h2>
        <button onClick={() => { setShowHistory(false); if (location.pathname.includes('/history')) navigate('/translator'); }} className="p-2 rounded-full hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8571]" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 bg-white border-gray-200 text-[#241F2E] placeholder:text-[#8C8571]"
          />
        </div>
      </div>

      <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as 'recent' | 'favorites')} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 bg-gray-100">
          <TabsTrigger value="recent" className="flex-1 data-[state=active]:bg-white text-gray-500 data-[state=active]:text-[#241F2E]">
            <History className="w-4 h-4 mr-1" />
            Récent
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1 data-[state=active]:bg-white text-gray-500 data-[state=active]:text-[#241F2E]">
            <Star className="w-4 h-4 mr-1" />
            Favoris
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="flex-1 overflow-y-auto p-4 space-y-2">
          {(searchQuery ? searchResults : historyManager.history).map(item => (
            <HistoryCard key={item.id} item={item} />
          ))}
          {historyManager.history.length === 0 && (
            <p className="text-center text-[#8C8571] py-8">Aucun historique</p>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 overflow-y-auto p-4 space-y-2">
          {historyManager.favorites.map(item => (
            <HistoryCard key={item.id} item={item} />
          ))}
          {historyManager.favorites.length === 0 && (
            <p className="text-center text-[#8C8571] py-8">Aucun favori</p>
          )}
        </TabsContent>
      </Tabs>

      {historyManager.history.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            className="w-full border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={historyManager.clearHistory}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Effacer tout l'historique
          </Button>
        </div>
      )}
    </motion.div>
  );

  // History card component — light theme
  const HistoryCard = ({ item }: { item: TranslationHistoryItem }) => (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => handleHistoryItemClick(item)}
      className="p-3 rounded-xl bg-white border border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <LanguageBadge lang={item.source_language as 'bariba' | 'french'} />
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              historyManager.toggleFavorite(item.id, !item.is_favorite);
            }}
            className={`p-1 rounded-full ${item.is_favorite ? 'text-yellow-500' : 'text-gray-300'}`}
          >
            <Star className="w-4 h-4" fill={item.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              historyManager.deleteFromHistory(item.id);
            }}
            className="p-1 rounded-full text-gray-300 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 truncate">{item.source_text}</p>
      <div className="flex items-center gap-1 my-1">
        <ArrowLeftRight className="w-3 h-3 text-[#8C8571]" />
      </div>
      <p className="text-sm font-medium text-[#241F2E] truncate">{item.translated_text}</p>
      <p className="text-xs text-[#8C8571] mt-1">
        {new Date(item.created_at).toLocaleDateString()}
      </p>
    </motion.div>
  );

  return (
    <div
      className="mx-auto min-h-0 w-full max-w-[960px] bg-[#F7F5EC] text-[#241F2E] flex flex-col overflow-hidden"
      style={{ height: viewportHeight ? `${Math.floor(viewportHeight)}px` : '100dvh', maxHeight: '100dvh' }}
    >
      {!keyboardOpen && <FitilaPageHeader title="Traducteur" subtitle="Français ⇄ Bàátɔ̀nú" />}

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Sub-header with language toggle */}
        <div className={keyboardOpen ? "mx-2 mt-1 px-2.5 py-2 rounded-[18px] border border-[#E4DFCC] bg-white shrink-0" : "mx-3 sm:mx-[18px] mt-2 px-3 sm:px-4 py-2.5 rounded-[22px] border border-[#E4DFCC] bg-white shrink-0"}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <OfflineIndicator />
              {autoDetectEnabled && (
                <span className="flex items-center gap-1 text-[#3F6E52] text-xs font-extrabold">
                  <Sparkles className="w-3 h-3" />
                  Auto
                </span>
              )}
            </div>
            
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                onClick={() => { setShowHistory(true); navigate('/translator/history'); }}
                className="p-2 rounded-[12px] bg-white border border-[#E4DFCC] hover:bg-[#F1EDDF] transition-colors"
              >
                <History className="w-5 h-5 text-[#241F2E]" />
              </button>
              
              <div className="flex items-center gap-1">
                <LanguageBadge 
                  lang={translator.sourceLanguage} 
                  size="sm" 
                  detected={detectedLang === translator.sourceLanguage}
                />
                <motion.button
                  whileTap={{ scale: 0.9, rotate: 180 }}
                  onClick={() => {
                    translator.swapLanguages();
                    setDetectedLang(null);
                  }}
                  className="w-9 h-9 bg-white border border-[#E4DFCC] rounded-[12px] flex items-center justify-center"
                >
                  <ArrowLeftRight className="w-4 h-4 text-[#241F2E]" />
                </motion.button>
                <LanguageBadge lang={translator.targetLanguage} size="sm" />
              </div>
            </div>
          </div>

          {/* Settings toggles */}
          {!keyboardOpen && <div className="flex items-center gap-3 mt-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDetectEnabled}
                onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#C99530]"
              />
              <Sparkles className="w-3 h-3 text-[#3F6E52]" />
              <span className="text-[#8C8571]">Auto</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={conversationMode}
                onChange={(e) => setConversationMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#C99530]"
              />
              <MessageSquare className="w-3 h-3 text-[#9C6B1D]" />
              <span className="text-[#8C8571]">Conversation</span>
            </label>
          </div>}
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-[18px] py-2 sm:py-3 space-y-3">
          {/* Welcome message */}
          {messages.length === 0 && !translator.isProcessing && !keyboardOpen && viewportHeight >= 640 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-3 sm:py-5"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3E3B9] text-[#9C6B1D]"
              >
                <Globe className="h-5 w-5" />
              </motion.div>
              <h2 className="text-lg font-black text-[#241F2E] mb-1">Traduisez simplement</h2>
              <p className="text-[#8C8571] text-sm">Français ⇄ Bàátɔ̀nú · détection automatique</p>

            </motion.div>
          )}

          {/* Chat messages */}
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >
                {/* User message (source) */}
                <div className="flex justify-end">
                  <div className={`max-w-[85%] rounded-[18px] rounded-tr-sm p-3 ${
                    msg.sourceLanguage === 'bariba' 
                      ? 'bg-[#FFF6E6] border border-[#F0D9A8]' 
                      : 'bg-white border border-[#E4DFCC]'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <LanguageBadge lang={msg.sourceLanguage} size="sm" />
                    </div>
                    <p className="text-[#241F2E]">{msg.sourceText}</p>
                    <div className="flex items-center gap-1 mt-2 justify-end">
                      <button
                        onClick={() => speakText(msg.sourceText, msg.sourceLanguage)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#8C8571]" />
                      </button>
                      <button
                        onClick={() => copyText(msg.sourceText)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#8C8571]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Translator message (translation) */}
                {msg.translatedText && (
                  <div className="flex justify-start">
                    <div className={`max-w-[85%] rounded-[18px] rounded-tl-sm p-3 ${
                      msg.targetLanguage === 'bariba' 
                        ? 'bg-white border border-[#C99530]' 
                        : 'bg-white border border-[#E4DFCC]'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-4 h-4 text-[#6758C9]" />
                        <LanguageBadge lang={msg.targetLanguage} size="sm" />
                      </div>
                      <p className="text-lg font-medium text-[#241F2E]">{msg.translatedText}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => speakText(msg.translatedText!, msg.targetLanguage)}
                          className={`p-1.5 rounded-full ${
                            'bg-[#F3E3B9] text-[#9C6B1D]'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyText(msg.translatedText!)}
                          className="p-1.5 rounded-full bg-[#F1EDDF] text-[#241F2E]"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Processing indicator */}
          {translator.isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4"
            >
              <div className="w-10 h-10 bg-[#ECE8FA] rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-[#6758C9]" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E4DFCC] rounded-[18px]">
                <Loader2 className="w-4 h-4 animate-spin text-[#C99530]" />
                <span className="text-sm text-[#8C8571]">Traduction en cours...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Photo capture overlay */}
        <AnimatePresence>
          {showPhotoCapture && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90"
            >
              <div className="h-full">
                <PhotoTranslator
                  onCapture={handlePhotoCapture}
                  isProcessing={translator.isProcessing}
                />
                <button
                  onClick={() => setShowPhotoCapture(false)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History panel */}
        <AnimatePresence>
          {showHistory && <HistoryPanel />}
        </AnimatePresence>

        {/* Input Area */}
        <div
          className={keyboardOpen
            ? "sticky bottom-0 flex-shrink-0 px-2 pt-1 pb-1 bg-[#F7F5EC]/98 z-50 border-t border-[#E4DFCC] shadow-[0_-8px_24px_rgba(36,31,46,0.06)] backdrop-blur"
            : "sticky bottom-0 flex-shrink-0 px-3 sm:px-[18px] pt-2 pb-2 bg-[#F7F5EC]/98 z-50 border-t border-[#E4DFCC] shadow-[0_-8px_24px_rgba(36,31,46,0.06)] backdrop-blur"
          }
          style={{ paddingBottom: keyboardOpen ? '4px' : 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {/* Clear button */}
          {messages.length > 0 && !keyboardOpen && (
            <div className="flex justify-center mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-[#8C8571] hover:text-[#B54E33] hover:bg-[#F4DED2]"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Effacer
              </Button>
            </div>
          )}

          <div className={"mb-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none " + (keyboardOpen || viewportHeight < 700 ? "justify-start" : "justify-center")}>
            {inputModes.map((mode) => (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleModeChange(mode.id)}
                aria-label={mode.label}
                className={(keyboardOpen || viewportHeight < 700 ? "h-9 min-w-[48px] px-2 " : "h-10 min-w-[54px] px-2.5 ") + "rounded-[13px] flex items-center justify-center gap-1 transition-all shrink-0 touch-manipulation " + (
                  translator.currentMode === mode.id
                    ? 'bg-[#4B6BDF] text-white shadow-sm'
                    : 'bg-white text-[#716B5F] border border-[#E4DFCC]'
                )}
              >
                {mode.icon}
                {!keyboardOpen && viewportHeight >= 620 && <span className="text-[10px] font-extrabold">{mode.label}</span>}
              </motion.button>
            ))}
          </div>

          {/* Dynamic input based on mode */}
          <AnimatePresence mode="wait">
            {translator.currentMode === 'audio' && (
              <motion.div
                key="audio-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <VoiceLangPanel
                  defaultLang={translator.sourceLanguage === 'bariba' ? 'ba' : 'fr'}
                  onResult={handleVoiceResult}
                  onLangChange={(l) => {
                    const tLang = l === 'ba' ? 'bariba' : 'french';
                    if (tLang !== translator.sourceLanguage) {
                      translator.swapLanguages();
                    }
                  }}
                  isProcessingExternal={translator.isProcessing || isSTTTranscribing}
                  isWakingUp={isSTTWakingUp}
                  lastTranscription={baribaTranscribedText || undefined}
                  lastError={voicePanelError || undefined}
                  showSuccess={voicePanelSuccess}
                  onSpeakAgain={() => {
                    setVoicePanelSuccess(false);
                    setVoicePanelError('');
                    setBaribaTranscribedText('');
                  }}
                  disabled={translator.isProcessing}
                  uiLang="fr"
                />
              </motion.div>
            )}

            {translator.currentMode === 'text' && (
              <motion.div
                key="text-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {detectedLang && (
                  <div className="flex justify-center mb-2">
                    <span className="text-xs text-[#3F6E52] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Détecté: {detectedLang === 'bariba' ? '🇧🇯 Bariba' : '🇫🇷 Français'}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setKeyboardOpen(true)}
                    onBlur={() => window.setTimeout(() => {
                      const vv = window.visualViewport;
                      if (!vv || window.innerHeight - vv.height - vv.offsetTop < 120) setKeyboardOpen(false);
                    }, 120)}
                    placeholder={translator.sourceLanguage === 'bariba' ? 'Écrivez en Bàátɔ̀nú…' : 'Écrivez en français…'}
                    className="flex-1 min-h-[52px] max-h-[104px] text-[16px] rounded-[18px] border-2 border-[#C99530] bg-white text-[#241F2E] placeholder:text-[#9A927F] focus:border-[#A87317] focus:ring-2 focus:ring-[#C99530]/15 resize-none shadow-sm"
                    rows={keyboardOpen ? 2 : 1}
                  />
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || translator.isProcessing}
                    className="h-[52px] w-[52px] shrink-0 p-0 bg-[#C99530] hover:bg-[#B98626] text-[#2B2110] rounded-[16px] shadow-sm touch-manipulation"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {translator.currentMode === 'photo' && (
              <motion.div
                key="photo-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center"
              >
                <Button
                  onClick={() => setShowPhotoCapture(true)}
                  disabled={translator.isProcessing}
                  className="h-[52px] w-full bg-[#C99530] hover:bg-[#B98626] text-[#2B2110] rounded-full text-[15px] font-extrabold"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  Photographier
                </Button>
              </motion.div>
            )}

            {translator.currentMode === 'paste' && (
              <motion.div
                key="paste-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center"
              >
                <Button
                  onClick={handlePaste}
                  disabled={translator.isProcessing}
                  className="h-[52px] w-full bg-[#C99530] hover:bg-[#B98626] text-[#2B2110] rounded-full text-[15px] font-extrabold"
                >
                  <ClipboardPaste className="w-6 h-6 mr-2" />
                  Coller et traduire
                </Button>
              </motion.div>
            )}

            {translator.currentMode === 'scan' && (
              <motion.div
                key="scan-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-center"
              >
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={translator.isProcessing}
                  className="h-[52px] w-full bg-[#C99530] hover:bg-[#B98626] text-[#2B2110] rounded-full text-[15px] font-extrabold"
                >
                  <FileText className="w-6 h-6 mr-2" />
                  Importer document
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </motion.div>
            )}
          </AnimatePresence>


        </div>
      </div>
    </div>
  );
}
