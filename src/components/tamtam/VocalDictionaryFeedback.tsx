import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquarePlus, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Type,
  Volume2,
  Edit3
} from 'lucide-react';
import { PhoneticEntry } from '@/hooks/usePhoneticSuggestions';
import { useVocalFeedback } from '@/hooks/useVocalFeedback';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface VocalDictionaryFeedbackProps {
  entry: PhoneticEntry;
  onClose?: () => void;
}

type FeedbackType = 'correction' | 'suggestion' | 'error' | 'audio_quality';
type FeedbackMode = 'text' | 'audio' | 'mixed';

const FEEDBACK_FIELDS = [
  { id: 'word', label: 'Mot', labelBa: 'Yenu' },
  { id: 'phonetic', label: 'Phonétique', labelBa: 'Nɔɔseeru' },
  { id: 'definition', label: 'Définition', labelBa: 'Nɛɛmɔ' },
  { id: 'example_bariba', label: 'Exemple bariba', labelBa: 'Yirɑ Bàátɔ̀nú' },
  { id: 'example_francais', label: 'Exemple français', labelBa: 'Yirɑ Fãsei' },
];

export function VocalDictionaryFeedback({ entry, onClose }: VocalDictionaryFeedbackProps) {
  const { currentLang } = useTamTamLanguage();
  const { submitFeedback, isSubmitting, uploadProgress } = useVocalFeedback();
  const { transcribe, isSpeaking } = useUnifiedAudio();
  
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('correction');
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('text');
  const [selectedField, setSelectedField] = useState<string>('definition');
  const [textFeedback, setTextFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioTranscription, setAudioTranscription] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Auto-transcribe
        try {
          const base64 = await blobToBase64(blob);
          const result = await transcribe(base64.split(',')[1]);
          if (result) {
            setAudioTranscription(result);
          }
        } catch (err) {
          console.error('Transcription error:', err);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      triggerFeedback('click');
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      triggerFeedback('success');
    }
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Submit feedback
  const handleSubmit = async () => {
    // Use entry.id if available, otherwise use the word (hook will lookup the ID)
    const entryId = entry.id || entry.word;
    
    const success = await submitFeedback({
      entryId,
      feedbackType,
      fieldName: selectedField,
      textFeedback: textFeedback || audioTranscription,
      audioBlob: audioBlob || undefined,
      audioTranscription: audioTranscription || undefined,
      sourceLang: currentLang
    });

    if (success) {
      setSubmitted(true);
      triggerFeedback('success');
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        resetForm();
      }, 2000);
    }
  };

  // Reset form
  const resetForm = () => {
    setTextFeedback('');
    setAudioBlob(null);
    setAudioTranscription('');
    setSelectedField('definition');
    setFeedbackType('correction');
    setFeedbackMode('text');
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-tamtam-bg hover:bg-tamtam-primary/10 rounded-xl text-tamtam-text-muted hover:text-tamtam-primary transition-colors"
      >
        <Edit3 className="w-4 h-4" />
        <span className="text-sm">
          {currentLang === 'ba' ? 'Gbɛgbɛru' : 'Corriger'}
        </span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-tamtam-surface rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-tamtam-bg">
                <h3 className="text-lg font-bold text-tamtam-text flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-tamtam-primary" />
                  {currentLang === 'ba' ? 'Nɛɛru yira' : 'Donner un feedback'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-tamtam-bg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {submitted ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h4 className="text-xl font-bold text-tamtam-text mb-2">
                      {currentLang === 'ba' ? 'A nii koo!' : 'Merci !'}
                    </h4>
                    <p className="text-tamtam-text-muted">
                      {currentLang === 'ba' ? 'Wunɛn nɛɛru ya gɔrima' : 'Votre feedback a été envoyé'}
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Entry info */}
                    <div className="p-3 bg-tamtam-bg rounded-xl">
                      <p className="text-sm text-tamtam-text-muted">
                        {currentLang === 'ba' ? 'Yenu' : 'Mot'}:
                      </p>
                      <p className="font-bold text-tamtam-text">{entry.word}</p>
                      <p className="text-sm text-tamtam-text-muted mt-1">{entry.definition}</p>
                    </div>

                    {/* Field selector */}
                    <div>
                      <label className="text-sm font-medium text-tamtam-text-muted mb-2 block">
                        {currentLang === 'ba' ? 'Kpindu gbɛgbɛru' : 'Champ à corriger'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {FEEDBACK_FIELDS.map((field) => (
                          <button
                            key={field.id}
                            onClick={() => setSelectedField(field.id)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                              selectedField === field.id
                                ? 'bg-tamtam-primary text-white'
                                : 'bg-tamtam-bg text-tamtam-text-muted hover:bg-tamtam-primary/20'
                            }`}
                          >
                            {currentLang === 'ba' ? field.labelBa : field.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Feedback mode */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFeedbackMode('text')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                          feedbackMode === 'text'
                            ? 'bg-tamtam-primary text-white'
                            : 'bg-tamtam-bg text-tamtam-text-muted'
                        }`}
                      >
                        <Type className="w-4 h-4" />
                        {currentLang === 'ba' ? 'Kɔ̃siru' : 'Texte'}
                      </button>
                      <button
                        onClick={() => setFeedbackMode('audio')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                          feedbackMode === 'audio'
                            ? 'bg-tamtam-primary text-white'
                            : 'bg-tamtam-bg text-tamtam-text-muted'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        {currentLang === 'ba' ? 'Nɔɔ' : 'Audio'}
                      </button>
                    </div>

                    {/* Text input */}
                    {(feedbackMode === 'text' || feedbackMode === 'mixed') && (
                      <div>
                        <textarea
                          value={textFeedback}
                          onChange={(e) => setTextFeedback(e.target.value)}
                           placeholder={currentLang === 'ba' 
                             ? 'Wunɛn gbɛgbɛru kɔ̃si...'
                            : 'Écrivez votre correction ici...'}
                          className="w-full p-4 bg-tamtam-bg rounded-xl text-tamtam-text placeholder:text-tamtam-text-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-tamtam-primary/50"
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Audio input */}
                    {(feedbackMode === 'audio' || feedbackMode === 'mixed') && (
                      <div className="space-y-3">
                        <div className="flex justify-center">
                          <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                              isRecording
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-tamtam-primary hover:bg-tamtam-primary/90'
                            }`}
                          >
                            {isRecording ? (
                              <MicOff className="w-8 h-8 text-white" />
                            ) : (
                              <Mic className="w-8 h-8 text-white" />
                            )}
                          </button>
                        </div>
                        
                        <p className="text-center text-sm text-tamtam-text-muted">
                          {isRecording 
                            ? (currentLang === 'ba' ? 'Gɑ mɑɑrumɔ...' : 'Enregistrement...')
                            : (currentLang === 'ba' ? 'Tɛ̀ kɑ mɑɑru' : 'Appuyez pour enregistrer')}
                        </p>

                        {/* Audio preview */}
                        {audioBlob && !isRecording && (
                          <div className="p-3 bg-tamtam-bg rounded-xl">
                            <p className="text-sm text-tamtam-text-muted mb-2">
                              {currentLang === 'ba' ? 'Wunɛn nɔɔ:' : 'Votre audio:'}
                            </p>
                            <audio 
                              controls 
                              src={URL.createObjectURL(audioBlob)}
                              className="w-full h-10"
                            />
                            {audioTranscription && (
                              <p className="mt-2 text-sm text-tamtam-text italic">
                                "{audioTranscription}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              {!submitted && (
                <div className="p-4 border-t border-tamtam-bg">
                  {isSubmitting ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-tamtam-primary">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{currentLang === 'ba' ? 'Gɑ gɔrimɔ...' : 'Envoi en cours...'}</span>
                      </div>
                      <div className="h-2 bg-tamtam-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-tamtam-primary transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!textFeedback && !audioBlob}
                      className="w-full py-4 bg-tamtam-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-tamtam-primary/90 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                      {currentLang === 'ba' ? 'Fi ránṣẹ́' : 'Envoyer'}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
