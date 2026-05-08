import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TOUR_STEPS, TOUR_STORAGE_KEY } from './tourSteps';
import TourSpotlight from './TourSpotlight';

interface AppTourContextType {
  isActive: boolean;
  startTour: () => void;
}

const AppTourContext = createContext<AppTourContextType>({
  isActive: false,
  startTour: () => {},
});

export const useAppTour = () => useContext(AppTourContext);

export default function AppTourProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(() => !localStorage.getItem(TOUR_STORAGE_KEY));
  const [currentStep, setCurrentStep] = useState(0);
  const [lang, setLang] = useState<'fr' | 'ba'>('fr');
  const [showLangPicker, setShowLangPicker] = useState(() => !localStorage.getItem(TOUR_STORAGE_KEY));

  const finish = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    window.speechSynthesis?.cancel();
    setIsActive(false);
    setShowLangPicker(false);
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setShowLangPicker(true);
    setIsActive(true);
  }, []);

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) setCurrentStep((s) => s + 1);
  }, [currentStep]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const pickLang = useCallback((l: 'fr' | 'ba') => {
    setLang(l);
    setShowLangPicker(false);
  }, []);

  return (
    <AppTourContext.Provider value={{ isActive, startTour }}>
      {children}

      {/* Language picker before tour */}
      <AnimatePresence>
        {showLangPicker && isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[310] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.85)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-3xl p-6 max-w-xs w-[90vw] text-center"
              style={{ background: 'linear-gradient(135deg, rgba(30,25,40,0.98), rgba(20,18,30,0.99))' }}
            >
              <span className="text-5xl block mb-3">🔥</span>
              <h2 className="text-white text-xl font-bold mb-1">Bienvenue sur Fitila!</h2>
              <p className="text-white/60 text-sm mb-5">Choisissez la langue du guide</p>

              <div className="flex gap-3 mb-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => pickLang('fr')}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-base"
                >
                  🇫🇷 Français
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => pickLang('ba')}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base"
                >
                  🇧🇯 Bariba
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={finish}
                className="text-white/40 text-sm underline"
              >
                Passer le guide
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tour spotlight */}
      <AnimatePresence>
        {isActive && !showLangPicker && (
          <TourSpotlight
            currentStep={currentStep}
            totalSteps={TOUR_STEPS.length}
            step={TOUR_STEPS[currentStep]}
            lang={lang}
            onNext={next}
            onPrev={prev}
            onSkip={finish}
            onFinish={finish}
          />
        )}
      </AnimatePresence>
    </AppTourContext.Provider>
  );
}

export { TOUR_STORAGE_KEY };