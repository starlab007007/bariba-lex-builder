import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useState, useEffect } from 'react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useVoiceMenu } from '@/hooks/useVoiceMenu';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { Volume2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const services = [
  { icon: '💬', labelKey: 'social', path: '/tamtam/social', color: 'bg-emerald-500' },
  { icon: '🤖', labelKey: 'ia', path: '/tamtam/services', color: 'bg-blue-500' },
  { icon: '🛒', labelKey: 'market', path: '/tamtam/market', color: 'bg-orange-500' },
  { icon: '🆘', labelKey: 'sos', path: '/tamtam/sos', color: 'bg-red-500' },
  { icon: '👤', labelKey: 'profile', path: '/tamtam/profile', color: 'bg-gray-500' },
  { icon: '📖', labelKey: 'dictionary', path: '/tamtam/dictionary', color: 'bg-purple-500' },
];

export default function TamTamHome() {
  const navigate = useNavigate();
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const { t, currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang, isSpeaking, health } = useUnifiedAudio();
  const { speakLabel, handleLongPress } = useVoiceMenu();
  const { toast } = useToast();

  useEffect(() => {
    announceAction(t('screenHome'));
  }, [announceAction, t]);

  const handleVoiceCommand = async (result: {
    audioBase64: string;
    transcription?: string;
    translation?: string;
    sourceLang: 'ba' | 'fr';
  }) => {
    setIsProcessingVoice(true);
    triggerFeedback('send');
    
    try {
      // Show transcription feedback
      if (result.transcription) {
        setLastTranscript(result.transcription);
      }
      
      // Send to Raconte-Moi for voice navigation
      const { data, error } = await supabase.functions.invoke('raconte-moi', {
        body: { 
          command: result.transcription || result.translation || '',
          language: currentLang 
        }
      });
      
      if (error) throw error;
      
      // Speak the response
      const responseText = currentLang === 'ba' ? data.response_ba : data.response_fr;
      await speakCurrentLang(responseText);
      
      // Handle navigation
      if (data.type === 'navigate') {
        triggerFeedback('success');
        setTimeout(() => {
          switch (data.value) {
            case 'home': navigate('/tamtam/home'); break;
            case 'social': navigate('/tamtam/social'); break;
            case 'market': navigate('/tamtam/market'); break;
            case 'sos': navigate('/tamtam/sos'); break;
            case 'profile': navigate('/tamtam/profile'); break;
            case 'services': navigate('/tamtam/services'); break;
          }
        }, 1500);
      }
      
      toast({
        title: "🎤 Commande vocale",
        description: result.transcription || "Audio traité"
      });
      
    } catch (err: any) {
      console.error('[TamTamHome] Voice command error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessingVoice(false);
      setTimeout(() => setLastTranscript(null), 5000);
    }
  };

  const handleServiceClick = async (path: string, labelKey: string) => {
    triggerFeedback('click');
    await speakCurrentLang(t(labelKey));
    navigate(path);
  };

  const handleSpeakLabel = async (labelKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerFeedback('click');
    await speakLabel(labelKey);
  };

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pt-8 pb-32">
      {/* Health status indicator */}
      {health && (
        <div className="absolute top-4 right-4 flex gap-1">
          <div className={`w-2 h-2 rounded-full ${health.baribaTTS.status === 'healthy' ? 'bg-green-500' : health.baribaTTS.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} title="TTS Bariba" />
          <div className={`w-2 h-2 rounded-full ${health.frenchTTS.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} title="TTS Français" />
          <div className={`w-2 h-2 rounded-full ${health.translation.status === 'healthy' ? 'bg-green-500' : health.translation.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} title="Traduction" />
        </div>
      )}

      {/* Welcome visual with translated greeting */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="text-4xl mb-2">👋</div>
        <h1 className="text-xl font-bold text-tamtam-text">
          {t('welcomeHome')}
        </h1>
        <p className="text-sm text-tamtam-text-muted mt-1">
          {t('tapToSpeak')}
        </p>
      </motion.div>

      {/* Giant central mic with full voice pipeline */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="flex flex-col items-center mb-6"
      >
        <TamTamMicButton
          size="xl"
          onRecordingComplete={handleVoiceCommand}
          autoTranscribe={true}
          autoTranslate={true}
          sourceLang={currentLang}
          disabled={isProcessingVoice}
        />
        
        {/* Processing indicator */}
        {isProcessingVoice && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-tamtam-primary"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{t('processing')}</span>
          </motion.div>
        )}
        
        {/* Transcription feedback */}
        {lastTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-tamtam-surface rounded-2xl px-4 py-2 shadow-tamtam-soft max-w-xs"
          >
            <p className="text-sm text-tamtam-text text-center">"{lastTranscript}"</p>
          </motion.div>
        )}
      </motion.div>

      {/* Services grid - 2x3 with translated labels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-4 max-w-md mx-auto"
      >
        {services.map((service, index) => {
          const longPressHandlers = handleLongPress(service.labelKey as any);
          
          return (
            <motion.button
              key={service.labelKey}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              onClick={() => handleServiceClick(service.path, service.labelKey)}
              {...longPressHandlers}
              className="aspect-square bg-tamtam-surface rounded-3xl shadow-tamtam-soft flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform relative"
            >
              {/* Icon badge */}
              <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center`}>
                <span className="text-2xl">{service.icon}</span>
              </div>
              
              {/* Label in current language */}
              <span className="text-xs font-medium text-tamtam-text truncate px-2">
                {t(service.labelKey)}
              </span>

              {/* Audio button */}
              <button
                onClick={(e) => handleSpeakLabel(service.labelKey, e)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
              >
                {isSpeaking ? (
                  <Loader2 className="w-3 h-3 text-tamtam-primary animate-spin" />
                ) : (
                  <Volume2 className="w-3 h-3 text-tamtam-primary" />
                )}
              </button>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Language indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center mt-8"
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-tamtam-surface rounded-full shadow-tamtam-soft">
          <span className="text-lg">🌐</span>
          <span className="text-sm font-medium text-tamtam-text">
            {currentLang === 'ba' ? 'Bàátɔ̀nú' : 'Français'}
          </span>
        </span>
      </motion.div>
    </div>
  );
}
