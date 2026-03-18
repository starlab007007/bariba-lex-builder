import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Video, Camera, Check, ChevronRight, ChevronLeft, Volume2, Pause, Play, Loader2 } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useBaribaTTS } from '@/hooks/useBaribaTTS';
import { useUnifiedAudio } from '@/hooks/useUnifiedAudio';
import { Progress } from '@/components/ui/progress';
import { triggerFeedback } from '@/utils/tamtamFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TemplateStep {
  step: number;
  instruction_fr: string;
  instruction_ba: string;
  duration: number;
  type: 'audio' | 'video' | 'photo';
}

interface CreationTemplate {
  id: string;
  template_key: string;
  icon: string;
  label_fr: string;
  label_ba: string | null;
  category: string;
  steps: TemplateStep[];
  music_url: string | null;
}

interface VoiceGuidedCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    audio_url: string;
    media_url?: string;
    transcript_fr?: string;
    transcript_ba?: string;
    template_id: string;
    topic: string;
    duration_seconds: number;
  }) => Promise<void>;
}

export const VoiceGuidedCreator: React.FC<VoiceGuidedCreatorProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speak: speakFrench, isSpeaking: isSpeakingFr } = useFrenchTTS();
  const { speak: speakBariba, isSpeaking: isSpeakingBa } = useBaribaTTS();
  const { transcribeWithTranslation } = useUnifiedAudio();
  const { toast } = useToast();

  // States
  const [templates, setTemplates] = useState<CreationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CreationTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<{ step: number; blob: Blob; type: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState<'select' | 'record' | 'preview'>('select');

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('tamtam_creation_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;
      
      // Parse steps JSON
      const parsed = (data || []).map(t => ({
        ...t,
        steps: typeof t.steps === 'string' ? JSON.parse(t.steps) : t.steps
      }));
      
      setTemplates(parsed);
    } catch (err) {
      console.error('[VoiceGuidedCreator] Error fetching templates:', err);
    }
  };

  // Speak instruction when step changes
  useEffect(() => {
    if (selectedTemplate && phase === 'record') {
      speakInstruction();
    }
  }, [currentStep, selectedTemplate, phase]);

  const speakInstruction = async () => {
    if (!selectedTemplate) return;
    
    const step = selectedTemplate.steps[currentStep];
    if (!step) return;

    const instruction = currentLang === 'ba' ? step.instruction_ba : step.instruction_fr;
    
    if (currentLang === 'ba') {
      await speakBariba(instruction);
    } else {
      await speakFrench(instruction);
    }
  };

  const selectTemplate = (template: CreationTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep(0);
    setCapturedMedia([]);
    setPhase('record');
    triggerFeedback('notification');
  };

  const startRecording = async () => {
    if (!selectedTemplate) return;
    
    const step = selectedTemplate.steps[currentStep];
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: step.type === 'video' || step.type === 'photo'
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: step.type === 'audio' ? 'audio/webm' : 'video/webm'
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: step.type === 'audio' ? 'audio/webm' : 'video/webm' 
        });
        setCapturedMedia(prev => [...prev, { step: currentStep, blob, type: step.type }]);
        stopStream();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingProgress(0);
      
      // Progress timer
      const duration = step.duration * 1000;
      const interval = 100;
      let elapsed = 0;
      
      timerRef.current = setInterval(() => {
        elapsed += interval;
        setRecordingProgress((elapsed / duration) * 100);
        
        if (elapsed >= duration) {
          stopRecording();
        }
      }, interval);

      triggerFeedback('notification');
    } catch (err) {
      console.error('[VoiceGuidedCreator] Error starting recording:', err);
      toast({ title: "Erreur", description: "Impossible d'accéder à la caméra/micro", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setRecordingProgress(100);
    triggerFeedback('success');
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const nextStep = () => {
    if (!selectedTemplate) return;
    
    if (currentStep < selectedTemplate.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setRecordingProgress(0);
    } else {
      setPhase('preview');
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      // Remove captured media for this step
      setCapturedMedia(prev => prev.filter(m => m.step !== currentStep));
      setRecordingProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || capturedMedia.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      // Combine all audio/video segments
      const audioBlobs = capturedMedia.filter(m => m.type === 'audio').map(m => m.blob);
      const videoBlobs = capturedMedia.filter(m => m.type === 'video').map(m => m.blob);
      
      // For simplicity, use the first media as main content
      const mainBlob = capturedMedia[0].blob;
      const isVideo = capturedMedia.some(m => m.type === 'video');
      
      // Upload main media
      const fileName = `template_${selectedTemplate.template_key}_${Date.now()}.${isVideo ? 'webm' : 'webm'}`;
      
      const { error: uploadError } = await supabase.storage
        .from('tamtam-audio')
        .upload(fileName, mainBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tamtam-audio')
        .getPublicUrl(fileName);

      // Transcribe if it's audio
      let transcript_fr: string | undefined;
      let transcript_ba: string | undefined;
      
      if (!isVideo && mainBlob) {
        try {
          const base64 = await blobToBase64(mainBlob);
          const result = await transcribeWithTranslation(base64, currentLang === 'ba' ? 'ba' : 'fr');
          transcript_fr = result.transcription_fr || result.transcription;
          transcript_ba = result.transcription_ba;
        } catch (e) {
          console.warn('[VoiceGuidedCreator] Transcription failed:', e);
        }
      }

      // Calculate total duration
      const totalDuration = selectedTemplate.steps.reduce((sum, s) => sum + s.duration, 0);

      await onComplete({
        audio_url: urlData.publicUrl,
        media_url: isVideo ? urlData.publicUrl : undefined,
        transcript_fr,
        transcript_ba,
        template_id: selectedTemplate.template_key,
        topic: selectedTemplate.category,
        duration_seconds: totalDuration
      });

      // Update template usage count
      await supabase
        .from('tamtam_creation_templates')
        .update({ usage_count: (selectedTemplate as any).usage_count + 1 })
        .eq('id', selectedTemplate.id);

      toast({ title: "✅ Publication créée !" });
      handleClose();
    } catch (err: any) {
      console.error('[VoiceGuidedCreator] Submit error:', err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleClose = () => {
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedTemplate(null);
    setCurrentStep(0);
    setCapturedMedia([]);
    setPhase('select');
    setIsRecording(false);
    onClose();
  };

  if (!isOpen) return null;

  const isSpeaking = isSpeakingFr || isSpeakingBa;
  const currentStepData = selectedTemplate?.steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <span className="text-2xl">{selectedTemplate.icon}</span>
            )}
            <h3 className="text-lg font-semibold">
              {phase === 'select' && (currentLang === 'ba' ? 'Yan àwòrán' : 'Choisir un modèle')}
              {phase === 'record' && selectedTemplate && (
                currentLang === 'ba' ? selectedTemplate.label_ba : selectedTemplate.label_fr
              )}
              {phase === 'preview' && (currentLang === 'ba' ? 'Ṣàyẹ̀wò' : 'Aperçu')}
            </h3>
          </div>
          <button onClick={handleClose} className="p-2 rounded-full bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {/* Phase 1: Template Selection */}
            {phase === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-2 gap-3"
              >
                {templates.map(template => (
                  <motion.button
                    key={template.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => selectTemplate(template)}
                    className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center gap-2 transition-colors"
                  >
                    <span className="text-4xl">{template.icon}</span>
                    <span className="font-medium text-sm text-center">
                      {currentLang === 'ba' ? template.label_ba : template.label_fr}
                    </span>
                    <span className="text-xs text-gray-500">
                      {template.steps.length} étapes
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* Phase 2: Recording Steps */}
            {phase === 'record' && selectedTemplate && currentStepData && (
              <motion.div
                key="record"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Step indicator */}
                <div className="flex items-center justify-center gap-2">
                  {selectedTemplate.steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentStep
                          ? 'bg-blue-500 w-4'
                          : idx < currentStep
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Step info */}
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-500">
                    Étape {currentStep + 1} / {selectedTemplate.steps.length}
                  </p>
                  
                  {/* Instruction with speaker */}
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={isSpeaking ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                      <Volume2 className={`w-5 h-5 ${isSpeaking ? 'text-blue-500' : 'text-gray-400'}`} />
                    </motion.div>
                    <p className="text-lg font-medium">
                      {currentLang === 'ba' ? currentStepData.instruction_ba : currentStepData.instruction_fr}
                    </p>
                  </div>

                  <p className="text-sm text-gray-400">
                    {currentStepData.duration} secondes
                  </p>
                </div>

                {/* Video preview / Recording area */}
                <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden">
                  {currentStepData.type !== 'audio' && (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {currentStepData.type === 'audio' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={isRecording ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center"
                      >
                        <Mic className={`w-12 h-12 ${isRecording ? 'text-red-500' : 'text-white'}`} />
                      </motion.div>
                    </div>
                  )}

                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-red-500 text-white">
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="w-2 h-2 rounded-full bg-white"
                      />
                      <span className="text-sm font-medium">REC</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <Progress value={recordingProgress} className="h-2" />

                {/* Recording controls */}
                <div className="flex items-center justify-center gap-4">
                  {!isRecording && !capturedMedia.find(m => m.step === currentStep) && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={startRecording}
                      disabled={isSpeaking}
                      className="px-6 py-3 bg-red-500 text-white rounded-full font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {currentStepData.type === 'video' ? (
                        <Video className="w-5 h-5" />
                      ) : currentStepData.type === 'photo' ? (
                        <Camera className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                      <span>Enregistrer</span>
                    </motion.button>
                  )}

                  {isRecording && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={stopRecording}
                      className="px-6 py-3 bg-gray-800 text-white rounded-full font-medium flex items-center gap-2"
                    >
                      <Pause className="w-5 h-5" />
                      <span>Arrêter</span>
                    </motion.button>
                  )}

                  {capturedMedia.find(m => m.step === currentStep) && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span>Enregistré</span>
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={previousStep}
                    disabled={currentStep === 0}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Précédent</span>
                  </button>

                  <button
                    onClick={nextStep}
                    disabled={!capturedMedia.find(m => m.step === currentStep)}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-full disabled:opacity-50"
                  >
                    <span>{currentStep === selectedTemplate.steps.length - 1 ? 'Terminer' : 'Suivant'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Phase 3: Preview */}
            {phase === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-semibold mb-2">
                    {currentLang === 'ba' ? 'Ti parí!' : 'Terminé !'}
                  </h4>
                  <p className="text-gray-500">
                    {capturedMedia.length} segment(s) enregistré(s)
                  </p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Publication...</span>
                    </>
                  ) : (
                    <span>{currentLang === 'ba' ? 'Tẹ̀jáde' : 'Publier'}</span>
                  )}
                </motion.button>

                <button
                  onClick={() => setPhase('record')}
                  className="w-full py-3 text-gray-600"
                >
                  ← Modifier
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
