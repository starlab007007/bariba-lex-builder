import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useHybridTranslation } from '@/hooks/useHybridTranslation';

export type TamTamLang = 'fr' | 'ba';

interface TranslationDict {
  [key: string]: { fr: string; ba: string };
}

// Dictionnaire des traductions UI
const translations: TranslationDict = {
  // Navigation
  home: { fr: "Accueil", ba: "Sɔ́ɔ̀rù" },
  social: { fr: "Social", ba: "Gbɛ̀kú" },
  market: { fr: "Marché", ba: "Kíkà" },
  profile: { fr: "Profil", ba: "Mɛ̀" },
  
  // Actions
  share: { fr: "Partager", ba: "Pín" },
  like: { fr: "J'aime", ba: "N dɔ̀" },
  comment: { fr: "Commenter", ba: "Kɔ́" },
  listen: { fr: "Écouter", ba: "Tɛ́ɛ́" },
  record: { fr: "Enregistrer", ba: "Wé" },
  send: { fr: "Envoyer", ba: "Ná" },
  cancel: { fr: "Annuler", ba: "Gbɛ́" },
  translate: { fr: "Traduire", ba: "Tùn" },
  
  // Feed
  feed: { fr: "Fil d'actualité", ba: "Sɔ́ɔ̀rù gbɛ̀" },
  messages: { fr: "Messages", ba: "Bàátɔ́kɔ̀" },
  live: { fr: "En direct", ba: "Dìn" },
  stories: { fr: "Stories", ba: "Gàn" },
  newPost: { fr: "Nouveau post", ba: "Sɔ́ɔ̀rù yɔ́yɔ́" },
  
  // Post types
  photo: { fr: "Photo", ba: "Fɔ́tò" },
  video: { fr: "Vidéo", ba: "Vídéò" },
  audio: { fr: "Audio", ba: "Kɔ̀rì" },
  poll: { fr: "Sondage", ba: "Bìɔ̀" },
  
  // Reactions
  love: { fr: "J'adore", ba: "N dɔ̀ gàn" },
  laugh: { fr: "Haha", ba: "Wí" },
  wow: { fr: "Waouh", ba: "Ɛ́ɛ̀" },
  pray: { fr: "Amen", ba: "Àmínà" },
  
  // Services
  services: { fr: "Services", ba: "Sínsín" },
  translator: { fr: "Traducteur", ba: "Tùnkɔ̀" },
  health: { fr: "Santé", ba: "Àlàfíà" },
  finance: { fr: "Finance", ba: "Sìká" },
  agriculture: { fr: "Agriculture", ba: "Àgbè" },
  education: { fr: "Éducation", ba: "Kíkɔ́" },
  documents: { fr: "Documents", ba: "Tákàdá" },
  
  // SOS
  emergency: { fr: "Urgence", ba: "Kpákpá" },
  help: { fr: "Aide", ba: "Ìràn" },
  callEmergency: { fr: "Appeler les urgences", ba: "Pè kpákpá" },
  
  // Profile
  settings: { fr: "Paramètres", ba: "Ètò" },
  logout: { fr: "Déconnexion", ba: "Jáde" },
  followers: { fr: "Abonnés", ba: "Àwɔn" },
  following: { fr: "Abonnements", ba: "Tɛ̀lé" },
  posts: { fr: "Publications", ba: "Sɔ́ɔ̀rù" },
  
  // Common
  loading: { fr: "Chargement...", ba: "Ń gbé..." },
  error: { fr: "Erreur", ba: "Àsìsè" },
  success: { fr: "Succès", ba: "Àseyorí" },
  noData: { fr: "Aucune donnée", ba: "Kò sí" },
  
  // Language
  language: { fr: "Langue", ba: "Èdè" },
  french: { fr: "Français", ba: "Fàránsé" },
  bariba: { fr: "Bàátɔ̀nú", ba: "Bàátɔ̀nú" },
  
  // Audio descriptions
  welcomeHome: { fr: "Bienvenue sur TAM-TAM", ba: "Kú àbọ̀ sí TAM-TAM" },
  tapToSpeak: { fr: "Appuyez pour parler", ba: "Tẹ̀ láti sɔ̀rọ̀" },
  nowListening: { fr: "J'écoute...", ba: "Mo ń gbọ́..." },
  
  // Comments
  audioComments: { fr: "Commentaires audio", ba: "Kɔ́ kɔ̀rì" },
  noComments: { fr: "Aucun commentaire", ba: "Kò sí kɔ́" },
  addComment: { fr: "Ajouter un commentaire", ba: "Fi kɔ́ kun" },
  
  // Create post
  whatToShare: { fr: "Que voulez-vous partager ?", ba: "Kí ni ẹ fẹ́ pín?" },
  addPhoto: { fr: "Ajouter une photo", ba: "Fi fɔ́tò kun" },
  addVideo: { fr: "Ajouter une vidéo", ba: "Fi vídéò kun" },
  recordAudio: { fr: "Enregistrer un audio", ba: "Wé kɔ̀rì" },
  createPoll: { fr: "Créer un sondage", ba: "Ṣe bìɔ̀" },
  
  // Transcription
  transcribing: { fr: "Transcription en cours...", ba: "Ń kọ sílẹ̀..." },
  transcriptionReady: { fr: "Transcription prête", ba: "Kíkọ̀ sílẹ̀ ti ṣetán" },
  showTranscription: { fr: "Voir la transcription", ba: "Wo kíkọ̀" },
  hideTranscription: { fr: "Masquer la transcription", ba: "Fi kíkọ̀ pamọ́" },
};

interface TamTamLanguageContextType {
  currentLang: TamTamLang;
  setLanguage: (lang: TamTamLang) => void;
  t: (key: string) => string;
  translateText: (text: string, from: TamTamLang, to: TamTamLang) => Promise<string>;
  isTranslating: boolean;
}

const TamTamLanguageContext = createContext<TamTamLanguageContextType | null>(null);

export const TamTamLanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<TamTamLang>(() => {
    const saved = localStorage.getItem('tamtam-lang');
    return (saved as TamTamLang) || 'fr';
  });
  
  const { translate, isLoading: isTranslating } = useHybridTranslation();

  useEffect(() => {
    localStorage.setItem('tamtam-lang', currentLang);
  }, [currentLang]);

  const setLanguage = useCallback((lang: TamTamLang) => {
    setCurrentLang(lang);
  }, []);

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[currentLang];
  }, [currentLang]);

  const translateText = useCallback(async (text: string, from: TamTamLang, to: TamTamLang): Promise<string> => {
    if (from === to) return text;
    
    try {
      if (from === 'fr') {
        const result = await translate.translateFrenchToBariba(text);
        return result.translation;
      } else {
        const result = await translate.translateBaribaToFrench(text);
        return result.translation;
      }
    } catch {
      return text;
    }
  }, [translate]);

  return (
    <TamTamLanguageContext.Provider value={{
      currentLang,
      setLanguage,
      t,
      translateText,
      isTranslating
    }}>
      {children}
    </TamTamLanguageContext.Provider>
  );
};

export const useTamTamLanguage = () => {
  const context = useContext(TamTamLanguageContext);
  if (!context) {
    throw new Error('useTamTamLanguage must be used within a TamTamLanguageProvider');
  }
  return context;
};
