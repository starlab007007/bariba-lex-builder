import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Check, ChevronRight, Volume2, Keyboard } from 'lucide-react';
import { TamTamMicButton } from '@/components/tamtam/TamTamMicButton';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { useMarketJobs, CreateJobInput } from '@/hooks/useMarketJobs';
import { tamtamFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

interface VoiceGuidedJobCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialType?: 'offer' | 'demand';
  prefillData?: Record<string, any>;
}

type Step = 'type' | 'category' | 'title' | 'confirm';

const JOB_CATEGORIES = [
  { id: 'agriculture', emoji: '🚜', labelFr: 'Agriculture', labelBa: 'Àgbẹ̀' },
  { id: 'construction', emoji: '🏗️', labelFr: 'Construction', labelBa: 'Ìkọ́lé' },
  { id: 'transport', emoji: '🚗', labelFr: 'Transport', labelBa: 'Ìrìnnà' },
  { id: 'commerce', emoji: '🛒', labelFr: 'Commerce', labelBa: 'Òwò' },
  { id: 'domestic', emoji: '🏠', labelFr: 'Domestique', labelBa: 'Iṣẹ́ ilé' },
  { id: 'craft', emoji: '🔧', labelFr: 'Artisanat', labelBa: 'Iṣẹ́ ọwọ́' },
  { id: 'education', emoji: '📚', labelFr: 'Éducation', labelBa: 'Ẹ̀kọ́' },
  { id: 'other', emoji: '💼', labelFr: 'Autre', labelBa: 'Mìíràn' },
];

export function VoiceGuidedJobCreator({ isOpen, onClose, onComplete, initialType, prefillData = {} }: VoiceGuidedJobCreatorProps) {
  const [step, setStep] = useState<Step>(initialType ? 'category' : 'type');
  const [jobData, setJobData] = useState<Partial<CreateJobInput>>({
    job_type: initialType
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioPresentationUrl, setAudioPresentationUrl] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [voiceError, setVoiceError] = useState(false);
  
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang } = useBilingualAudio();
  const { createJob, isCreating } = useMarketJobs();

  useEffect(() => {
    if (isOpen) {
      setAudioPresentationUrl(null);
      setVoiceError(false);
      setShowTextInput(false);
      setTextInputValue('');
      
      if (prefillData.category) {
        setJobData({ ...prefillData, job_type: prefillData.job_type || initialType });
        setStep('title');
        speakCurrentLang(currentLang === 'ba' ? 'Sọ orúkọ iṣẹ́ náà' : 'Décrivez le poste');
      } else if (initialType) {
        setStep('category');
        setJobData({ job_type: initialType });
        speakCurrentLang(currentLang === 'ba' ? 'Yan ẹ̀ka iṣẹ́ náà' : 'Choisissez le domaine');
      } else {
        setStep('type');
        setJobData({});
        speakCurrentLang(currentLang === 'ba' ? 'Ṣé o ń pèsè iṣẹ́ tàbí o ń wá iṣẹ́?' : 'Offre ou demande ?');
      }
    }
  }, [isOpen, initialType, prefillData, speakCurrentLang, currentLang]);

  const handleTypeSelect = async (type: 'offer' | 'demand') => {
    tamtamFeedback.play('click');
    setJobData(prev => ({ ...prev, job_type: type }));
    setStep('category');
    await speakCurrentLang(
      currentLang === 'ba' ? 'Yan ẹ̀ka iṣẹ́ náà' : 'Choisissez le domaine'
    );
  };

  const handleCategorySelect = async (category: typeof JOB_CATEGORIES[0]) => {
    tamtamFeedback.play('click');
    setJobData(prev => ({ ...prev, category: category.id, emoji_icon: category.emoji }));
    setStep('title');
    setVoiceError(false);
    setShowTextInput(false);
    await speakCurrentLang(
      currentLang === 'ba' ? 'Sọ orúkọ iṣẹ́ náà' : 'Dites le titre du poste'
    );
  };

  const handleVoiceInput = async (result: { audioBase64: string; transcription?: string; sourceLang: 'ba' | 'fr' }) => {
    if (!result.transcription) {
      setVoiceError(true);
      await speakCurrentLang(currentLang === 'ba' ? 'Mo kò gbọ́. Tún gbìyànjú tàbí kọ ọ́rọ̀' : 'Je n\'ai pas compris. Réessayez ou tapez le texte.');
      return;
    }

    setVoiceError(false);
    setIsProcessing(true);
    tamtamFeedback.play('send');

    await processInput(result.transcription, result.audioBase64, result.sourceLang);
  };

  const handleTextSubmit = async () => {
    if (!textInputValue.trim()) return;
    
    setIsProcessing(true);
    tamtamFeedback.play('send');
    
    await processInput(textInputValue.trim(), '', currentLang);
    setTextInputValue('');
    setShowTextInput(false);
  };

  const processInput = async (text: string, audioBase64: string, sourceLang: 'ba' | 'fr') => {
    try {
      if (step === 'title') {
        let audioUrl = null;
        
        // Upload audio if provided
        if (audioBase64 && audioBase64.length > 100) {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
            { type: 'audio/webm' }
          );
          
          const fileName = `job-${jobData.job_type}-${Date.now()}.webm`;
          const { data: uploadData } = await supabase.storage
            .from('tamtam-audio')
            .upload(fileName, audioBlob);

          if (uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('tamtam-audio')
              .getPublicUrl(uploadData.path);
            audioUrl = publicUrl;
            setAudioPresentationUrl(publicUrl);
          }
        }

        setJobData(prev => ({ 
          ...prev, 
          title_fr: text,
          title_ba: sourceLang === 'ba' ? text : undefined,
          description_text: text,
          audio_presentation_url: audioUrl
        }));
        
        setStep('confirm');
        await speakCurrentLang(currentLang === 'ba' ? 'Jẹ́rìísí àwọn àlàyé rẹ' : 'Vérifiez et confirmez');
      }
    } catch (err) {
      console.error('[VoiceGuidedJobCreator] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    tamtamFeedback.play('send');
    
    const newJob = await createJob(jobData as CreateJobInput);
    
    if (newJob) {
      tamtamFeedback.play('success');
      await speakCurrentLang(
        currentLang === 'ba' 
          ? 'Ó dára! Ìpolówó rẹ ti jẹ́ títẹ̀jáde' 
          : 'Parfait ! Votre annonce est en ligne'
      );
      onComplete();
      onClose();
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['type', 'category', 'title', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      const prevStep = initialType && steps[currentIndex - 1] === 'type' 
        ? 'category' 
        : steps[currentIndex - 1];
      setStep(prevStep);
      setVoiceError(false);
      setShowTextInput(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={e => e.stopPropagation()}
        className="bg-tamtam-bg w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-tamtam-bg px-6 py-4 border-b border-tamtam-border flex items-center justify-between">
          <button onClick={handleBack} className="text-tamtam-text-muted" disabled={step === 'type' || (initialType && step === 'category')}>
            {(step !== 'type' && !(initialType && step === 'category')) && <ChevronRight className="w-6 h-6 rotate-180" />}
          </button>
          <h2 className="text-lg font-bold text-tamtam-text">
            {jobData.job_type === 'offer' 
              ? (currentLang === 'ba' ? 'Pèsè iṣẹ́' : 'Proposer un emploi')
              : jobData.job_type === 'demand'
              ? (currentLang === 'ba' ? 'Wá iṣẹ́' : 'Chercher un emploi')
              : (currentLang === 'ba' ? 'Iṣẹ́' : 'Emploi')
            }
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-tamtam-text-muted" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3">
          <div className="flex gap-1">
            {(initialType ? ['category', 'title', 'confirm'] : ['type', 'category', 'title', 'confirm']).map((s, i, arr) => (
              <div 
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  arr.indexOf(step) >= i 
                    ? 'bg-tamtam-primary' 
                    : 'bg-tamtam-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Type selection */}
            {step === 'type' && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <button
                  onClick={() => handleTypeSelect('offer')}
                  className="w-full p-6 bg-blue-50 rounded-3xl flex items-center gap-4 hover:bg-blue-100 transition-all active:scale-98"
                >
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">💼</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-tamtam-text text-lg">
                      {currentLang === 'ba' ? 'Mo ń pèsè iṣẹ́' : 'Je propose un emploi'}
                    </h3>
                    <p className="text-tamtam-text-muted text-sm">
                      {currentLang === 'ba' ? 'Mo ń wá ènìyàn láti ṣiṣẹ́' : 'Je cherche quelqu\'un pour travailler'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('demand')}
                  className="w-full p-6 bg-green-50 rounded-3xl flex items-center gap-4 hover:bg-green-100 transition-all active:scale-98"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl">🙋</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-tamtam-text text-lg">
                      {currentLang === 'ba' ? 'Mo ń wá iṣẹ́' : 'Je cherche du travail'}
                    </h3>
                    <p className="text-tamtam-text-muted text-sm">
                      {currentLang === 'ba' ? 'Mo fẹ́ ṣiṣẹ́' : 'Je veux travailler'}
                    </p>
                  </div>
                </button>
              </motion.div>
            )}

            {/* Category selection */}
            {step === 'category' && (
              <motion.div
                key="category"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <p className="text-center text-tamtam-text-muted mb-6">
                  {currentLang === 'ba' ? 'Yan ẹ̀ka iṣẹ́' : 'Choisissez le domaine'}
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {JOB_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      className="flex flex-col items-center p-4 bg-tamtam-surface rounded-2xl hover:bg-tamtam-primary/10 transition-all active:scale-95"
                    >
                      <span className="text-4xl mb-2">{cat.emoji}</span>
                      <span className="text-xs text-tamtam-text text-center">
                        {currentLang === 'ba' ? cat.labelBa : cat.labelFr}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Voice input step */}
            {step === 'title' && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  jobData.job_type === 'offer' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  <span className="text-4xl">{jobData.emoji_icon || '💼'}</span>
                </div>

                <p className="text-tamtam-text mb-2 font-medium text-lg">
                  {jobData.job_type === 'offer'
                    ? (currentLang === 'ba' ? 'Ṣàpèjúwe iṣẹ́ náà' : 'Décrivez le poste')
                    : (currentLang === 'ba' ? 'Ṣàpèjúwe ara rẹ' : 'Présentez-vous')
                  }
                </p>

                <p className="text-tamtam-text-muted text-sm mb-6">
                  {currentLang === 'ba' ? 'Tẹ bọ́tìnì náà, kí o sì sọ̀rọ̀' : 'Appuyez et parlez'}
                </p>

                {/* Voice input */}
                {!showTextInput && (
                  <div className="flex flex-col items-center gap-4">
                    <TamTamMicButton
                      size="lg"
                      onRecordingComplete={handleVoiceInput}
                      autoTranscribe={true}
                      autoTranslate={false}
                      sourceLang={currentLang}
                      disabled={isProcessing}
                    />
                    
                    {/* Error feedback with retry and text fallback */}
                    {voiceError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <p className="text-amber-600 text-sm">
                          {currentLang === 'ba' ? 'Kò gbọ́. Gbìyànjú lẹ́ẹ̀kan síi' : 'Pas compris. Réessayez ou tapez'}
                        </p>
                        <button
                          onClick={() => setShowTextInput(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-tamtam-surface rounded-full text-sm text-tamtam-text"
                        >
                          <Keyboard className="w-4 h-4" />
                          {currentLang === 'ba' ? 'Kọ ọ́rọ̀' : 'Taper le texte'}
                        </button>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Text input fallback */}
                {showTextInput && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-3"
                  >
                    <Input
                      value={textInputValue}
                      onChange={(e) => setTextInputValue(e.target.value)}
                      placeholder={currentLang === 'ba' ? 'Orúkọ iṣẹ́ / àpèjúwe...' : 'Titre du poste / description...'}
                      className="text-center text-lg"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setShowTextInput(false);
                          setTextInputValue('');
                        }}
                        className="px-4 py-2 bg-tamtam-surface rounded-xl text-tamtam-text-muted"
                      >
                        {currentLang === 'ba' ? 'Padà' : 'Retour'}
                      </button>
                      <button
                        onClick={handleTextSubmit}
                        disabled={!textInputValue.trim() || isProcessing}
                        className="px-6 py-2 bg-tamtam-primary text-white rounded-xl flex items-center gap-2 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        {currentLang === 'ba' ? 'Tẹ̀síwájú' : 'Continuer'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {isProcessing && (
                  <div className="flex items-center justify-center mt-6 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-tamtam-primary" />
                    <span className="text-tamtam-text-muted">
                      {currentLang === 'ba' ? 'Ń ṣiṣẹ́...' : 'Traitement...'}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Confirmation */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className={`rounded-3xl p-6 mb-6 ${
                  jobData.job_type === 'offer' ? 'bg-blue-50' : 'bg-green-50'
                }`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      jobData.job_type === 'offer' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <span className="text-4xl">{jobData.emoji_icon || '💼'}</span>
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        jobData.job_type === 'offer' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                      }`}>
                        {jobData.job_type === 'offer' 
                          ? (currentLang === 'ba' ? 'Iṣẹ́ tí wọ́n ń pèsè' : 'Offre d\'emploi')
                          : (currentLang === 'ba' ? 'Ẹni tó ń wá iṣẹ́' : 'Demande d\'emploi')
                        }
                      </span>
                      <h3 className="font-bold text-tamtam-text text-lg mt-1">{jobData.title_fr}</h3>
                    </div>
                  </div>

                  {jobData.description_text && (
                    <p className="text-tamtam-text-muted text-sm">{jobData.description_text}</p>
                  )}

                  {audioPresentationUrl && (
                    <button 
                      onClick={() => new Audio(audioPresentationUrl).play()}
                      className="mt-3 flex items-center gap-2 text-tamtam-primary"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="text-sm">{currentLang === 'ba' ? 'Gbọ́ àpèjúwe' : 'Écouter la présentation'}</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={isCreating}
                  className="w-full py-4 bg-tamtam-primary text-white rounded-2xl flex items-center justify-center gap-3 font-medium text-lg"
                >
                  {isCreating ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-6 h-6" />
                      <span>{currentLang === 'ba' ? 'Jẹ́rìísí' : 'Publier'}</span>
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
