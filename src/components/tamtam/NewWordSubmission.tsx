import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  Loader2,
  CheckCircle2,
  BookPlus,
  Volume2
} from 'lucide-react';
import { useVocalFeedback, NewWordData } from '@/hooks/useVocalFeedback';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { triggerFeedback } from '@/utils/tamtamFeedback';

interface NewWordSubmissionProps {
  onClose?: () => void;
  initialWord?: string;
}

type RecordingField = 'word' | 'definition' | 'example' | null;

export function NewWordSubmission({ onClose, initialWord = '' }: NewWordSubmissionProps) {
  const { currentLang } = useTamTamLanguage();
  const { submitNewWord, isSubmitting, uploadProgress } = useVocalFeedback();
  const { transcribe } = useUnifiedAudio();
  
  const [isOpen, setIsOpen] = useState(false);
  const [word, setWord] = useState(initialWord);
  const [phonetic, setPhonetic] = useState('');
  const [definition, setDefinition] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('n');
  const [exampleBariba, setExampleBariba] = useState('');
  const [exampleFrancais, setExampleFrancais] = useState('');
  
  const [recordingField, setRecordingField] = useState<RecordingField>(null);
  const [audioBlobs, setAudioBlobs] = useState<Record<string, Blob>>({});
  const [submitted, setSubmitted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const PART_OF_SPEECH_OPTIONS = [
    { value: 'n', label: 'Nom', labelBa: 'Yiru' },
    { value: 'v', label: 'Verbe', labelBa: 'Kobu' },
    { value: 'adj', label: 'Adjectif', labelBa: 'Yirɑ' },
    { value: 'adv', label: 'Adverbe', labelBa: 'Nɛɛ kpindu' },
    { value: 'conj', label: 'Conjonction', labelBa: 'Yɔku' },
    { value: 'prep', label: 'Préposition', labelBa: 'Sɔɔru' },
  ];

  // Start recording for a specific field
  const startRecording = async (field: RecordingField) => {
    if (!field) return;
    
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
        setAudioBlobs(prev => ({ ...prev, [field]: blob }));
        
        // Auto-transcribe and fill the field
        try {
          const base64 = await blobToBase64(blob);
          const result = await transcribe(base64.split(',')[1]);
          if (result) {
            switch (field) {
              case 'word':
                setWord(result);
                break;
              case 'definition':
                setDefinition(result);
                break;
              case 'example':
                setExampleBariba(result);
                break;
            }
          }
        } catch (err) {
          console.error('Transcription error:', err);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecordingField(field);
      triggerFeedback('click');
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingField) {
      mediaRecorderRef.current.stop();
      setRecordingField(null);
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

  // Submit new word
  const handleSubmit = async () => {
    if (!word.trim() || !definition.trim()) {
      return;
    }

    const wordData: NewWordData = {
      word: word.trim(),
      phonetic: phonetic.trim() || undefined,
      definition: definition.trim(),
      partOfSpeech,
      exampleBariba: exampleBariba.trim() || undefined,
      exampleFrancais: exampleFrancais.trim() || undefined,
      audioWordBlob: audioBlobs.word,
      audioDefinitionBlob: audioBlobs.definition,
      audioExampleBlob: audioBlobs.example,
    };

    const success = await submitNewWord(wordData);

    if (success) {
      setSubmitted(true);
      triggerFeedback('success');
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        resetForm();
        onClose?.();
      }, 2000);
    }
  };

  // Reset form
  const resetForm = () => {
    setWord('');
    setPhonetic('');
    setDefinition('');
    setPartOfSpeech('n');
    setExampleBariba('');
    setExampleFrancais('');
    setAudioBlobs({});
  };

  // Mic button component
  const MicButton = ({ field, size = 'sm' }: { field: RecordingField; size?: 'sm' | 'lg' }) => (
    <button
      onClick={() => recordingField === field ? stopRecording() : startRecording(field)}
      className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all ${
        recordingField === field
          ? 'bg-red-500 animate-pulse'
          : 'bg-tamtam-primary/20 hover:bg-tamtam-primary/30'
      } ${size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'}`}
    >
      {recordingField === field ? (
        <MicOff className={`text-white ${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />
      ) : (
        <Mic className={`text-tamtam-primary ${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />
      )}
    </button>
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-medium shadow-lg hover:shadow-xl transition-all"
      >
        <Plus className="w-5 h-5" />
        <span>
          {currentLang === 'ba' ? 'Fi ɔ̀rɔ̀ tuntun kún' : 'Proposer un mot'}
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
              className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-green-500 to-emerald-500">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookPlus className="w-5 h-5" />
                  {currentLang === 'ba' ? 'Ɔ̀rɔ̀ tuntun' : 'Nouveau mot'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
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
                    <h4 className="text-xl font-bold text-gray-800 mb-2">
                      {currentLang === 'ba' ? 'Ó ṣeun!' : 'Merci !'}
                    </h4>
                    <p className="text-gray-500">
                      {currentLang === 'ba' 
                        ? 'Ɔ̀rɔ̀ rẹ ti wọ́lé. A ó ṣàyẹ̀wò rẹ̀.'
                        : 'Votre mot a été soumis pour validation.'}
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Word input */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">
                        {currentLang === 'ba' ? 'Ɔ̀rɔ̀ Bàátɔ̀nú *' : 'Mot bariba *'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={word}
                          onChange={(e) => setWord(e.target.value)}
                          placeholder={currentLang === 'ba' ? 'Kọ ɔ̀rɔ̀ náà...' : 'Tapez le mot...'}
                          className="flex-1 p-3 bg-gray-50 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <MicButton field="word" />
                      </div>
                      {audioBlobs.word && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                          <Volume2 className="w-4 h-4" />
                          Audio enregistré
                        </div>
                      )}
                    </div>

                    {/* Phonetic input */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">
                        {currentLang === 'ba' ? 'Ìró (àyàn)' : 'Phonétique (optionnel)'}
                      </label>
                      <input
                        type="text"
                        value={phonetic}
                        onChange={(e) => setPhonetic(e.target.value)}
                        placeholder="[...]"
                        className="w-full p-3 bg-gray-50 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>

                    {/* Part of speech */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">
                        {currentLang === 'ba' ? 'Ìrísí ɔ̀rɔ̀' : 'Catégorie grammaticale'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PART_OF_SPEECH_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setPartOfSpeech(opt.value)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                              partOfSpeech === opt.value
                                ? 'bg-indigo-500 text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-indigo-50'
                            }`}
                          >
                            {currentLang === 'ba' ? opt.labelBa : opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Definition input */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">
                        {currentLang === 'ba' ? 'Ìtúmọ̀ (Fàránsé) *' : 'Définition (français) *'}
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          value={definition}
                          onChange={(e) => setDefinition(e.target.value)}
                          placeholder={currentLang === 'ba' ? 'Kọ ìtúmọ̀ sí Fàránsé...' : 'Écrivez la définition...'}
                          className="flex-1 p-3 bg-gray-50 rounded-xl text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          rows={2}
                        />
                        <MicButton field="definition" />
                      </div>
                      {audioBlobs.definition && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                          <Volume2 className="w-4 h-4" />
                          Audio enregistré
                        </div>
                      )}
                    </div>

                    {/* Example bariba */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">
                        {currentLang === 'ba' ? 'Àpẹẹrẹ Bàátɔ̀nú' : 'Exemple en bariba'}
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          value={exampleBariba}
                          onChange={(e) => setExampleBariba(e.target.value)}
                          placeholder={currentLang === 'ba' ? 'Kọ gbólóhùn kan...' : 'Écrivez une phrase exemple...'}
                          className="flex-1 p-3 bg-gray-50 rounded-xl text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          rows={2}
                        />
                        <MicButton field="example" />
                      </div>
                      {audioBlobs.example && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                          <Volume2 className="w-4 h-4" />
                          Audio enregistré
                        </div>
                      )}
                    </div>

                    {/* Example français */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 mb-2 block">
                        {currentLang === 'ba' ? 'Ìtumọ̀ àpẹẹrẹ' : 'Traduction de l\'exemple'}
                      </label>
                      <textarea
                        value={exampleFrancais}
                        onChange={(e) => setExampleFrancais(e.target.value)}
                        placeholder={currentLang === 'ba' ? 'Túmọ̀ gbólóhùn náà sí Fàránsé...' : 'Traduisez l\'exemple en français...'}
                        className="w-full p-3 bg-gray-50 rounded-xl text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        rows={2}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {!submitted && (
                <div className="p-4 border-t border-gray-100">
                  {isSubmitting ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-indigo-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{currentLang === 'ba' ? 'Ń fi ránṣẹ́...' : 'Envoi en cours...'}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!word.trim() || !definition.trim()}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                    >
                      <Send className="w-5 h-5" />
                      {currentLang === 'ba' ? 'Fi ránṣẹ́' : 'Soumettre'}
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
