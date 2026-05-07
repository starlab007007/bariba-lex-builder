import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, Bot, User } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

export interface ConversationMessage {
  id: string;
  type: 'user' | 'ai';
  textFr: string;
  textBa: string;
  timestamp: Date;
  audioUrl?: string;
}

interface ConversationBubblesProps {
  messages: ConversationMessage[];
  isProcessing?: boolean;
  showTranslation?: boolean;
  className?: string;
}

export const ConversationBubbles: React.FC<ConversationBubblesProps> = ({
  messages,
  isProcessing = false,
  showTranslation = true,
  className = ''
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();

  const handleSpeak = async (message: ConversationMessage) => {
    tamtamFeedback.play('click');
    const text = currentLang === 'fr' ? message.textFr : message.textBa;
    await speakCurrentLang(text);
  };

  if (messages.length === 0 && !isProcessing) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-6xl mb-4"
        >
          💬
        </motion.div>
        <p className="text-tamtam-text-muted">
          {currentLang === 'fr' ? 'Commencez à parler' : 'Bẹ̀rẹ̀ sísọ'}
        </p>
        <p className="text-3xl mt-3">👇🎤</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[85%] ${message.type === 'user' ? 'order-1' : ''}`}>
            {/* Avatar */}
            <div className={`flex items-end gap-2 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-tamtam-primary' 
                  : 'bg-gradient-to-br from-purple-500 to-indigo-600'
              }`}>
                {message.type === 'user' 
                  ? <User className="w-4 h-4 text-white" />
                  : <Bot className="w-4 h-4 text-white" />
                }
              </div>
              
              {/* Bubble */}
              <div className={`rounded-2xl p-4 ${
                message.type === 'user' 
                  ? 'bg-tamtam-primary text-white rounded-br-sm' 
                  : 'bg-tamtam-surface shadow-tamtam-soft rounded-bl-sm'
              }`}>
                {/* Main text */}
                <p className={`font-medium ${message.type === 'ai' ? 'text-tamtam-text' : ''}`}>
                  {currentLang === 'fr' ? message.textFr : message.textBa}
                </p>
                
                {/* Translation (smaller) */}
                {showTranslation && (
                  <p className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-white/70' : 'text-tamtam-text-muted'
                  }`}>
                    {currentLang === 'fr' ? message.textBa : message.textFr}
                  </p>
                )}
                
                {/* Actions */}
                <div className={`flex items-center gap-2 mt-2 ${
                  message.type === 'user' ? 'justify-end' : ''
                }`}>
                  <button
                    onClick={() => handleSpeak(message)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      message.type === 'user' 
                        ? 'bg-white/20 hover:bg-white/30' 
                        : 'bg-tamtam-bg hover:bg-tamtam-primary/10'
                    }`}
                  >
                    <Volume2 className={`w-3 h-3 ${
                      message.type === 'user' ? 'text-white' : 'text-tamtam-primary'
                    }`} />
                  </button>
                  <span className={`text-xs ${
                    message.type === 'user' ? 'text-white/50' : 'text-tamtam-text-muted'
                  }`}>
                    {message.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      
      {/* Typing indicator */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-tamtam-surface rounded-2xl rounded-bl-sm p-4 shadow-tamtam-soft">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    className="w-2 h-2 bg-tamtam-primary rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
