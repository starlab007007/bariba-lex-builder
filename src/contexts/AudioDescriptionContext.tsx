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
    ba: "Vous êtes sur l'écran d'accueil. Appuyez sur le micro central pour parler."
  },
  social: { 
    fr: "Fil d'actualité. Écoutez les publications de vos amis.",
    ba: "Fil d'actualité. Écoutez les publications de vos amis."
  },
  messages: { 
    fr: "Messages vocaux. Écoutez et envoyez des messages audio.",
    ba: "Messages vocaux. Écoutez et envoyez des messages audio."
  },
  live: { 
    fr: "Salles audio en direct. Rejoignez une conversation.",
    ba: "Salles audio en direct. Rejoignez une conversation."
  },
  market: { 
    fr: "Marché. Achetez et vendez avec des descriptions audio.",
    ba: "Marché. Achetez et vendez avec des descriptions audio."
  },
  services: { 
    fr: "Services. Traducteur, santé, finance et plus.",
    ba: "Services. Traducteur, santé, finance et plus."
  },
  sos: { 
    fr: "Urgence. Appuyez sur le bouton rouge pour appeler à l'aide.",
    ba: "Urgence. Appuyez sur le bouton rouge pour appeler à l'aide."
  },
  profile: { 
    fr: "Votre profil. Gérez vos paramètres.",
    ba: "Votre profil. Gérez vos paramètres."
  },
  createPost: {
    fr: "Créer une publication. Choisissez le type de contenu.",
    ba: "Créer une publication. Choisissez le type de contenu."
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
