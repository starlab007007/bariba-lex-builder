import { replaceTranscriptDraft } from '@/lib/voice/transcriptionReview';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Scale, User, BookOpen, ShieldCheck, Headphones } from 'lucide-react';
import VoiceInput from '@/components/voice/VoiceInput';
import ReplyAudioPlayer from '@/components/voice/ReplyAudioPlayer';
import type { SpeechLanguage } from '@/lib/voice/replySpeech';
import { toast } from 'sonner';
import FoncierSourcesModal, { type FoncierSource } from '@/components/fitila/FoncierSourcesModal';
import BaribaSmartTextarea from '@/components/classe/BaribaSmartTextarea';
import { answerFromCorpus } from '@/lib/foncierRAG';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isLoading?: boolean;
  isTyping?: boolean;
  isFallback?: boolean;
  sources?: FoncierSource[];
}

const STORAGE_KEY = 'fitila-ia-history';
const LEGACY_STORAGE_KEY = 'fitila-tem-ia-history';

export default function FitilaTemIA() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ChatMessage[];
      return parsed.map(m => ({ ...m, isLoading: false, isTyping: false }));
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [openSources, setOpenSources] = useState<FoncierSource[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceLang, setVoiceLang] = useState<SpeechLanguage>('bba');

  useEffect(() => {
    try {
      const toSave = messages.filter(m => !m.isLoading).slice(-30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
        const { answer, sources, isFallback } = answerFromCorpus(text.trim());
        const formatted = answer.replace(/\.\s+/g, '.\n\n').trim();

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: formatted,
          timestamp: Date.now(),
          isTyping: false,
          isFallback,
          sources: sources as FoncierSource[],
        };
        setMessages(prev => [...prev, assistantMsg]);
      } catch (err) {
        console.error('[FitilaTemIA] Local search error:', err);
        toast.error('Erreur de recherche locale');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isBusy = isProcessing || voiceBusy;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[960px] flex-col overflow-hidden bg-[#F7F5EC] text-[#241F2E]">
      {/* Header */}
      <div className="flex items-center gap-3 pl-[74px] md:pl-[18px] pr-4 pt-[14px] pb-2 z-10">
                <div className="flex items-center gap-2.5 flex-1">
                    <div>
            <h1 className="text-[#241F2E] font-extrabold text-[17px] leading-tight">Fitila IA</h1>
            <p className="text-[#8C8571] text-[11px] leading-tight">Écrivez, dictez, écoutez</p>
          </div>
        </div>
      </div>

      {/* Specialization badge */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 bg-[#DCEAE0] border border-[#3F6E52]/30 rounded-[16px] px-3 py-2">
          <ShieldCheck className="w-4 h-4 text-[#3F6E52] flex-shrink-0" />
          <p className="text-[11px] text-[#3F6E52] font-extrabold leading-tight">
            🔒 Source locale embarquée : <strong>Code Foncier Bariba</strong> — 207 articles
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 sm:px-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-[86px] h-[86px] rounded-[28px] bg-[#DCEAE0] flex items-center justify-center border border-[#3F6E52]/25">
              <Scale className="w-10 h-10 text-[#3F6E52]" />
            </div>
            <p className="text-[#241F2E] text-[16px] text-center max-w-[320px] font-extrabold">
              Yaa sɔ̃ɔ tem bausu gari Baribarum.
            </p>
            <p className="text-[#8C8571] text-[12px] text-center max-w-[280px]">
              Posez votre question sur les documents locaux FITILA
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-[320px] mt-2">
              {[
                "Saria gbiika gari mba?",
                "Saria 14se ya nɛɛ mba?",
                "Tem bausu mba ba mɔ̀ Benɛ temɔ?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[12px] font-bold px-4 py-2 rounded-full bg-white border border-[#E4DFCC] text-[#241F2E] hover:bg-[#F3E3B9]/50 transition-colors"
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
              <div className={`flex items-start gap-2 min-w-0 max-w-[96%] sm:max-w-[88%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${
                  msg.role === 'user' ? 'bg-orange-500' : 'bg-gradient-to-br from-emerald-500 to-teal-500'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Scale className="w-3.5 h-3.5 text-white" />
                  }
                </div>

                <div className="min-w-0 flex flex-col gap-1">
                  <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white rounded-tr-md'
                      : msg.isFallback
                        ? 'bg-amber-50 text-amber-900 rounded-tl-md border border-amber-200'
                        : 'bg-white text-[#241F2E] rounded-tl-md border border-gray-100'
                  }`}>
                    <div data-i18n-preserve className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</div>
                  </div>

                  {msg.role === 'assistant' && <ReplyAudioPlayer text={msg.content} lang="bba" />}

                  {/* Sources card */}
                  {msg.role === 'assistant' && !msg.isTyping && msg.sources && msg.sources.length > 0 && (
                    <button
                      onClick={() => setOpenSources(msg.sources!)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#DCEAE0] border border-[#3F6E52]/20 text-[#3F6E52] hover:bg-[#CFE2D5] transition-colors mt-1 self-start"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        Sources : {msg.sources.slice(0, 3).map(s => s.number).join(' · ')}
                        {msg.sources.length > 3 ? ` +${msg.sources.length - 3}` : ''}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-[#3F6E52] flex items-center justify-center flex-shrink-0 mt-1">
                  <Scale className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-[18px] bg-white text-[#241F2E] rounded-tl-md border border-[#E4DFCC]">
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#3F6E52] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#3F6E52] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#3F6E52] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[#8C8571] text-xs">Sariaba kasuamɔ...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Input */}
      <form onSubmit={handleSubmit} className="max-h-[62dvh] overflow-y-auto overscroll-contain px-[18px] py-3 border-t border-[#E4DFCC] bg-[#F7F5EC]">
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <BaribaSmartTextarea
              value={input}
              onChange={setInput}
              placeholder="Yaa sɔ̃ɔ tem bausu gari Baribarum..."
              rows={1}
              disabled={isBusy}
            />
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            aria-label="Envoyer la question"
            disabled={!input.trim() || isBusy}
            className="w-[46px] h-[46px] rounded-[14px] bg-[#3F6E52] flex items-center justify-center disabled:opacity-50 transition-opacity flex-shrink-0"
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#716B5F]"><Headphones className="h-3 w-3" />Une voix pour chaque réponse</span>
          <select aria-label="Langue du vocal" value={voiceLang} disabled={isBusy} onChange={e => setVoiceLang(e.target.value as SpeechLanguage)} className="h-9 rounded-xl border border-[#E4DFCC] bg-white px-2 text-xs"><option value="bba">Baatɔnum</option><option value="fr">Français</option></select>
        </div>
        <div className="mt-2"><VoiceInput onReplaceTranscript={(previous, next) => { const result = replaceTranscriptDraft(input, previous, next); if (result.replaced) setInput(result.text); return result.replaced; }} lang={voiceLang} disabled={isProcessing} onBusyChange={setVoiceBusy} onTranscript={text => setInput(previous => [previous.trim(), text].filter(Boolean).join('\n'))} /></div>
        <p className="mt-2 text-center text-[10px] text-[#716B5F]">Recherche locale · dictée et voix Baatɔnum avec connexion</p>
      </form>

      <FoncierSourcesModal sources={openSources} onClose={() => setOpenSources(null)} />
    </div>
  );
}
