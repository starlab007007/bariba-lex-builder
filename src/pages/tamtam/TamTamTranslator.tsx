import { useState, useRef, useEffect } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { useSmartTranslator, InputMode } from '@/hooks/useSmartTranslator';
import { useLanguageDetection } from '@/hooks/useLanguageDetection';
import { useTranslationHistory, TranslationHistoryItem } from '@/hooks/useTranslationHistory';
import { PhotoTranslator } from '@/components/tamtam/PhotoTranslator';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { OfflineIndicator } from '@/components/tamtam/OfflineIndicator';
import { KuaishouLayout } from '@/components/tamtam/KuaishouLayout';
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
  const translator = useSmartTranslator();
  const { detectLanguage } = useLanguageDetection();
  const historyManager = useTranslationHistory();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'recent' | 'favorites'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TranslationHistoryItem[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [conversationMode, setConversationMode] = useState(true);
  const [detectedLang, setDetectedLang] = useState<'bariba' | 'french' | null>(null);
  
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
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    if (result.sourceLang === 'ba' && result.audioBase64) {
      await translator.translateFromAudio(result.audioBase64);
    } else if (result.sourceLang === 'fr') {
      if (result.transcription) {
        await translator.translateFromText(result.transcription);
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
    setShowHistory(false);
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

  // Language badge component
  const LanguageBadge = ({ lang, size = 'sm', detected = false }: { lang: 'bariba' | 'french'; size?: 'sm' | 'lg'; detected?: boolean }) => (
    <span className={`inline-flex items-center gap-1 ${
      size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'
    } rounded-full font-medium ${
      lang === 'bariba' 
        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    } ${detected ? 'ring-2 ring-green-400/50 ring-offset-1 ring-offset-transparent' : ''}`}>
      <span>{lang === 'bariba' ? '🇧🇯' : '🇫🇷'}</span>
      <span>{lang === 'bariba' ? 'Bariba' : 'Français'}</span>
      {detected && <Sparkles className="w-3 h-3 text-green-400" />}
    </span>
  );

  // History panel with Kuaishou styling
  const HistoryPanel = () => (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-y-0 right-0 w-full max-w-md kuaishou-bg shadow-xl z-50 flex flex-col border-l border-white/10"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10 kuaishou-header">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5" />
          Historique
        </h2>
        <button onClick={() => setShowHistory(false)} className="p-2 rounded-full hover:bg-white/10">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as 'recent' | 'favorites')} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 bg-white/5">
          <TabsTrigger value="recent" className="flex-1 data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white">
            <History className="w-4 h-4 mr-1" />
            Récent
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex-1 data-[state=active]:bg-white/10 text-white/70 data-[state=active]:text-white">
            <Star className="w-4 h-4 mr-1" />
            Favoris
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="flex-1 overflow-y-auto p-4 space-y-2">
          {(searchQuery ? searchResults : historyManager.history).map(item => (
            <HistoryCard key={item.id} item={item} />
          ))}
          {historyManager.history.length === 0 && (
            <p className="text-center text-white/40 py-8">Aucun historique</p>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 overflow-y-auto p-4 space-y-2">
          {historyManager.favorites.map(item => (
            <HistoryCard key={item.id} item={item} />
          ))}
          {historyManager.favorites.length === 0 && (
            <p className="text-center text-white/40 py-8">Aucun favori</p>
          )}
        </TabsContent>
      </Tabs>

      {historyManager.history.length > 0 && (
        <div className="p-4 border-t border-white/10">
          <Button 
            variant="outline" 
            className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={historyManager.clearHistory}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Effacer tout l'historique
          </Button>
        </div>
      )}
    </motion.div>
  );

  // History card component with Kuaishou styling
  const HistoryCard = ({ item }: { item: TranslationHistoryItem }) => (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => handleHistoryItemClick(item)}
      className="p-3 rounded-xl kuaishou-card cursor-pointer transition-colors hover:bg-white/10"
    >
      <div className="flex items-start justify-between mb-2">
        <LanguageBadge lang={item.source_language as 'bariba' | 'french'} />
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              historyManager.toggleFavorite(item.id, !item.is_favorite);
            }}
            className={`p-1 rounded-full ${item.is_favorite ? 'text-yellow-400' : 'text-white/30'}`}
          >
            <Star className="w-4 h-4" fill={item.is_favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              historyManager.deleteFromHistory(item.id);
            }}
            className="p-1 rounded-full text-white/30 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-white/60 truncate">{item.source_text}</p>
      <div className="flex items-center gap-1 my-1">
        <ArrowLeftRight className="w-3 h-3 text-white/40" />
      </div>
      <p className="text-sm font-medium text-white truncate">{item.translated_text}</p>
      <p className="text-xs text-white/40 mt-1">
        {new Date(item.created_at).toLocaleDateString()}
      </p>
    </motion.div>
  );

  return (
    <KuaishouLayout
      titleFr="Traducteur IA"
      titleBa="Gbɛ́-sɔ́rɔ̀"
      emoji="🌐"
      showBack={true}
      showMenu={true}
      showNav={true}
    >
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Sub-header with language toggle */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <OfflineIndicator />
              {autoDetectEnabled && (
                <span className="flex items-center gap-1 text-green-400 text-xs">
                  <Sparkles className="w-3 h-3" />
                  Auto
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <History className="w-5 h-5 text-white/70" />
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
                  className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <ArrowLeftRight className="w-4 h-4 text-white" />
                </motion.button>
                <LanguageBadge lang={translator.targetLanguage} size="sm" />
              </div>
            </div>
          </div>

          {/* Settings toggles */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDetectEnabled}
                onChange={(e) => setAutoDetectEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-orange-500"
              />
              <Sparkles className="w-3 h-3 text-green-400" />
              <span className="text-white/60">Détection auto</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={conversationMode}
                onChange={(e) => setConversationMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-orange-500"
              />
              <MessageSquare className="w-3 h-3 text-purple-400" />
              <span className="text-white/60">Mode conversation</span>
            </label>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && !translator.isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-4"
              >
                🌐
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">
                Bienvenue! 👋
              </h2>
              <p className="text-white/60 mb-2">
                Je traduis entre Français et Bariba
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs flex items-center gap-1 border border-green-500/30">
                  <Sparkles className="w-3 h-3" />
                  Détection automatique
                </span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs flex items-center gap-1 border border-purple-500/30">
                  <MessageSquare className="w-3 h-3" />
                  Mode conversation
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {inputModes.map(mode => (
                  <span key={mode.id} className={`px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${mode.color} text-white`}>
                    {mode.label}
                  </span>
                ))}
              </div>
              <p className="text-2xl animate-bounce">👇🎤</p>
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
                  <div className={`max-w-[85%] rounded-2xl rounded-tr-sm p-3 ${
                    msg.sourceLanguage === 'bariba' 
                      ? 'bg-orange-500/20 border border-orange-500/30' 
                      : 'bg-blue-500/20 border border-blue-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <LanguageBadge lang={msg.sourceLanguage} size="sm" />
                    </div>
                    <p className="text-white">{msg.sourceText}</p>
                    <div className="flex items-center gap-1 mt-2 justify-end">
                      <button
                        onClick={() => speakText(msg.sourceText, msg.sourceLanguage)}
                        className="p-1 rounded-full hover:bg-white/10"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-white/50" />
                      </button>
                      <button
                        onClick={() => copyText(msg.sourceText)}
                        className="p-1 rounded-full hover:bg-white/10"
                      >
                        <Copy className="w-3.5 h-3.5 text-white/50" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Translator message (translation) */}
                {msg.translatedText && (
                  <div className="flex justify-start">
                    <div className={`max-w-[85%] rounded-2xl rounded-tl-sm p-3 ${
                      msg.targetLanguage === 'bariba' 
                        ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/20 border-2 border-orange-400/50' 
                        : 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-400/50'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-4 h-4 text-orange-400" />
                        <LanguageBadge lang={msg.targetLanguage} size="sm" />
                      </div>
                      <p className="text-lg font-medium text-white">{msg.translatedText}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => speakText(msg.translatedText!, msg.targetLanguage)}
                          className={`p-1.5 rounded-full ${
                            msg.targetLanguage === 'bariba' ? 'bg-orange-500/30 text-orange-300' : 'bg-blue-500/30 text-blue-300'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyText(msg.translatedText!)}
                          className="p-1.5 rounded-full bg-white/10 text-white/60"
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
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                <span className="text-sm text-white/60">Traduction en cours...</span>
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
        <div className="sticky bottom-0 bg-[#14141C]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
          {/* Clear button */}
          {messages.length > 0 && (
            <div className="flex justify-center mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Effacer
              </Button>
            </div>
          )}

          {/* Mode selector */}
          <div className="flex justify-center gap-2 mb-3">
            {inputModes.map((mode) => (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleModeChange(mode.id)}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                  translator.currentMode === mode.id
                    ? `bg-gradient-to-br ${mode.color} text-white shadow-lg scale-110`
                    : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                }`}
              >
                {mode.icon}
                <span className="text-[8px] font-medium">{mode.label}</span>
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
                className="flex flex-col items-center"
              >
                <p className="text-xs text-white/40 mb-2">
                  Parlez - la langue sera détectée automatiquement
                </p>
                <TamTamMicButton
                  size="lg"
                  onRecordingComplete={handleVoiceResult}
                  autoTranscribe={false}
                  sourceLang={translator.sourceLanguage === 'bariba' ? 'ba' : 'fr'}
                  disabled={translator.isProcessing}
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
                    <span className="text-xs text-green-400 flex items-center gap-1">
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
                    placeholder="Tapez dans n'importe quelle langue..."
                    className="flex-1 min-h-[50px] max-h-[100px] text-base rounded-xl border-2 border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:border-orange-500/50 resize-none"
                    rows={1}
                  />
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || translator.isProcessing}
                    className="h-auto px-4 kuaishou-btn-primary rounded-xl"
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
                  className="h-14 px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-lg"
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
                  className="h-14 px-8 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 rounded-xl text-lg"
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
                  className="h-14 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-lg"
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
    </KuaishouLayout>
  );
}
