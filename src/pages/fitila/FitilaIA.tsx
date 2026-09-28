import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Loader2, Bot, User, Languages, Keyboard, ChevronDown } from 'lucide-react';
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
  isFallbackFr?: boolean;
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
      if (data?.error === 'credits_exhausted') {
        toast.error('⚠️ Crédits IA épuisés. Veuillez recharger votre compte.');
        setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
        setIsProcessing(false);
        return;
      }
      if (data?.error) throw new Error(data.error);

      const isFallback = data?.fallback === true;
      const responseBa = data?.response_ba;
      const responseFr = data?.response_fr;
      
      // If fallback (translation failed), show French with pre-filled translation
      // Otherwise show Bariba response
      const displayText = (responseBa && !isFallback) ? responseBa : (responseFr || 'Gɔɔ tɔɔrɛ...');
      const formatted = displayText.replace(/\.\s+/g, '.\n\n').trim();

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { 
                ...m, 
                content: formatted, 
                isLoading: false, 
                isTyping: true,
                // If fallback, pre-fill French translation since response is already in French
                ...(isFallback ? { translationFr: responseFr, isFallbackFr: true } : {}),
              }
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
    <div className="flex flex-col h-full w-full bg-[#F7F5EC] text-[#241F2E]">
      {/* Header */}
      <div className="flex items-center gap-3 pl-[74px] pr-4 pt-[14px] pb-2 z-10">
                <div className="flex items-center gap-2.5 flex-1">
                    <div>
            <h1 className="text-[#241F2E] font-extrabold text-[17px] leading-tight">Fitila IA</h1>
            <p className="text-[#8C8571] text-[11px] leading-tight">Assistant intelligent en Bàátɔ̀nú</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-[86px] h-[86px] rounded-[28px] bg-[#ECE8FA] flex items-center justify-center border border-[#D9D2F3]">
              <Bot className="w-10 h-10 text-[#6758C9]" />
            </div>
            <p className="text-[#241F2E] text-[16px] text-center max-w-[320px] font-extrabold">
              Yaa sɔ̃ɔ wírú Bariba mɛ̀, ǹ nɛ́ɛ̀ daa gɔ!
            </p>
            <p className="text-[#8C8571] text-[12px] text-center">
              Posez vos questions en Bàátɔ̀nú
            </p>
            <div className="flex flex-col items-center gap-3 mt-1">
              {[
                ['Comment saluer ?', 'Comment saluer en Bàátɔ̀nú ?'],
                ['Explique une coutume', 'Explique une coutume Bàátɔ̀nú'],
                ['Aide-moi en classe', 'Aide-moi à apprendre le Bàátɔ̀nú'],
              ].map(([label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="inline-flex h-[40px] items-center rounded-full border border-[#E4DFCC] bg-white px-4 text-[13px] font-bold text-[#241F2E] active:scale-95"
                >
                  {label}
                </button>
              ))}
            </div>
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
                    ? 'bg-[#C99530]'
                    : 'bg-[#6758C9]'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-white" />
                  }
                </div>

                {/* Bubble + translation */}
                <div className="flex flex-col gap-1">
                  <div className={`px-4 py-3 rounded-[18px] text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#C99530] text-[#2B2110] rounded-tr-md'
                      : 'bg-white text-[#241F2E] rounded-tl-md border border-[#E4DFCC]'
                  }`}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-[#6758C9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-[#6758C9] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-[#6758C9] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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

                  {/* Fallback notice when response is in French */}
                  {msg.role === 'assistant' && !msg.isLoading && !msg.isTyping && msg.isFallbackFr && (
                    <p className="text-[10px] text-amber-500 ml-1 mt-0.5 italic">⚠ Réponse en français (traduction bariba indisponible)</p>
                  )}

                  {/* Translate button for assistant messages */}
                  {msg.role === 'assistant' && !msg.isLoading && !msg.isTyping && !msg.isFallbackFr && (
                    <>
                      {!msg.translationFr ? (
                        <button
                          onClick={() => handleTranslate(msg.id, msg.content)}
                          disabled={msg.isTranslatingFr}
                          className="flex items-center gap-1.5 text-xs text-[#6758C9] hover:text-[#4B3EA0] transition-colors ml-1 mt-0.5 disabled:opacity-50"
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
                          className="bg-[#ECE8FA] border border-[#D9D2F3] rounded-xl px-3 py-2 text-xs text-[#4B3EA0] leading-relaxed whitespace-pre-wrap"
                        >
                          <span className="font-medium text-[#6758C9] text-[10px] uppercase tracking-wide block mb-1">Français</span>
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
            <div className="flex gap-1.5 flex-wrap bg-white border border-[#E4DFCC] rounded-[18px] px-3 py-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s.word)}
                  className="px-2.5 py-1 rounded-lg bg-white text-[#241F2E] text-xs font-bold hover:bg-[#F3E3B9]/50 transition-colors border border-[#E4DFCC] rounded-full"
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
            <div className="flex gap-1 flex-wrap bg-white border border-[#E4DFCC] rounded-[18px] px-3 py-2.5">
              {BARIBA_CHARS.map((char) => (
                <button
                  key={char}
                  onClick={() => insertChar(char)}
                  className="w-9 h-9 rounded-lg bg-[#F7F5EC] hover:bg-[#F3E3B9]/50 text-[#241F2E] text-sm font-medium flex items-center justify-center border border-[#E4DFCC] hover:border-[#C99530] transition-colors active:scale-95"
                >
                  {char}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="px-[18px] py-3 border-t border-[#E4DFCC] bg-[#F7F5EC]">
        <div className="flex items-center gap-2">
          {/* Bariba keyboard toggle */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowKeyboard(v => !v)}
            className={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center transition-all ${
              showKeyboard ? 'bg-[#241F2E] text-white border border-[#241F2E]' : 'bg-white text-[#241F2E] border border-[#E4DFCC] hover:bg-[#F1EDDF]'
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
            className="flex-1 h-[50px] bg-white border border-[#E4DFCC] rounded-[24px] px-4 text-[#241F2E] text-[15px] placeholder:text-[#8C8571] focus:outline-none focus:border-[#C99530] disabled:opacity-50 transition-all"
          />

          {/* Mic */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleVoiceToggle}
            disabled={isProcessing || isTranscribing}
            className={`w-[46px] h-[46px] rounded-[14px] flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse shadow-lg shadow-red-200'
                : isTranscribing
                  ? 'bg-amber-100'
                  : 'bg-white border border-[#E4DFCC] text-[#241F2E] hover:bg-[#F1EDDF]'
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
            className="w-[46px] h-[46px] rounded-[14px] bg-[#6758C9] flex items-center justify-center disabled:opacity-60 transition-opacity"
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
