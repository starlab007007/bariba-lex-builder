import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Trash2, Loader2, Volume2, Mic, Languages, Brain, MessageSquare } from 'lucide-react';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { ConversationBubbles, ConversationMessage } from '@/components/tamtam/ConversationBubbles';
import { useSmartConversation } from '@/hooks/useSmartConversation';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

export type DomainContext = 
  // Health sub-contexts
  | 'health' | 'health_first_aid' | 'health_medication' | 'health_maternity' 
  | 'health_diseases' | 'health_nutrition' | 'health_emergency'
  // Agriculture sub-contexts
  | 'agriculture' | 'agriculture_weather' | 'agriculture_crops' | 'agriculture_livestock' 
  | 'agriculture_water' | 'agriculture_prices' | 'agriculture_technician'
  // Finance sub-contexts
  | 'finance' | 'finance_sales' | 'finance_expenses' | 'finance_tontine' 
  | 'finance_credit' | 'finance_savings' | 'finance_advisor'
  // Education sub-contexts
  | 'education' | 'education_crops' | 'education_livestock' | 'education_business' 
  | 'education_health' | 'education_qa'
  // General
  | 'general' | 'market';

interface ProcessingStep {
  id: string;
  labelFr: string;
  labelBa: string;
  icon: React.ReactNode;
  isActive: boolean;
  isComplete: boolean;
}

interface DomainChatbotProps {
  context: DomainContext;
  welcomeMessageFr?: string;
  welcomeMessageBa?: string;
  icon?: string;
  color?: string;
  className?: string;
  onResponse?: (response: { textFr: string; textBa: string }) => void;
  showProcessingPipeline?: boolean;
}

export const DomainChatbot: React.FC<DomainChatbotProps> = ({
  context,
  welcomeMessageFr = 'Posez votre question',
  welcomeMessageBa = 'Bi ìbéèrè rẹ',
  icon = '🤖',
  color = 'bg-purple-500',
  className = '',
  onResponse,
  showProcessingPipeline = true
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [processingStage, setProcessingStage] = useState<number>(0);
  
  const {
    messages,
    isProcessing,
    sendVoiceMessage,
    clearConversation,
    setContext
  } = useSmartConversation(context as any);

  // Processing pipeline steps
  const processingSteps: ProcessingStep[] = [
    { id: 'record', labelFr: 'Écoute', labelBa: 'Gbígbọ́', icon: <Mic className="w-4 h-4" />, isActive: processingStage >= 1, isComplete: processingStage > 1 },
    { id: 'transcribe', labelFr: 'Transcription', labelBa: 'Kíkọ', icon: <MessageSquare className="w-4 h-4" />, isActive: processingStage >= 2, isComplete: processingStage > 2 },
    { id: 'translate', labelFr: 'Traduction', labelBa: 'Ìtumọ̀', icon: <Languages className="w-4 h-4" />, isActive: processingStage >= 3, isComplete: processingStage > 3 },
    { id: 'think', labelFr: 'Réflexion IA', labelBa: 'Ìrònú AI', icon: <Brain className="w-4 h-4" />, isActive: processingStage >= 4, isComplete: processingStage > 4 },
    { id: 'speak', labelFr: 'Réponse', labelBa: 'Ìdáhùn', icon: <Volume2 className="w-4 h-4" />, isActive: processingStage >= 5, isComplete: processingStage > 5 }
  ];

  // Set initial context
  useEffect(() => {
    setContext(context as any);
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
      setProcessingStage(5);
      const text = currentLang === 'fr' ? lastMessage.textFr : lastMessage.textBa;
      speakCurrentLang(text).then(() => {
        setProcessingStage(0);
      });
      onResponse?.({ textFr: lastMessage.textFr, textBa: lastMessage.textBa });
    }
  }, [messages, currentLang, speakCurrentLang, onResponse]);

  // Simulate processing stages
  useEffect(() => {
    if (isProcessing && processingStage === 0) {
      setProcessingStage(1);
      const stageInterval = setInterval(() => {
        setProcessingStage(prev => {
          if (prev >= 4) {
            clearInterval(stageInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
      return () => clearInterval(stageInterval);
    }
  }, [isProcessing]);

  const handleRecordingComplete = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    if (!result.audioBase64) return;
    
    tamtamFeedback.play('send');
    setProcessingStage(2);
    await sendVoiceMessage(result.audioBase64, result.sourceLang);
  };

  const handleClear = () => {
    tamtamFeedback.play('click');
    clearConversation();
    setProcessingStage(0);
  };

  // Convert to ConversationMessage format
  const conversationMessages: ConversationMessage[] = messages.map(m => ({
    id: m.id,
    type: m.type,
    textFr: m.textFr,
    textBa: m.textBa,
    timestamp: m.timestamp
  }));

  // Context display info
  const getContextLabel = (): { fr: string; ba: string } => {
    const labels: Record<string, { fr: string; ba: string }> = {
      // Health
      'health': { fr: 'Santé', ba: 'Ìlera' },
      'health_first_aid': { fr: 'Premiers secours', ba: 'Ìrànwọ́ àkọ́kọ́' },
      'health_medication': { fr: 'Médicaments', ba: 'Oògùn' },
      'health_maternity': { fr: 'Maternité', ba: 'Ìbímọ' },
      'health_diseases': { fr: 'Maladies', ba: 'Àrùn' },
      'health_nutrition': { fr: 'Nutrition', ba: 'Oúnjẹ' },
      'health_emergency': { fr: 'Urgence', ba: 'Pàjáwìrì' },
      // Agriculture
      'agriculture': { fr: 'Agriculture', ba: 'Àgbẹ̀' },
      'agriculture_weather': { fr: 'Météo', ba: 'Ojú ọjọ́' },
      'agriculture_crops': { fr: 'Cultures', ba: 'Ohun ọ̀gbìn' },
      'agriculture_livestock': { fr: 'Élevage', ba: 'Ẹran ọ̀sìn' },
      'agriculture_water': { fr: 'Irrigation', ba: 'Omi' },
      'agriculture_prices': { fr: 'Prix', ba: 'Owó' },
      'agriculture_technician': { fr: 'Technicien', ba: 'Oníṣẹ́' },
      // Finance
      'finance': { fr: 'Finance', ba: 'Owó' },
      'finance_sales': { fr: 'Ventes', ba: 'Títà' },
      'finance_expenses': { fr: 'Dépenses', ba: 'Náírà' },
      'finance_tontine': { fr: 'Tontine', ba: 'Àjọ' },
      'finance_credit': { fr: 'Crédit', ba: 'Àwìn' },
      'finance_savings': { fr: 'Épargne', ba: 'Ìfipamọ́' },
      'finance_advisor': { fr: 'Conseiller', ba: 'Olùdámọ̀ràn' },
      // Education
      'education': { fr: 'Éducation', ba: 'Ẹ̀kọ́' },
      'education_crops': { fr: 'Cours cultures', ba: 'Ẹ̀kọ́ ohun ọ̀gbìn' },
      'education_livestock': { fr: 'Cours élevage', ba: 'Ẹ̀kọ́ ẹran' },
      'education_business': { fr: 'Cours commerce', ba: 'Ẹ̀kọ́ òwò' },
      'education_health': { fr: 'Cours santé', ba: 'Ẹ̀kọ́ ìlera' },
      'education_qa': { fr: 'Questions', ba: 'Ìbéèrè' },
      // Others
      'general': { fr: 'Général', ba: 'Gbogbogbò' },
      'market': { fr: 'Marché', ba: 'Ọjà' }
    };
    return labels[context] || labels['general'];
  };

  const contextLabel = getContextLabel();

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header with context indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-lg`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-tamtam-text text-sm">
              {currentLang === 'fr' ? 'Assistant IA' : 'Olùrànlọ́wọ́ AI'}
            </h3>
            <div className="flex items-center gap-2">
              <div className={`px-2 py-0.5 rounded-full ${color} bg-opacity-20`}>
                <span className="text-xs font-medium" style={{ color: 'inherit' }}>
                  {contextLabel[currentLang]}
                </span>
              </div>
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

      {/* Processing Pipeline Indicator */}
      {showProcessingPipeline && isProcessing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 bg-tamtam-surface rounded-xl"
        >
          <div className="flex items-center justify-between">
            {processingSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <motion.div
                  className={`flex flex-col items-center ${
                    step.isActive ? 'text-tamtam-primary' : 'text-tamtam-text-muted'
                  }`}
                  animate={step.isActive && !step.isComplete ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5, repeat: step.isActive && !step.isComplete ? Infinity : 0 }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.isComplete ? 'bg-green-100 text-green-600' :
                    step.isActive ? 'bg-tamtam-primary/20 text-tamtam-primary' : 
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {step.isComplete ? '✓' : step.icon}
                  </div>
                  <span className="text-[10px] mt-1 text-center leading-tight">
                    {currentLang === 'fr' ? step.labelFr : step.labelBa}
                  </span>
                </motion.div>
                {index < processingSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    processingSteps[index + 1].isActive ? 'bg-tamtam-primary' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))
            }
          </div>
        </motion.div>
      )}

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-[200px] max-h-[350px] mb-4"
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
            <p className="text-tamtam-text-muted text-sm">
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
                {currentLang === 'fr' ? 'Traitement...' : 'Ń ṣiṣẹ́...'}
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
