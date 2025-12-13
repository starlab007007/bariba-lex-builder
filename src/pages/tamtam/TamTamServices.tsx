import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { VoiceMessage } from '@/components/tamtam/VoiceMessage';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

const services = [
  { id: 'translator', icon: '🌐', color: 'bg-blue-500', bgLight: 'bg-blue-50', labelKey: 'translator' },
  { id: 'health', icon: '🏥', color: 'bg-green-500', bgLight: 'bg-green-50', labelKey: 'health' },
  { id: 'finance', icon: '💰', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', labelKey: 'finance' },
  { id: 'agri', icon: '🌾', color: 'bg-emerald-500', bgLight: 'bg-emerald-50', labelKey: 'agriculture' },
  { id: 'education', icon: '📚', color: 'bg-purple-500', bgLight: 'bg-purple-50', labelKey: 'education' },
  { id: 'documents', icon: '📋', color: 'bg-gray-500', bgLight: 'bg-gray-50', labelKey: 'documents' },
];

interface Message {
  type: 'user' | 'ai';
  textFr: string;
  textBa: string;
  audioUrl?: string;
}

export default function TamTamServices() {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { t } = useTamTamLanguage();
  const { announce } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();

  useEffect(() => {
    announce(t('screenServices'));
  }, [announce, t]);

  const handleServiceSelect = (serviceId: string, labelKey: string) => {
    tamtamFeedback.play('click');
    speakCurrentLang(t(labelKey));
    setActiveService(serviceId);
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

  const handleMicPress = () => {
    tamtamFeedback.play('click');
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        // Simulate user message with bilingual transcription
        setMessages(prev => [...prev, { 
          type: 'user', 
          textFr: 'Message vocal de l\'utilisateur...',
          textBa: 'Ohùn ìránṣẹ́ olùmúlò...'
        }]);
        
        tamtamFeedback.play('success');
        
        // Simulate AI response
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            type: 'ai', 
            textFr: 'Voici ma réponse à votre question...',
            textBa: 'Èyí ni ìdáhùn mi sí ìbéèrè rẹ...'
          }]);
        }, 1000);
      }, 2000);
    } else {
      setIsRecording(false);
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
                  onClick={() => handleServiceSelect(service.id, service.labelKey)}
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
            <div className="flex-1 space-y-4 mb-4 min-h-[300px]">
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
            </div>

            {/* Central mic for conversation */}
            <div className="flex justify-center pb-4">
              <TamTamMicButton
                size="lg"
                isRecording={isRecording}
                onPress={handleMicPress}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
