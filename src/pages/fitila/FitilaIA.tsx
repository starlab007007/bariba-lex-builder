import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, MicOff, Loader2, Bot, User, Languages, Keyboard, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { usePhoneticSuggestions } from '@/hooks/usePhoneticSuggestions';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isTyping?: boolean;
  displayedContent?: string;
  translationFr?: string;
  isTranslatingFr?: boolean;
}

const BARIBA_CHARS = [
  'ɔ', 'ɛ', 'ŋ', 'ã', 'ɔ̀', 'ɔ́', 'ɔ̃',
  'ɛ̀', 'ɛ́', 'ɛ̃', 'à', 'á', 'è', 'é',
  'ì', 'í', 'ò', 'ó', 'ù', 'ú', 'ũ', 'õ', 'ĩ',
  'ǹ', 'ń',
];

// Typing animation component
function TypingText({ content, onComplete }: { content: string; onComplete: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      indexRef.current++;
      if (indexRef.current >= content.length) {
        setDisplayed(content);
        clearInterval(interval);
        onComplete();
      } else {
        setDisplayed(content.slice(0, indexRef.current));
      }
    }, 18);
    return () => clearInterval(interval);
  }, [content, onComplete]);

  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {displayed}
      {displayed.length < content.length && (
        <span className="inline-block w-0.5 h-4 bg-gray-800 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}

export default function FitilaIA() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();
  const { transcribe, isTranscribing } = useBaribaSTT();
  const { getSuggestions } = usePhoneticSuggestions();

  // Word suggestions
  const currentWord = input.split(' ').pop() || '';
  const suggestions = currentWord.length >= 1 ? getSuggestions(currentWord, 6) : [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleTypingComplete = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTyping: false } : m));
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setShowSuggestions(false);
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('fitila-ia-chat', {
        body: { message: text.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const responseBa = data?.response_ba || 'Gɔɔ tɔɔrɛ...';
      // Format: split into clear paragraphs
      const formatted = responseBa.replace(/\.\s+/g, '.\n\n').trim();

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: formatted, isLoading: false, isTyping: true }
            : m
        )
      );
    } catch (err: any) {
      console.error('[FitilaIA] Error:', err);
      toast.error('Erreur de connexion');
      setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async (msgId: string, textBa: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranslatingFr: true } : m));

    try {
      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: { text: textBa, sourceLang: 'bariba', targetLang: 'french' },
      });

      if (error) throw error;

      const translationFr = data?.translatedText || data?.translation || 'Traduction indisponible';
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, translationFr, isTranslatingFr: false } : m
      ));
    } catch {
      toast.error('Erreur de traduction');
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTranslatingFr: false } : m));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const base64 = await stopRecording();
      if (base64) {
        const result = await transcribe(base64);
        if (result?.transcription) {
          sendMessage(result.transcription);
        } else {
          toast.error('Transcription impossible');
        }
      }
    } else {
      await startRecording();
    }
  };

  const insertChar = (char: string) => {
    const el = inputRef.current;
    if (!el) { setInput(prev => prev + char); return; }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const newVal = input.slice(0, start) + char + input.slice(end);
    setInput(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const selectSuggestion = (word: string) => {
    const parts = input.split(' ');
    parts[parts.length - 1] = word;
    setInput(parts.join(' ') + ' ');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const isBusy = isProcessing || isTranscribing;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gradient-to-b from-indigo-50 via-white to-pink-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-md z-10 shadow-sm">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </motion.button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-gray-800 font-bold text-base">Fitila IA</h1>
            <p className="text-gray-400 text-[10px]">Assistant intelligent en Bariba</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-70">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center border border-indigo-200/50 shadow-lg">
              <Bot className="w-10 h-10 text-indigo-500" />
            </div>
            <p className="text-gray-600 text-sm text-center max-w-[260px] font-medium">
              Yaa sɔ̃ɔ wírú Bariba mɛ̀, ǹ nɛ́ɛ̀ daa gɔ!
            </p>
            <p className="text-gray-400 text-xs text-center">
              Posez vos questions en Bariba
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-2 max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-orange-500'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-white" />
                  }
                </div>

                {/* Bubble + translation */}
                <div className="flex flex-col gap-1">
                  <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-tr-md'
                      : 'bg-white text-gray-800 rounded-tl-md border border-gray-100'
                  }`}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-gray-400 text-xs">Ǹ nɛ́ɛ̀ dɔɔ bírú...</span>
                      </div>
                    ) : msg.isTyping ? (
                      <TypingText
                        content={msg.content}
                        onComplete={() => handleTypingComplete(msg.id)}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    )}
                  </div>

                  {/* Translate button for assistant messages */}
                  {msg.role === 'assistant' && !msg.isLoading && !msg.isTyping && (
                    <>
                      {!msg.translationFr ? (
                        <button
                          onClick={() => handleTranslate(msg.id, msg.content)}
                          disabled={msg.isTranslatingFr}
                          className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors ml-1 mt-0.5 disabled:opacity-50"
                        >
                          {msg.isTranslatingFr ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Languages className="w-3 h-3" />
                          )}
                          {msg.isTranslatingFr ? 'Traduction...' : 'Traduire en français'}
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-xs text-indigo-700 leading-relaxed whitespace-pre-wrap"
                        >
                          <span className="font-medium text-indigo-400 text-[10px] uppercase tracking-wide block mb-1">Français</span>
                          {msg.translationFr}
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions panel */}
      <AnimatePresence>
        {suggestions.length > 0 && input.length > 0 && showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="px-4 pb-1"
          >
            <div className="flex gap-1.5 flex-wrap bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s.word)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors border border-indigo-100"
                >
                  {s.word}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bariba keyboard */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-1"
          >
            <div className="flex gap-1 flex-wrap bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-md">
              {BARIBA_CHARS.map((char) => (
                <button
                  key={char}
                  onClick={() => insertChar(char)}
                  className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-indigo-50 text-gray-800 text-sm font-medium flex items-center justify-center border border-gray-200 hover:border-indigo-200 transition-colors active:scale-95"
                >
                  {char}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {/* Bariba keyboard toggle */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowKeyboard(v => !v)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showKeyboard ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Keyboard className="w-5 h-5" />
          </motion.button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Yaa sɔ̃ɔ..."
            disabled={isBusy}
            className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition-all"
          />

          {/* Mic */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleVoiceToggle}
            disabled={isProcessing || isTranscribing}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200'
                : isTranscribing
                  ? 'bg-amber-100'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </motion.button>

          {/* Send */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isBusy}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center disabled:opacity-30 transition-opacity shadow-md shadow-indigo-200"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
