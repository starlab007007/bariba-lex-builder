import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Volume2, Check, Mic, MessageCircle, Camera, Users } from 'lucide-react';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

interface TutorialStep {
  id: string;
  icon: React.ReactNode;
  titleFr: string;
  titleBa: string;
  descriptionFr: string;
  descriptionBa: string;
  color: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    icon: <span className="text-4xl">👋</span>,
    titleFr: 'Bienvenue sur TAM-TAM !',
    titleBa: 'Kú àbọ̀ sí TAM-TAM !',
    descriptionFr: 'TAM-TAM est une plateforme vocale conçue pour vous. Pas besoin de savoir lire ou écrire, utilisez simplement votre voix !',
    descriptionBa: 'TAM-TAM jẹ́ pẹpẹ ohùn tí a ṣe fún ọ. Kò nílò láti kà tàbí kọ, lo ohùn rẹ nìkan!',
    color: 'from-blue-500 to-purple-600'
  },
  {
    id: 'microphone',
    icon: <Mic className="w-10 h-10 text-white" />,
    titleFr: 'Parlez pour agir',
    titleBa: 'Sọ̀rọ̀ láti ṣe',
    descriptionFr: 'Appuyez sur le grand microphone au centre pour enregistrer votre message. Parlez naturellement, TAM-TAM vous comprend !',
    descriptionBa: 'Tẹ maikirofoonu ńlá ní àárín láti gba ohùn rẹ sílẹ̀. Sọ̀rọ̀ bí ó ṣe yẹ, TAM-TAM yóò gbọ́ ọ!',
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'social',
    icon: <Users className="w-10 h-10 text-white" />,
    titleFr: 'Connectez-vous avec les autres',
    titleBa: 'So ara rẹ pọ̀ mọ́ àwọn ẹlòmíràn',
    descriptionFr: 'Partagez des photos et des messages vocaux avec vos amis. Écoutez ce que les autres publient !',
    descriptionBa: 'Pin àwòrán àti ọ̀rọ̀ ohùn pẹ̀lú àwọn ọ̀rẹ́ rẹ. Gbọ́ ohun tí àwọn ẹlòmíràn ń sọ!',
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 'stories',
    icon: <Camera className="w-10 h-10 text-white" />,
    titleFr: 'Créez des Stories',
    titleBa: 'Ṣẹ̀dá Ìtàn',
    descriptionFr: 'Partagez des moments qui disparaissent après 24h. Ajoutez une photo et enregistrez votre voix !',
    descriptionBa: 'Pin àwọn àkókò tí yóò pàdánù lẹ́yìn wákàtí 24. Fi àwòrán kun kí o sì gba ohùn rẹ sílẹ̀!',
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'assistant',
    icon: <MessageCircle className="w-10 h-10 text-white" />,
    titleFr: 'Demandez à Raconte-Moi',
    titleBa: 'Béèrè lọ́wọ́ Raconte-Moi',
    descriptionFr: 'Notre assistant vocal vous aide à naviguer. Dites simplement ce que vous voulez faire !',
    descriptionBa: 'Olùrànlọ́wọ́ ohùn wa yóò ràn ọ́ lọ́wọ́. Kan sọ ohun tí o fẹ́ ṣe!',
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'ready',
    icon: <Check className="w-10 h-10 text-white" />,
    titleFr: 'Vous êtes prêt !',
    titleBa: 'O ti ṣetán!',
    descriptionFr: 'C\'est tout ce dont vous avez besoin pour commencer. Amusez-vous sur TAM-TAM !',
    descriptionBa: 'Ìyẹn ni ohun gbogbo tí o nílò láti bẹ̀rẹ̀. Gbádùn ara rẹ lórí TAM-TAM!',
    color: 'from-green-500 to-teal-600'
  }
];

interface TamTamTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const TamTamTutorial: React.FC<TamTamTutorialProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { currentLang } = useTamTamLanguage();
  const { speakCurrentLang, isSpeaking } = useBilingualAudio();
  const [currentStep, setCurrentStep] = useState(0);
  const [hasListened, setHasListened] = useState<Record<string, boolean>>({});

  const step = tutorialSteps[currentStep];

  // Auto-play audio when step changes
  useEffect(() => {
    if (isOpen && step) {
      const text = currentLang === 'ba' 
        ? `${step.titleBa}. ${step.descriptionBa}`
        : `${step.titleFr}. ${step.descriptionFr}`;
      
      speakCurrentLang(text);
      setHasListened(prev => ({ ...prev, [step.id]: true }));
    }
  }, [currentStep, isOpen, currentLang]);

  const handleNext = useCallback(() => {
    tamtamFeedback.play('click');
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      tamtamFeedback.play('success');
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handlePrev = useCallback(() => {
    tamtamFeedback.play('click');
    if (currentStep > 0) {
      setCurrentStep(c => c - 1);
    }
  }, [currentStep]);

  const handleReplay = useCallback(() => {
    tamtamFeedback.play('click');
    const text = currentLang === 'ba' 
      ? `${step.titleBa}. ${step.descriptionBa}`
      : `${step.titleFr}. ${step.descriptionFr}`;
    speakCurrentLang(text);
  }, [step, currentLang, speakCurrentLang]);

  const handleSkip = useCallback(() => {
    tamtamFeedback.play('click');
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-50 flex flex-col"
        >
          {/* Progress dots */}
          <div className="flex justify-center gap-2 p-4 pt-8">
            {tutorialSteps.map((s, idx) => (
              <div
                key={s.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-white'
                    : idx < currentStep
                      ? 'bg-white/60'
                      : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 px-4 py-2 text-white/60 text-sm"
          >
            {currentLang === 'ba' ? 'Fò' : 'Passer'}
          </button>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                {/* Icon */}
                <motion.div
                  className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${step.color} mx-auto mb-6 flex items-center justify-center shadow-lg`}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {step.icon}
                </motion.div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-4">
                  {currentLang === 'ba' ? step.titleBa : step.titleFr}
                </h2>

                {/* Description */}
                <p className="text-white/80 text-lg leading-relaxed max-w-md">
                  {currentLang === 'ba' ? step.descriptionBa : step.descriptionFr}
                </p>

                {/* Replay button */}
                <button
                  onClick={handleReplay}
                  disabled={isSpeaking}
                  className="mt-6 flex items-center gap-2 mx-auto px-4 py-2 bg-white/10 rounded-full text-white"
                >
                  <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  <span>{currentLang === 'ba' ? 'Tún gbọ́' : 'Réécouter'}</span>
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="p-6 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                currentStep === 0 ? 'bg-white/10 opacity-50' : 'bg-white/20'
              }`}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={handleNext}
              className={`px-8 py-4 rounded-full font-bold text-white bg-gradient-to-r ${step.color}`}
            >
              {currentStep === tutorialSteps.length - 1
                ? (currentLang === 'ba' ? 'Bẹ̀rẹ̀!' : 'Commencer !')
                : (currentLang === 'ba' ? 'Tẹ̀síwájú' : 'Suivant')
              }
            </button>

            <button
              onClick={handleNext}
              className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
