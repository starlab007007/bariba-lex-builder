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
  Send
} from 'lucide-react';
import { useSmartTranslator, InputMode } from '@/hooks/useSmartTranslator';
import { PhotoTranslator } from '@/components/tamtam/PhotoTranslator';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

const inputModes: { id: InputMode; icon: React.ReactNode; label: string; color: string }[] = [
  { id: 'audio', icon: <Mic className="w-6 h-6" />, label: 'Audio', color: 'from-orange-500 to-red-500' },
  { id: 'text', icon: <Keyboard className="w-6 h-6" />, label: 'Texte', color: 'from-blue-500 to-indigo-500' },
  { id: 'photo', icon: <Camera className="w-6 h-6" />, label: 'Photo', color: 'from-purple-500 to-pink-500' },
  { id: 'paste', icon: <ClipboardPaste className="w-6 h-6" />, label: 'Coller', color: 'from-green-500 to-teal-500' },
  { id: 'scan', icon: <FileText className="w-6 h-6" />, label: 'Scan', color: 'from-amber-500 to-orange-500' },
];

export default function TamTamTranslator() {
  const translator = useSmartTranslator();
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (mode: InputMode) => {
    tamtamFeedback.play('click');
    translator.setCurrentMode(mode);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await translator.translateFromDocument(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render language badge
  const LanguageBadge = ({ lang, isSource }: { lang: 'bariba' | 'french'; isSource: boolean }) => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
      lang === 'bariba' 
        ? 'bg-orange-100 text-orange-700' 
        : 'bg-blue-100 text-blue-700'
    }`}>
      <span className="text-lg">{lang === 'bariba' ? '🇧🇯' : '🇫🇷'}</span>
      <span className="text-sm font-medium">
        {lang === 'bariba' ? 'Bariba' : 'Français'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-tamtam-bg to-white px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl mb-2"
        >
          🌐
        </motion.div>
        <h1 className="text-2xl font-bold text-tamtam-text">Traducteur Intelligent</h1>
        <p className="text-tamtam-text-muted text-sm mt-1">Traduisez par la voix, le texte ou l'image</p>
      </div>

      {/* Language selector with swap */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <LanguageBadge lang={translator.sourceLanguage} isSource={true} />
        
        <motion.button
          whileTap={{ scale: 0.9, rotate: 180 }}
          onClick={translator.swapLanguages}
          className="w-10 h-10 bg-tamtam-primary rounded-full flex items-center justify-center shadow-lg"
        >
          <ArrowLeftRight className="w-5 h-5 text-white" />
        </motion.button>
        
        <LanguageBadge lang={translator.targetLanguage} isSource={false} />
      </div>

      {/* Result display */}
      <AnimatePresence mode="wait">
        {(translator.sourceText || translator.translatedText) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 space-y-4"
          >
            {/* Source text */}
            {translator.sourceText && (
              <div className={`p-4 rounded-2xl ${
                translator.sourceLanguage === 'bariba' 
                  ? 'bg-orange-50 border border-orange-200' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    {translator.sourceLanguage === 'bariba' ? '🇧🇯 Bariba' : '🇫🇷 Français'}
                  </span>
                  <button
                    onClick={translator.speakSource}
                    disabled={translator.isSpeaking}
                    className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
                  >
                    <Volume2 className={`w-4 h-4 ${
                      translator.sourceLanguage === 'bariba' ? 'text-orange-600' : 'text-blue-600'
                    }`} />
                  </button>
                </div>
                <p className="text-lg text-gray-800">{translator.sourceText}</p>
              </div>
            )}

            {/* Translation result */}
            {translator.translatedText && (
              <div className={`p-4 rounded-2xl ${
                translator.targetLanguage === 'bariba' 
                  ? 'bg-orange-100 border-2 border-orange-300' 
                  : 'bg-blue-100 border-2 border-blue-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">
                    {translator.targetLanguage === 'bariba' ? '🇧🇯 Bariba' : '🇫🇷 Français'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={translator.speakTranslation}
                      disabled={translator.isSpeaking}
                      className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
                    >
                      <Volume2 className={`w-4 h-4 ${
                        translator.targetLanguage === 'bariba' ? 'text-orange-600' : 'text-blue-600'
                      }`} />
                    </button>
                    <button
                      onClick={translator.copyToClipboard}
                      className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
                <p className="text-xl font-medium text-gray-800">{translator.translatedText}</p>
              </div>
            )}

            {/* Reset button */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                onClick={translator.reset}
                className="text-gray-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Effacer
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing indicator */}
      {translator.isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-3 py-8"
        >
          <Loader2 className="w-8 h-8 animate-spin text-tamtam-primary" />
          <span className="text-tamtam-text-muted">Traduction en cours...</span>
        </motion.div>
      )}

      {/* Input mode selector */}
      <div className="mb-6">
        <div className="grid grid-cols-5 gap-2 mb-4">
          {inputModes.map((mode) => (
            <motion.button
              key={mode.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleModeChange(mode.id)}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                translator.currentMode === mode.id
                  ? `bg-gradient-to-br ${mode.color} text-white shadow-lg scale-105`
                  : 'bg-white text-gray-600 shadow-md'
              }`}
            >
              {mode.icon}
              <span className="text-[10px] font-medium">{mode.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Dynamic input area based on mode */}
      <AnimatePresence mode="wait">
        {translator.currentMode === 'audio' && (
          <motion.div
            key="audio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-center text-tamtam-text-muted text-sm">
              Appuyez et parlez en {translator.sourceLanguage === 'bariba' ? 'Bariba' : 'Français'}
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
            key="text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`Tapez en ${translator.sourceLanguage === 'bariba' ? 'Bariba' : 'Français'}...`}
              className="min-h-[120px] text-lg rounded-2xl border-2 focus:border-tamtam-primary"
            />
            <Button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || translator.isProcessing}
              className="w-full h-14 bg-tamtam-primary hover:bg-tamtam-primary/90 rounded-2xl text-lg"
            >
              <Send className="w-5 h-5 mr-2" />
              Traduire
            </Button>
          </motion.div>
        )}

        {translator.currentMode === 'photo' && (
          <motion.div
            key="photo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PhotoTranslator
              onCapture={translator.translateFromImage}
              isProcessing={translator.isProcessing}
            />
          </motion.div>
        )}

        {translator.currentMode === 'paste' && (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-center text-tamtam-text-muted text-sm">
              Collez du texte depuis votre presse-papier
            </p>
            <Button
              onClick={translator.translateFromClipboard}
              disabled={translator.isProcessing}
              className="w-full h-20 bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 rounded-2xl text-lg"
            >
              <ClipboardPaste className="w-8 h-8 mr-3" />
              Coller et Traduire
            </Button>
          </motion.div>
        )}

        {translator.currentMode === 'scan' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-center text-tamtam-text-muted text-sm">
              Importez un document (PDF, image, texte)
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={translator.isProcessing}
              className="w-full h-20 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl text-lg"
            >
              <FileText className="w-8 h-8 mr-3" />
              Importer Document
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

      {/* Tips section */}
      <div className="mt-8 p-4 bg-tamtam-surface rounded-2xl">
        <h3 className="text-sm font-medium text-tamtam-text mb-2">💡 Astuces</h3>
        <ul className="text-xs text-tamtam-text-muted space-y-1">
          <li>• Parlez clairement pour une meilleure transcription</li>
          <li>• Photographiez le texte bien éclairé</li>
          <li>• Utilisez 🔄 pour inverser les langues</li>
          <li>• Appuyez sur 🔊 pour écouter la traduction</li>
        </ul>
      </div>
    </div>
  );
}
