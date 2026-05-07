import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check } from 'lucide-react';
import { useTamTamLanguage, TamTamLang } from '@/contexts/TamTamLanguageContext';

const languages: { code: TamTamLang; name: string; flag: string; nativeName: string }[] = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'ba', name: 'Bàátɔ̀nú', flag: '🇧🇯', nativeName: 'Bàátɔ̀nú' },
];

export const TamTamLanguageSelector: React.FC = () => {
  const { currentLang, setLanguage, t } = useTamTamLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = languages.find(l => l.code === currentLang);

  const handleSelect = (code: TamTamLang) => {
    setLanguage(code);
    setIsOpen(false);
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
    
    // Audio feedback could be added here
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm"
      >
        <span className="text-xl">{currentLanguage?.flag}</span>
        <Globe className="w-4 h-4 text-gray-500" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl z-50 overflow-hidden min-w-[180px]"
            >
              <div className="p-2">
                <p className="text-xs text-gray-400 px-3 py-2 font-medium">
                  {t('language')}
                </p>
                
                {languages.map(lang => (
                  <motion.button
                    key={lang.code}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                      currentLang === lang.code 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{lang.name}</p>
                      <p className="text-xs text-gray-400">{lang.nativeName}</p>
                    </div>
                    {currentLang === lang.code && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
