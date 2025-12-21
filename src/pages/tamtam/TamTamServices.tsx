import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { ArrowLeft, Volume2, Loader2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { VoiceMessage } from '@/components/tamtam/VoiceMessage';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { byT5TranslationService } from '@/services/ByT5TranslationService';

const services = [
  { id: 'translator', icon: '🌐', color: 'bg-blue-500', bgLight: 'bg-blue-50', labelKey: 'translator', route: '/tamtam/translator' },
  { id: 'health', icon: '🏥', color: 'bg-green-500', bgLight: 'bg-green-50', labelKey: 'health', route: null },
  { id: 'finance', icon: '💰', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', labelKey: 'finance', route: '/tamtam/finance' },
  { id: 'agri', icon: '🌾', color: 'bg-emerald-500', bgLight: 'bg-emerald-50', labelKey: 'agriculture', route: '/tamtam/agriculture' },
  { id: 'education', icon: '📚', color: 'bg-purple-500', bgLight: 'bg-purple-50', labelKey: 'education', route: '/tamtam/education' },
  { id: 'documents', icon: '📋', color: 'bg-gray-500', bgLight: 'bg-gray-50', labelKey: 'documents', route: null },
];

interface Message {
  type: 'user' | 'ai';
  textFr: string;
  textBa: string;
  audioUrl?: string;
}

export default function TamTamServices() {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    announceAction(t('screenServices'));
  }, [announceAction, t]);

  const handleServiceSelect = (service: typeof services[0]) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(service.labelKey));
    
    // Navigate to dedicated page if route exists
    if (service.route) {
      navigate(service.route);
      return;
    }
    
    setActiveService(service.id);
    setMessages([]);
  };

  const handleBack = () => {
    tamtamFeedback.play('click');
    setActiveService(null);
    setMessages([]);
  };

  const handleSpeakLabel = async (labelKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    await speakCurrentLang(t(labelKey));
  };

  const handleVoiceMessage = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    if (!result.transcription) {
      toast({
        title: "Erreur",
        description: "Impossible de transcrire l'audio",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    try {
      // Get bilingual transcription
      let textFr = result.sourceLang === 'fr' ? result.transcription : '';
      let textBa = result.sourceLang === 'ba' ? result.transcription : '';
      
      // Translate to get both versions
      if (result.sourceLang === 'ba' && !textFr) {
        const transResult = await byT5TranslationService.translate(result.transcription, 'bariba', 'french');
        textFr = transResult.translation;
      } else if (result.sourceLang === 'fr' && !textBa) {
        const transResult = await byT5TranslationService.translate(result.transcription, 'french', 'bariba');
        textBa = transResult.translation;
      }
      
      // Add user message
      setMessages(prev => [...prev, { 
        type: 'user', 
        textFr,
        textBa
      }]);
      
      // Get AI response based on service context
      const { data, error } = await supabase.functions.invoke('raconte-moi', {
        body: { 
          command: textFr,
          language: currentLang,
          context: activeService
        }
      });
      
      if (error) throw error;
      
      // Add AI response
      const aiMessage: Message = {
        type: 'ai',
        textFr: data.response_fr || data.response,
        textBa: data.response_ba || ''
      };
      
      // Translate AI response if needed
      if (!aiMessage.textBa && aiMessage.textFr) {
        const transResult = await byT5TranslationService.translate(aiMessage.textFr, 'french', 'bariba');
        aiMessage.textBa = transResult.translation;
      }
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Speak the AI response
      const responseText = currentLang === 'ba' ? aiMessage.textBa : aiMessage.textFr;
      await speakCurrentLang(responseText);
      
      tamtamFeedback.play('success');
      
    } catch (err: any) {
      console.error('[TamTamServices] Voice message error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const activeServiceData = services.find(s => s.id === activeService);

  return (
    <div className="min-h-screen bg-tamtam-bg px-4">
      <AnimatePresence mode="wait">
        {!activeService ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Title icon */}
            <div className="text-center mb-6">
              <span className="text-5xl">🤖</span>
              <h1 className="text-xl font-bold text-tamtam-text mt-2">
                {t('services')}
              </h1>
            </div>

            {/* Services grid 2x3 */}
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              {services.map((service, index) => (
                <motion.button
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleServiceSelect(service)}
                  className={`aspect-square ${service.bgLight} rounded-3xl shadow-tamtam-soft flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform relative`}
                >
                  <div className={`w-20 h-20 ${service.color} rounded-2xl flex items-center justify-center`}>
                    <span className="text-4xl">{service.icon}</span>
                  </div>
                  <span className="text-sm font-medium text-tamtam-text">
                    {t(service.labelKey)}
                  </span>
                  
                  {/* Audio button */}
                  <button
                    onClick={(e) => handleSpeakLabel(service.labelKey, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
                  >
                    <Volume2 className="w-3 h-3 text-tamtam-primary" />
                  </button>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full flex flex-col"
          >
            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="w-12 h-12 bg-tamtam-surface rounded-2xl flex items-center justify-center shadow-tamtam-soft"
              >
                <ArrowLeft className="w-6 h-6 text-tamtam-text" />
              </button>
              <div className={`w-14 h-14 ${activeServiceData?.color} rounded-2xl flex items-center justify-center`}>
                <span className="text-3xl">{activeServiceData?.icon}</span>
              </div>
              <span className="text-lg font-bold text-tamtam-text">
                {activeServiceData && t(activeServiceData.labelKey)}
              </span>
            </div>

            {/* Chat messages with bilingual transcription */}
            <div className="flex-1 space-y-4 mb-4 min-h-[300px] overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-6xl mb-4"
                  >
                    {activeServiceData?.icon}
                  </motion.div>
                  <p className="text-tamtam-text-muted">{t('tapToSpeak')}</p>
                  <div className="text-4xl mt-4">👇</div>
                </div>
              )}
              
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <VoiceMessage
                    transcriptFr={msg.textFr}
                    transcriptBa={msg.textBa}
                    audioUrl={msg.audioUrl}
                    duration={5}
                    isOwn={msg.type === 'user'}
                    showTranscription={true}
                  />
                </motion.div>
              ))}
              
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 py-4"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-tamtam-primary" />
                  <span className="text-tamtam-text-muted">{t('processing')}</span>
                </motion.div>
              )}
            </div>

            {/* Central mic for conversation with full pipeline */}
            <div className="flex justify-center pb-4">
              <TamTamMicButton
                size="lg"
                onRecordingComplete={handleVoiceMessage}
                autoTranscribe={true}
                autoTranslate={true}
                sourceLang={currentLang}
                disabled={isProcessing}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
