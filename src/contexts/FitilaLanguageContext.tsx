import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/** Libellés français de secours : clés utilisées par l'interface mais absentes de i18n-platform.json. */
const FR_FALLBACK: Record<string, string> = {
  addComment: 'Ajouter un commentaire', addContact: 'Ajouter un contact de confiance', audioComments: 'Commentaires audio',
  badges: 'Badges', cancel: 'Annuler', followers: 'Abonnés', following: 'Abonnements', friends: 'Amis',
  hideTranscription: 'Masquer la transcription', showTranscription: 'Afficher la transcription', language: 'Langue',
  loading: 'Chargement…', logout: 'Se déconnecter', noComments: 'Aucun commentaire', poll: 'Sondage',
  profile_logout_confirm: 'Voulez-vous vous déconnecter ?', screenHome: 'Accueil', screenProfile: 'Profil', screenSOS: 'Écran SOS',
  search: 'Rechercher', tapToListen: 'Touchez pour écouter', tapToVote: 'Touchez pour voter', transcribing: 'Transcription…',
  translate: 'Traduire', vocalStats: 'Statistiques vocales',
  emergency: 'Urgence', tapToSpeak: 'Touchez pour parler', location: 'Localisation', emergencyContacts: 'Contacts de confiance',
  family: 'Famille', hospital: 'Hôpital', police: 'Police', cancelAlert: 'Alerte annulée', callEmergency: "Appel d'urgence en cours",
};

export type FitilaLang = 'fr' | 'ba';

interface TranslationDict {
  [key: string]: { fr: string; ba: string };
}

interface FitilaLanguageContextType {
  currentLang: FitilaLang;
  setLanguage: (lang: FitilaLang) => void;
  t: (key: string) => string;
  translateText: (text: string, from: FitilaLang, to: FitilaLang) => Promise<string>;
  isTranslating: boolean;
  translationsLoaded: boolean;
}

const FitilaLanguageContext = createContext<FitilaLanguageContextType | null>(null);

export const FitilaLanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<FitilaLang>(() => {
    const saved = localStorage.getItem('fitila-lang');
    return (saved as FitilaLang) || 'fr';
  });

  const [translations, setTranslations] = useState<TranslationDict>({});
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Load translations with cache-busting
  useEffect(() => {
    fetch(`/i18n-platform.json?v=${Date.now()}`)
      .then(res => res.json())
      .then((data: Record<string, any>) => {
        const dict: TranslationDict = {};
        for (const [key, value] of Object.entries(data)) {
          if (!key.startsWith('_') && value && typeof value === 'object' && 'fr' in value && 'ba' in value) {
            dict[key] = { fr: value.fr, ba: value.ba };
          }
        }
        setTranslations(dict);
        setTranslationsLoaded(true);
        console.log(`[FITILA i18n] Loaded ${Object.keys(dict).length} translation keys`);
      })
      .catch(err => {
        console.error('[FITILA i18n] Failed to load translations:', err);
        setTranslationsLoaded(true); // allow UI to render with fallback
      });
  }, []);

  useEffect(() => {
    localStorage.setItem('fitila-lang', currentLang);
  }, [currentLang]);

  const setLanguage = useCallback((lang: FitilaLang) => {
    setCurrentLang(lang);
  }, []);

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      return FR_FALLBACK[key] ?? key;
    }
    // Return target lang; if empty string, fallback to french; if french empty, return key
    const value = translation[currentLang];
    if (value && value.trim() !== '') return value;
    // Fallback to french
    if (translation.fr && translation.fr.trim() !== '') return translation.fr;
    return FR_FALLBACK[key] ?? key;
  }, [currentLang, translations]);

  const translateText = useCallback(async (text: string, from: FitilaLang, to: FitilaLang): Promise<string> => {
    if (from === to) return text;
    return text;
  }, []);

  return (
    <FitilaLanguageContext.Provider value={{
      currentLang,
      setLanguage,
      t,
      translateText,
      isTranslating: false,
      translationsLoaded
    }}>
      {children}
    </FitilaLanguageContext.Provider>
  );
};

export const useFitilaLanguage = () => {
  const context = useContext(FitilaLanguageContext);
  if (!context) {
    throw new Error('useFitilaLanguage must be used within a FitilaLanguageProvider');
  }
  return context;
};

// Backward compatibility aliases
export type TamTamLang = FitilaLang;
export const TamTamLanguageProvider = FitilaLanguageProvider;
export const useTamTamLanguage = useFitilaLanguage;
