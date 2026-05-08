import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Volume2, VolumeX, Rocket } from 'lucide-react';
import { TOUR_STEPS, type TourStep } from './tourSteps';
import slideKeyboardIntro from '@/assets/onboarding/slide-keyboard-intro.jpg';
import slideKeyboardStep1 from '@/assets/onboarding/slide-keyboard-step1.jpg';
import slideKeyboardStep2 from '@/assets/onboarding/slide-keyboard-step2.jpg';

const KEYBOARD_IMAGES: Record<string, string> = {
  'keyboard-intro': slideKeyboardIntro,
  'keyboard-step1': slideKeyboardStep1,
  'keyboard-step2': slideKeyboardStep2,
};

interface TourSpotlightProps {
  currentStep: number;
  totalSteps: number;
  step: TourStep;
  lang: 'fr' | 'ba';
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TourSpotlight({
  currentStep,
  totalSteps,
  step,
  lang,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}: TourSpotlightProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isLast = currentStep === totalSteps - 1;
  const isFullscreen = step.target === null || (!targetRect && step.target !== null);

  // Locate target element
  useEffect(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }

    const update = () => {
      const el = document.querySelector(step.target!) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setTargetRect(null);
      }
    };

    // Initial + small delay for layout
    update();
    const t = setTimeout(update, 300) as ReturnType<typeof setTimeout>;

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step.target]);

  // Stop TTS on step change or unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    };
  }, [currentStep]);

  const speakText = useCallback(() => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = lang === 'ba' ? step.textBa : step.textFr;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'fr-FR';
    utt.rate = 0.85;
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utt;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utt);
  }, [isSpeaking, lang, step]);

  const title = lang === 'ba' ? step.titleBa : step.titleFr;
  const text = lang === 'ba' ? step.textBa : step.textFr;

  // Spotlight padding around target
  const pad = 8;
  const spotRect = targetRect
    ? {
        x: targetRect.left - pad,
        y: targetRect.top - pad,
        w: targetRect.width + pad * 2,
        h: targetRect.height + pad * 2,
        rx: 16,
      }
    : null;

  // Position tooltip: prefer below target, fallback above
  const tooltipStyle: React.CSSProperties = {};
  if (spotRect) {
    const below = spotRect.y + spotRect.h + 12;
    const above = spotRect.y - 12;
    if (below + 200 < window.innerHeight) {
      tooltipStyle.top = below;
    } else {
      tooltipStyle.bottom = window.innerHeight - above;
    }
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translateX(-50%)';
  }
  // When no target found but step expects one, center the tooltip
  if (!spotRect && step.target !== null) {
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div className="fixed inset-0 z-[300] pointer-events-auto">
      {/* SVG overlay with hole */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotRect && (
              <rect
                x={spotRect.x}
                y={spotRect.y}
                width={spotRect.w}
                height={spotRect.h}
                rx={spotRect.rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Pulse ring around target */}
      {spotRect && (
        <motion.div
          className="absolute rounded-2xl border-2 border-orange-400"
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [1, 1.05, 1],
          }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          style={{
            top: spotRect.y,
            left: spotRect.x,
            width: spotRect.w,
            height: spotRect.h,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip / Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`absolute z-10 ${isFullscreen ? 'inset-4 flex flex-col items-center justify-center' : 'w-[90vw] max-w-sm'}`}
          style={isFullscreen ? {} : tooltipStyle}
        >
          <div
            className="rounded-3xl p-5 shadow-2xl border border-white/15 w-full"
            style={{ background: 'linear-gradient(135deg, rgba(30,25,40,0.97), rgba(20,18,30,0.98))' }}
          >
            {/* Fullscreen image */}
            {isFullscreen && KEYBOARD_IMAGES[step.id] && (
              <img
                src={KEYBOARD_IMAGES[step.id]}
                alt={title}
                className="w-full max-h-[35vh] object-contain rounded-2xl mb-4"
                draggable={false}
              />
            )}

            {/* Emoji + Title */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{step.emoji}</span>
              <div className="flex-1">
                <h3 className="text-white text-lg font-bold leading-tight">{title}</h3>
                <span className="text-white/40 text-xs">{currentStep + 1} / {totalSteps}</span>
              </div>
              {/* TTS button */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={speakText}
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                  isSpeaking ? 'bg-orange-500' : 'bg-white/10'
                }`}
              >
                {isSpeaking ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white/70" />
                )}
              </motion.button>
            </div>

            {/* Description */}
            <p className="text-white/70 text-sm leading-relaxed mb-4">{text}</p>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-white/10 mb-4 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500"
                initial={false}
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={onPrev}
                  className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onSkip}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white/60 text-sm font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                {lang === 'ba' ? 'Kpa' : 'Passer'}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={isLast ? onFinish : onNext}
                className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #FF5722, #FF7A00)' }}
              >
                {isLast ? (
                  <>
                    <Rocket className="w-4 h-4" />
                    {lang === 'ba' ? 'Sɛmɛ !' : 'Commencer !'}
                  </>
                ) : (
                  <>
                    {lang === 'ba' ? 'Gaa' : 'Suivant'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}