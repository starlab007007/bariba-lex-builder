import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, MicOff, Loader2, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useBaribaSTT } from '@/hooks/useBaribaSTT';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export default function FitilaIA() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio hooks
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();
  const { transcribe, isTranscribing } = useBaribaSTT();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('fitila-ia-chat', {
        body: { message: text.trim() },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const responseBa = data?.response_ba || 'Gɔɔ tɔɔrɛ...';

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, content: responseBa, isLoading: false }
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

  const isBusy = isProcessing || isTranscribing;

  return (
    <div className="flex flex-col h-full w-full" style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #14141c 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-md z-10">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </motion.button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-base">Fitila IA</h1>
            <p className="text-white/40 text-[10px]">Assistant intelligent en Bariba</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-500/20">
              <span className="text-4xl">🤖</span>
            </div>
            <p className="text-white/50 text-sm text-center max-w-[240px]">
              Yaa sɔ̃ɔ wírú Bariba mɛ̀, ǹ nɛ́ɛ̀ daa gɔ!
            </p>
            <p className="text-white/30 text-xs text-center">
              Posez vos questions en Bariba
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-[#FF7A00]'
                    : 'bg-gradient-to-br from-purple-500 to-indigo-500'
                }`}>
                  {msg.role === 'user' 
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-white" />
                  }
                </div>

                {/* Bubble */}
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#FF7A00] text-white rounded-br-md'
                    : 'bg-white/10 text-white/90 rounded-bl-md border border-white/5'
                }`}>
                  {msg.isLoading ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span className="text-white/40 text-xs">Ǹ nɛ́ɛ̀ dɔɔ bírú...</span>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Yaa sɔ̃ɔ..."
            disabled={isBusy}
            className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
          />

          {/* Mic button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={handleVoiceToggle}
            disabled={isProcessing || isTranscribing}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 animate-pulse'
                : isTranscribing
                  ? 'bg-amber-500/20'
                  : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white/60" />
            )}
          </motion.button>

          {/* Send button */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            disabled={!input.trim() || isBusy}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center disabled:opacity-30 transition-opacity"
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
