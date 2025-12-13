import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, Mic, Check, Send } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { SmartVoiceRecorder } from '@/components/voice/SmartVoiceRecorder';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PollOption {
  id: string;
  audioUrl?: string;
  audioBase64?: string;
  transcript?: string;
  votes: number;
}

interface TamTamVocalPollProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pollData: {
    question_audio_url: string;
    options: { audio_url: string; transcript?: string }[];
  }) => Promise<void>;
}

export const TamTamVocalPoll: React.FC<TamTamVocalPollProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { t } = useTamTamLanguage();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'question' | 'options' | 'preview'>('question');
  const [questionAudio, setQuestionAudio] = useState<string | null>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuestionRecorded = (base64: string) => {
    setQuestionAudio(base64);
    triggerFeedback('success');
    setStep('options');
    setOptions([
      { id: '1', votes: 0 },
      { id: '2', votes: 0 },
    ]);
  };

  const handleOptionRecorded = (base64: string) => {
    triggerFeedback('record');
    setOptions(prev => prev.map((opt, idx) => 
      idx === currentOptionIndex 
        ? { ...opt, audioBase64: base64 } 
        : opt
    ));
    
    if (currentOptionIndex < options.length - 1) {
      setCurrentOptionIndex(prev => prev + 1);
    } else {
      setStep('preview');
    }
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions(prev => [...prev, { id: String(prev.length + 1), votes: 0 }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  };

  const handleSubmit = async () => {
    if (!questionAudio || options.some(o => !o.audioBase64)) {
      toast({ title: "Enregistrez tous les audios", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload question audio
      const questionBlob = base64ToBlob(questionAudio, 'audio/webm');
      const questionFileName = `poll_question_${Date.now()}.webm`;
      
      const { error: qError } = await supabase.storage
        .from('yovo-audio')
        .upload(questionFileName, questionBlob, { contentType: 'audio/webm' });
      
      if (qError) throw qError;

      const { data: questionUrl } = supabase.storage
        .from('yovo-audio')
        .getPublicUrl(questionFileName);

      // Upload options
      const uploadedOptions = await Promise.all(
        options.map(async (opt, idx) => {
          if (!opt.audioBase64) throw new Error('Missing audio');
          
          const blob = base64ToBlob(opt.audioBase64, 'audio/webm');
          const fileName = `poll_option_${Date.now()}_${idx}.webm`;
          
          await supabase.storage
            .from('yovo-audio')
            .upload(fileName, blob, { contentType: 'audio/webm' });
          
          const { data: url } = supabase.storage
            .from('yovo-audio')
            .getPublicUrl(fileName);
          
          return { audio_url: url.publicUrl, transcript: opt.transcript };
        })
      );

      await onSubmit({
        question_audio_url: questionUrl.publicUrl,
        options: uploadedOptions
      });

      triggerFeedback('success');
      toast({ title: "🗳️ Sondage créé !" });
      onClose();
    } catch (err: any) {
      triggerFeedback('error');
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl min-h-[70vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              Sondage Vocal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Record Question */}
            {step === 'question' && (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                <div className="text-6xl mb-4">❓</div>
                <h4 className="text-xl font-medium text-gray-800">
                  Posez votre question
                </h4>
                <p className="text-gray-500">
                  Enregistrez votre question vocalement
                </p>
                
                <div className="py-8">
                  <SmartVoiceRecorder
                    onRecordingComplete={handleQuestionRecorded}
                    language="french"
                  />
                </div>

                {questionAudio && (
                  <div className="flex items-center justify-center gap-2 text-emerald-500">
                    <Check className="w-5 h-5" />
                    <span>Question enregistrée</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Record Options */}
            {step === 'options' && (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h4 className="text-xl font-medium text-gray-800">
                    Option {currentOptionIndex + 1} sur {options.length}
                  </h4>
                  <p className="text-gray-500 mt-1">
                    Enregistrez chaque choix possible
                  </p>
                </div>

                {/* Progress */}
                <div className="flex gap-2">
                  {options.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className={`flex-1 h-2 rounded-full ${
                        opt.audioBase64 
                          ? 'bg-emerald-500' 
                          : idx === currentOptionIndex 
                            ? 'bg-orange-400' 
                            : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                <div className="py-6">
                  <SmartVoiceRecorder
                    onRecordingComplete={handleOptionRecorded}
                    language="french"
                  />
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={addOption}
                    disabled={options.length >= 5}
                    className="px-4 py-2 text-blue-500 font-medium disabled:opacity-50"
                  >
                    + Ajouter option
                  </button>
                  
                  {options.every(o => o.audioBase64) && (
                    <button
                      onClick={() => setStep('preview')}
                      className="px-6 py-2 bg-blue-500 text-white rounded-xl font-medium"
                    >
                      Suivant
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h4 className="text-xl font-medium text-gray-800 text-center">
                  Aperçu du sondage
                </h4>

                {/* Question preview */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">❓</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Votre question</p>
                      <p className="text-sm text-gray-500">Audio enregistré</p>
                    </div>
                    <Check className="w-6 h-6 text-emerald-500" />
                  </div>
                </div>

                {/* Options preview */}
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-700">Option {idx + 1}</p>
                      </div>
                      {opt.audioBase64 && <Check className="w-5 h-5 text-emerald-500" />}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div className="p-4 border-t border-gray-100">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Publier le sondage
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
