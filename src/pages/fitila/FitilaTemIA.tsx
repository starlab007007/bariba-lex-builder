import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, MicOff, Loader2, Scale, User, Languages, Keyboard, BookOpen, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { usePhoneticSuggestions } from '@/hooks/usePhoneticSuggestions';
import { toast } from 'sonner';
import FoncierSourcesModal, { type FoncierSource } from '@/components/fitila/FoncierSourcesModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  isTyping?: boolean;
  translationFr?: string;
  isTranslatingFr?: boolean;
  isFallbackFr?: boolean;
  sources?: FoncierSource[];
}

const STORAGE_KEY = 'fitila-tem-ia-history';

const BARIBA_CHARS = [
  'ɔ', 'ɛ', 'ŋ', 'ã', 'ɔ̀', 'ɔ́', 'ɔ̃',
  'ɛ̀', 'ɛ́', 'ɛ̃', 'à', 'á', 'è', 'é',
  'ì', 'í', 'ò', 'ó', 'ù', 'ú', 'ũ', 'õ', 'ĩ',
  'ǹ', 'ń',
];

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
    }, 16);
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

export default function FitilaTemIA() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ChatMessage[];
      // Reset transient flags
      return parsed.map(m => ({ ...m, isLoading: false, isTyping: false, isTranslatingFr: false }));
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openSources, setOpenSources] = useState<FoncierSource[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { startRecording, stopRecording, isRecording } = useAudioRecorder();
  const { transcribe, isTranscribing } = useBaribaSTT();
  const { getSuggestions } = usePhoneticSuggestions();

  const currentWord = input.split(' ').pop() || '';
  const suggestions = currentWord.length >= 1 ? getSuggestions(currentWord, 6) : [];

  // Persist isolated history
  useEffect(() => {
    try {
      // Only persist non-loading messages (cap to last 30)
      const toSave = messages.filter(m => !m.isLoading).slice(-30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleTypingComplete = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isTyping: false } : m));
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    const loadingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setShowSuggestions(false);
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('fitila-tem-ia-chat', {
        body: { message: text.trim() },
      });

      if (error) throw error;
      if (data?.error === 'credits_exhausted') {
        toast.error('⚠️ Crédits IA épuisés.');
        setMessages(prev => prev.filter(m => m.id !== loadingMsg.id));
        return;
      }
      if (data?.error) throw new Error(data.error);

      const isFallback = data?.fallback === true;
      const responseBa = data?.response_ba;
      const responseFr = data?.response_fr;
      const sources: FoncierSource[] = Array.isArray(data?.sources) ? data.sources : [];

      const displayText = (responseBa && !isFallback) ? responseBa : (responseFr || '...');
      const formatted = displayText.replace(/\.\s+/g, '.\n\n').trim();

      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id
          ? {
              ...m,
              content: formatted,
              isLoading: false,
              isTyping: true,
              sources,
              ...(isFallback ? { translationFr: responseFr, isFallbackFr: true } : {}),
            }
          : m
      ));
    } catch (err) {
      console.error('[FitilaTemIA] Error:', err);
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
        if (result?.transcription) sendMessage(result.transcription);
        else toast.error('Transcription impossible');
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
    <div className="flex flex-col h-[100dvh] w-full bg-gradient-to-b from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-md z-10 shadow-sm">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </motion.button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-gray-800 font-bold text-base">Fitila Tem IA</h1>
            <p className="text-gray-400 text-[10px]">Tem bausu sariaba sɔ̃ɔsiru</p>
          </div>
        </div>
      </div>

      {/* Specialization badge */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-[11px] text-emerald-800 font-medium leading-tight">
            🔒 Assistant basé uniquement sur le <strong>Code Foncier (Bariba)</strong> — Loi n° 2013-01
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-80">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border border-emerald-200/50 shadow-lg">
              <Scale className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-gray-700 text-sm text-center max-w-[280px] font-medium">
              Tem bausu sariaba sɔɔ, n koo nun bukuru ko.
            </p>
            <p className="text-gray-400 text-xs text-center max-w-[280px]">
              Posez une question sur le Code foncier béninois (en français ou Bariba)
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-[320px] mt-2">
              {[
                "Que dit l'article 1 ?",
                "Comment obtenir un titre foncier ?",
                "Qui peut posséder une terre au Bénin ?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  {q}
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                  msg.role === 'user' ? 'bg-orange-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Scale className="w-3.5 h-3.5 text-white" />
                  }
                </div>

                <div className="flex flex-col gap-1">
                  <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-tr-md'
                      : 'bg-white text-gray-800 rounded-tl-md border border-gray-100'
                  }`}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-gray-400 text-xs">Sariaba kasuamɔ...</span>
                      </div>
                    ) : msg.isTyping ? (
                      <TypingText content={msg.content} onComplete={() => handleTypingComplete(msg.id)} />
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    )}
                  </div>

                  {/* Sources card */}
                  {msg.role === 'assistant' && !msg.isLoading && !msg.isTyping && msg.sources && msg.sources.length > 0 && (
                    <button
                      onClick={() => setOpenSources(msg.sources!)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-colors mt-1 self-start"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        Sources : {msg.sources.slice(0, 3).map(s => s.number).join(' · ')}
                        {msg.sources.length > 3 ? ` +${msg.sources.length - 3}` : ''}
                      </span>
                    </button>
                  )}

                  {msg.role === 'assistant' && !msg.isLoading && !msg.isTyping && msg.isFallbackFr && (
                    <p className="text-[10px] text-amber-500 ml-1 mt-0.5 italic">⚠ Réponse en français (traduction Bariba indisponible)</p>
                  )}

                  {msg.role === 'assistant' && !msg.isLoading && !msg.isTyping && !msg.isFallbackFr && (
                    <>
                      {!msg.translationFr ? (
                        <button
                          onClick={() => handleTranslate(msg.id, msg.content)}
                          disabled={msg.isTranslatingFr}
                          className="flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-700 transition-colors ml-1 mt-0.5 disabled:opacity-50"
                        >
                          {msg.isTranslatingFr
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Languages className="w-3 h-3" />
                          }
                          {msg.isTranslatingFr ? 'Traduction...' : 'Traduire en français'}
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-800 leading-relaxed whitespace-pre-wrap"
                        >
                          <span className="font-medium text-emerald-500 text-[10px] uppercase tracking-wide block mb-1">Français</span>
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

      {/* Suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && input.length > 0 && showSuggestions && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="px-4 pb-1">
            <div className="flex gap-1.5 flex-wrap bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-md">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => selectSuggestion(s.word)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors border border-emerald-100"
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-4 pb-1">
            <div className="flex gap-1 flex-wrap bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-md">
              {BARIBA_CHARS.map((char) => (
                <button
                  key={char}
                  onClick={() => insertChar(char)}
                  className="w-9 h-9 rounded-lg bg-gray-50 hover:bg-emerald-50 text-gray-800 text-sm font-medium flex items-center justify-center border border-gray-200 hover:border-emerald-200 transition-colors active:scale-95"
                >
                  {char}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowKeyboard(v => !v)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              showKeyboard ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Keyboard className="w-5 h-5" />
          </motion.button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Yaa sɔ̃ɔ tem bausu gari..."
            disabled={isBusy}
            className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 transition-all"
          />

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
            {isTranscribing
              ? <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              : isRecording
                ? <MicOff className="w-5 h-5 text-white" />
                : <Mic className="w-5 h-5" />
            }
          </motion.button>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isBusy}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center disabled:opacity-30 transition-opacity shadow-md shadow-emerald-200"
          >
            {isProcessing
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <Send className="w-5 h-5 text-white" />
            }
          </motion.button>
        </div>
      </form>

      <FoncierSourcesModal sources={openSources} onClose={() => setOpenSources(null)} />
    </div>
  );
}
