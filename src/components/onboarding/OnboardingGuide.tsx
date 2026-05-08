import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronRight, X, Rocket } from 'lucide-react';

import slideWelcome from '@/assets/onboarding/slide-welcome.jpg';
import slideSocial from '@/assets/onboarding/slide-social.jpg';
import slideTools from '@/assets/onboarding/slide-tools.jpg';
import slideCreate from '@/assets/onboarding/slide-create.jpg';
import slideKeyboardIntro from '@/assets/onboarding/slide-keyboard-intro.jpg';
import slideKeyboardStep1 from '@/assets/onboarding/slide-keyboard-step1.jpg';
import slideKeyboardStep2 from '@/assets/onboarding/slide-keyboard-step2.jpg';
import slideReady from '@/assets/onboarding/slide-ready.jpg';

const SLIDES = [
  {
    image: slideWelcome,
    title: 'Bienvenue sur Fitila 🔥',
    description: 'La première application 100% Bariba. Communiquez, apprenez et créez dans votre langue.',
    section: 'app',
  },
  {
    image: slideSocial,
    title: 'Votre fil social',
    description: 'Publiez des photos, partagez des vidéos et discutez en Bariba avec la communauté TamTam.',
    section: 'app',
  },
  {
    image: slideTools,
    title: 'Outils de langue',
    description: 'Dictionnaire Bariba-Français, traducteur intelligent et cours d\'apprentissage interactifs.',
    section: 'app',
  },
  {
    image: slideCreate,
    title: 'Créez du contenu',
    description: 'Studio Griot, radio communautaire et IA au service de la langue Bariba.',
    section: 'app',
  },
  {
    image: slideKeyboardIntro,
    title: 'Le clavier Bariba ⌨️',
    description: 'Tapez avec les caractères spéciaux Bariba : ɔ ɛ ŋ ã ĩ ũ — directement depuis votre clavier.',
    section: 'keyboard',
  },
  {
    image: slideKeyboardStep1,
    title: 'Activer le clavier',
    description: 'Paramètres → Langue et saisie → Clavier virtuel → Gérer → Activer "Clavier Bariba Fitila".',
    section: 'keyboard',
  },
  {
    image: slideKeyboardStep2,
    title: 'Changer de clavier',
    description: 'Appuyez longuement sur la barre d\'espace ou sur l\'icône 🌐 pour basculer vers le Bariba.',
    section: 'keyboard',
  },
  {
    image: slideReady,
    title: 'Vous êtes prêt ! 🚀',
    description: 'Explorez Fitila et vivez votre culture Bariba au quotidien.',
    section: 'keyboard',
  },
];

const STORAGE_KEY = 'fitila_onboarding_done';

interface OnboardingGuideProps {
  onComplete: () => void;
}

const swipeConfidenceThreshold = 8000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

export default function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const total = SLIDES.length;
  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === total - 1;

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrentSlide((prev) => {
      const next = prev + newDirection;
      if (next < 0) return 0;
      if (next >= total) return prev;
      return next;
    });
  }, [total]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const handleFinish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  }, [onComplete]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipe = swipePower(info.offset.x, info.velocity.x);
    if (swipe < -swipeConfidenceThreshold) {
      paginate(1);
    } else if (swipe > swipeConfidenceThreshold) {
      paginate(-1);
    }
  }, [paginate]);

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  const sectionLabel = slide.section === 'keyboard' ? '⌨️ Clavier Bariba' : '📱 Découverte';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'linear-gradient(180deg, #0d0d14 0%, #1a1020 100%)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
        <span className="text-white/50 text-xs font-medium tracking-wide">{sectionLabel}</span>
        <button onClick={handleSkip} className="flex items-center gap-1 text-white/60 text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 active:bg-white/20 transition-colors">
          <X className="w-3 h-3" />
          Passer
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex flex-col items-center px-6"
          >
            {/* Image */}
            <div className="w-full max-w-xs flex-1 flex items-center justify-center pt-2">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full max-h-[55vh] object-contain rounded-2xl"
                draggable={false}
              />
            </div>

            {/* Text */}
            <div className="w-full max-w-sm text-center pb-4 shrink-0">
              <h2 className="text-white text-xl font-bold mb-2">{slide.title}</h2>
              <p className="text-white/70 text-sm leading-relaxed">{slide.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > currentSlide ? 1 : -1); setCurrentSlide(i); }}
              className="transition-all duration-300"
              style={{
                width: i === currentSlide ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === currentSlide ? '#FF5722' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        {/* Action button */}
        {isLast ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleFinish}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FF5722, #FF7A00)' }}
          >
            <Rocket className="w-5 h-5" />
            Commencer
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => paginate(1)}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FF5722, #FF7A00)' }}
          >
            Suivant
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}

export { STORAGE_KEY as ONBOARDING_STORAGE_KEY };