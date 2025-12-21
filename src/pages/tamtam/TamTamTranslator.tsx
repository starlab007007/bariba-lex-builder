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
  User
} from 'lucide-react';
import { useSmartTranslator, InputMode } from '@/hooks/useSmartTranslator';
import { PhotoTranslator } from '@/components/tamtam/PhotoTranslator';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

const inputModes: { id: InputMode; icon: React.ReactNode; label: string; labelBa: string; color: string }[] = [
  { id: 'audio', icon: <Mic className="w-5 h-5" />, label: 'Voix', labelBa: 'Ohùn', color: 'from-orange-500 to-red-500' },
  { id: 'text', icon: <Keyboard className="w-5 h-5" />, label: 'Texte', labelBa: 'Ọ̀rọ̀', color: 'from-blue-500 to-indigo-500' },
  { id: 'photo', icon: <Camera className="w-5 h-5" />, label: 'Photo', labelBa: 'Àwòrán', color: 'from-purple-500 to-pink-500' },
  { id: 'paste', icon: <ClipboardPaste className="w-5 h-5" />, label: 'Coller', labelBa: 'Lẹ́', color: 'from-green-500 to-teal-500' },
  { id: 'scan', icon: <FileText className="w-5 h-5" />, label: 'Doc', labelBa: 'Ìwé', color: 'from-amber-500 to-orange-500' },
];

export default function TamTamTranslator() {
  const translator = useSmartTranslator();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add message to chat when translation completes
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
        // Avoid duplicates
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.sourceText === newMessage.sourceText && lastMsg?.translatedText === newMessage.translatedText) {
          return prev;
        }
        return [...prev, newMessage];
      });
    }
  }, [translator.lastResult, translator.translatedText, translator.sourceText, translator.sourceLanguage, translator.targetLanguage, translator.currentMode]);

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
    if (result.audioBase64) {
      await translator.translateFromAudio(result.audioBase64);
    }
  };

  const handleTextSubmit = async () => {
    if (textInput.trim()) {
      await translator.translateFromText(textInput);
      setTextInput('');
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

  const speakMessage = async (text: string, lang: 'bariba' | 'french') => {
    tamtamFeedback.play('click');
    if (lang === 'bariba') {
      translator.speakSource();
    } else {
      translator.speakTranslation();
    }
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      tamtamFeedback.play('success');
    } catch (error) {
      tamtamFeedback.play('error');
    }
  };

  // Language badge component
  const LanguageBadge = ({ lang, size = 'sm' }: { lang: 'bariba' | 'french'; size?: 'sm' | 'lg' }) => (
    <span className={`inline-flex items-center gap-1 ${
      size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs'
    } rounded-full font-medium ${
      lang === 'bariba' 
        ? 'bg-orange-100 text-orange-700' 
        : 'bg-blue-100 text-blue-700'
    }`}>
      <span>{lang === 'bariba' ? '🇧🇯' : '🇫🇷'}</span>
      <span>{lang === 'bariba' ? 'Bariba' : 'Français'}</span>
    </span>
  );

  // Mode icon component
  const ModeIcon = ({ mode }: { mode: InputMode }) => {
    const modeConfig = inputModes.find(m => m.id === mode);
    if (!modeConfig) return null;
    return (
      <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${modeConfig.color} flex items-center justify-center`}>
        <span className="text-white scale-75">{modeConfig.icon}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-tamtam-bg to-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="w-12 h-12 bg-gradient-to-br from-tamtam-primary to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <span className="text-2xl">🌐</span>
            </motion.div>
            <div>
              <h1 className="text-lg font-bold text-tamtam-text">Traducteur IA</h1>
              <p className="text-xs text-tamtam-text-muted">Bariba ⟷ Français</p>
            </div>
          </div>
          
          {/* Language swap button */}
          <div className="flex items-center gap-2">
            <LanguageBadge lang={translator.sourceLanguage} size="sm" />
            <motion.button
              whileTap={{ scale: 0.9, rotate: 180 }}
              onClick={translator.swapLanguages}
              className="w-8 h-8 bg-tamtam-primary rounded-full flex items-center justify-center shadow-md"
            >
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </motion.button>
            <LanguageBadge lang={translator.targetLanguage} size="sm" />
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && !translator.isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              🌐
            </motion.div>
            <h2 className="text-xl font-bold text-tamtam-text mb-2">
              Bienvenue! 👋
            </h2>
            <p className="text-tamtam-text-muted mb-4">
              Je traduis entre Français et Bariba
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {inputModes.map(mode => (
                <span key={mode.id} className={`px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r ${mode.color} text-white`}>
                  {mode.label}
                </span>
              ))}
            </div>
            <p className="text-3xl animate-bounce">👇🎤</p>
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
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <ModeIcon mode={msg.inputMode} />
                    <LanguageBadge lang={msg.sourceLanguage} size="sm" />
                  </div>
                  <p className="text-gray-800">{msg.sourceText}</p>
                  <div className="flex items-center gap-1 mt-2 justify-end">
                    <button
                      onClick={() => speakMessage(msg.sourceText, msg.sourceLanguage)}
                      className="p-1 rounded-full hover:bg-white/50"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => copyMessage(msg.sourceText)}
                      className="p-1 rounded-full hover:bg-white/50"
                    >
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Translator message (translation) */}
              {msg.translatedText && (
                <div className="flex justify-start">
                  <div className={`max-w-[85%] rounded-2xl rounded-tl-sm p-3 ${
                    msg.targetLanguage === 'bariba' 
                      ? 'bg-gradient-to-br from-orange-100 to-orange-50 border-2 border-orange-300' 
                      : 'bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4 text-tamtam-primary" />
                      <LanguageBadge lang={msg.targetLanguage} size="sm" />
                    </div>
                    <p className="text-lg font-medium text-gray-800">{msg.translatedText}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={() => speakMessage(msg.translatedText!, msg.targetLanguage)}
                        className={`p-1.5 rounded-full ${
                          msg.targetLanguage === 'bariba' ? 'bg-orange-200 text-orange-700' : 'bg-blue-200 text-blue-700'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyMessage(msg.translatedText!)}
                        className="p-1.5 rounded-full bg-gray-100 text-gray-600"
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
            <div className="w-10 h-10 bg-tamtam-primary/10 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-tamtam-primary" />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-2xl">
              <Loader2 className="w-4 h-4 animate-spin text-tamtam-primary" />
              <span className="text-sm text-tamtam-text-muted">Traduction en cours...</span>
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

      {/* Input Area */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 safe-area-inset-bottom">
        {/* Clear button */}
        {messages.length > 0 && (
          <div className="flex justify-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              className="text-gray-400 hover:text-red-500"
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
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
              <p className="text-xs text-tamtam-text-muted mb-2">
                Parlez en {translator.sourceLanguage === 'bariba' ? 'Bariba 🇧🇯' : 'Français 🇫🇷'}
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
              className="flex gap-2"
            >
              <Textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Tapez en ${translator.sourceLanguage === 'bariba' ? 'Bariba' : 'Français'}...`}
                className="flex-1 min-h-[50px] max-h-[100px] text-base rounded-xl border-2 focus:border-tamtam-primary resize-none"
                rows={1}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || translator.isProcessing}
                className="h-auto px-4 bg-tamtam-primary hover:bg-tamtam-primary/90 rounded-xl"
              >
                <Send className="w-5 h-5" />
              </Button>
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
  );
}
