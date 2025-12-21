import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Trash2, Loader2 } from 'lucide-react';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { ConversationBubbles, ConversationMessage } from '@/components/tamtam/ConversationBubbles';
import { useSmartConversation, ConversationContext } from '@/hooks/useSmartConversation';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface SmartChatbotProps {
  context?: ConversationContext;
  welcomeMessageFr?: string;
  welcomeMessageBa?: string;
  icon?: string;
  color?: string;
  className?: string;
  onResponse?: (response: { textFr: string; textBa: string }) => void;
}

export const SmartChatbot: React.FC<SmartChatbotProps> = ({
  context = 'general',
  welcomeMessageFr = 'Posez votre question',
  welcomeMessageBa = 'Bi ìbéèrè rẹ',
  icon = '🤖',
  color = 'bg-purple-500',
  className = '',
  onResponse
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isProcessing,
    currentContext,
    sendVoiceMessage,
    clearConversation,
    setContext
  } = useSmartConversation(context);

  // Set initial context
  useEffect(() => {
    setContext(context);
  }, [context, setContext]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Speak AI responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'ai') {
      const text = currentLang === 'fr' ? lastMessage.textFr : lastMessage.textBa;
      speakCurrentLang(text);
      onResponse?.({ textFr: lastMessage.textFr, textBa: lastMessage.textBa });
    }
  }, [messages, currentLang, speakCurrentLang, onResponse]);

  const handleRecordingComplete = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    if (!result.audioBase64) return;
    
    tamtamFeedback.play('send');
    await sendVoiceMessage(result.audioBase64, result.sourceLang);
  };

  const handleClear = () => {
    tamtamFeedback.play('click');
    clearConversation();
  };

  // Convert to ConversationMessage format
  const conversationMessages: ConversationMessage[] = messages.map(m => ({
    id: m.id,
    type: m.type,
    textFr: m.textFr,
    textBa: m.textBa,
    timestamp: m.timestamp
  }));

  // Context badge colors
  const contextColors: Record<ConversationContext, string> = {
    agriculture: 'bg-green-500',
    finance: 'bg-emerald-500',
    education: 'bg-purple-500',
    market: 'bg-orange-500',
    health: 'bg-red-500',
    general: 'bg-blue-500'
  };

  const contextLabels: Record<ConversationContext, { fr: string; ba: string }> = {
    agriculture: { fr: 'Agriculture', ba: 'Àgbẹ̀' },
    finance: { fr: 'Finance', ba: 'Owó' },
    education: { fr: 'Éducation', ba: 'Ẹ̀kọ́' },
    market: { fr: 'Marché', ba: 'Ọjà' },
    health: { fr: 'Santé', ba: 'Ìlera' },
    general: { fr: 'Général', ba: 'Gbogbogbò' }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header with context indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
            <span className="text-xl">{icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-tamtam-text text-sm">
              {currentLang === 'fr' ? 'Assistant Intelligent' : 'Olùrànlọ́wọ́ Ọlọ́gbọ́n'}
            </h3>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${contextColors[currentContext]}`} />
              <span className="text-xs text-tamtam-text-muted">
                {contextLabels[currentContext][currentLang]}
              </span>
            </div>
          </div>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-tamtam-surface hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-tamtam-text-muted hover:text-red-500" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] mb-4"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              {icon}
            </motion.div>
            <p className="text-tamtam-text-muted">
              {currentLang === 'fr' ? welcomeMessageFr : welcomeMessageBa}
            </p>
            <p className="text-3xl mt-3">👇🎤</p>
          </div>
        ) : (
          <ConversationBubbles 
            messages={conversationMessages} 
            isProcessing={isProcessing}
            showTranslation={true}
          />
        )}
      </div>

      {/* Input area */}
      <div className="flex justify-center">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-3 px-6 py-3 bg-tamtam-surface rounded-full"
            >
              <Loader2 className="w-5 h-5 animate-spin text-tamtam-primary" />
              <span className="text-tamtam-text-muted text-sm">
                {currentLang === 'fr' ? 'Réflexion...' : 'Ń rònú...'}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <TamTamMicButton
                size="lg"
                onRecordingComplete={handleRecordingComplete}
                autoTranscribe={false}
                autoTranslate={false}
                sourceLang={currentLang}
                disabled={isProcessing}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
