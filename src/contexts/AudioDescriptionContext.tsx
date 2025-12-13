import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useFrenchTTS } from '@/hooks/useFrenchTTS';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';

interface AudioDescriptionContextType {
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  announceScreen: (screenName: string) => void;
  announceAction: (action: string) => void;
  isSpeaking: boolean;
}

const AudioDescriptionContext = createContext<AudioDescriptionContextType | null>(null);

// Screen descriptions in French (will be translated if needed)
const screenDescriptions: Record<string, { fr: string; ba: string }> = {
  home: { 
    fr: "Vous êtes sur l'écran d'accueil. Appuyez sur le micro central pour parler.",
    ba: "A wá ní ilé. Tẹ̀ maikírófòònù láti sọ̀rọ̀."
  },
  social: { 
    fr: "Fil d'actualité. Écoutez les publications de vos amis.",
    ba: "Sɔ́ɔ̀rù gbɛ̀. Gbọ́ sɔ́ɔ̀rù àwọn ọ̀rẹ́."
  },
  messages: { 
    fr: "Messages vocaux. Écoutez et envoyez des messages audio.",
    ba: "Bàátɔ́kɔ̀. Gbọ́ kí o sì fi ránṣẹ́."
  },
  live: { 
    fr: "Salles audio en direct. Rejoignez une conversation.",
    ba: "Yàrá ohùn. Darapọ̀ mọ́ ìjíròrò."
  },
  market: { 
    fr: "Marché. Achetez et vendez avec des descriptions audio.",
    ba: "Ọjà. Ra kí o tà pẹ̀lú ohùn."
  },
  services: { 
    fr: "Services. Traducteur, santé, finance et plus.",
    ba: "Sínsín. Tùnkɔ̀, àlàfíà, sìká àti púpọ̀."
  },
  sos: { 
    fr: "Urgence. Appuyez sur le bouton rouge pour appeler à l'aide.",
    ba: "Kpákpá. Tẹ̀ bọ́tìnì pupa fún ìràn."
  },
  profile: { 
    fr: "Votre profil. Gérez vos paramètres.",
    ba: "Mɛ̀ rẹ. Ṣàkóso ètò rẹ."
  },
  createPost: {
    fr: "Créer une publication. Choisissez le type de contenu.",
    ba: "Ṣẹ̀dá sɔ́ɔ̀rù. Yan irú ohun."
  },
};

export const AudioDescriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem('tamtam-audio-description');
    return saved === 'true';
  });
  
  const { speak, isSpeaking, stop } = useFrenchTTS();
  const tamtamLang = useTamTamLanguage();

  useEffect(() => {
    localStorage.setItem('tamtam-audio-description', String(isEnabled));
  }, [isEnabled]);

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (enabled) {
      // Announce that audio description is now enabled
      speak("Mode description audio activé. Je vais vous guider à travers l'application.");
    } else {
      stop();
    }
  }, [speak, stop]);

  const announceScreen = useCallback((screenName: string) => {
    if (!isEnabled) return;
    
    const description = screenDescriptions[screenName];
    if (description) {
      const text = tamtamLang?.currentLang === 'ba' ? description.ba : description.fr;
      speak(text, { rate: 0.9 });
    }
  }, [isEnabled, speak, tamtamLang?.currentLang]);

  const announceAction = useCallback((action: string) => {
    if (!isEnabled) return;
    speak(action, { rate: 1.0 });
  }, [isEnabled, speak]);

  return (
    <AudioDescriptionContext.Provider value={{
      isEnabled,
      setEnabled,
      announceScreen,
      announceAction,
      isSpeaking
    }}>
      {children}
    </AudioDescriptionContext.Provider>
  );
};

export const useAudioDescription = () => {
  const context = useContext(AudioDescriptionContext);
  if (!context) {
    // Return a no-op version if not within provider
    return {
      isEnabled: false,
      setEnabled: () => {},
      announceScreen: () => {},
      announceAction: () => {},
      isSpeaking: false
    };
  }
  return context;
};
