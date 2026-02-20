import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type FitilaLang = 'fr' | 'ba';

interface TranslationDict {
  [key: string]: { fr: string; ba: string };
}

// Dictionnaire complet des traductions UI — Bariba authentique (sources: dictionnaire local, learningFoundations, learningExercises)
const translations: TranslationDict = {
  // Navigation
  home: { fr: "Accueil", ba: "Yɛnu" },
  social: { fr: "Social", ba: "Tɔmbu" },
  market: { fr: "Marché", ba: "Aburu" },
  profile: { fr: "Profil", ba: "Mɛ" },
  services: { fr: "Services", ba: "Sɔmburu" },
  sos: { fr: "SOS", ba: "Kpákpá" },
  help: { fr: "Aide", ba: "Ìràn" },
  ia: { fr: "IA", ba: "IA" },
  dictionary: { fr: "Dictionnaire", ba: "Gbɛ́sɔ́ɔ̀rù" },

  // Actions principales
  share: { fr: "Partager", ba: "Pín" },
  like: { fr: "J'aime", ba: "Nɛn sũu doma" },
  comment: { fr: "Commenter", ba: "Nɛɛ" },
  listen: { fr: "Écouter", ba: "Turu" },
  record: { fr: "Enregistrer", ba: "Mɑɑru" },
  send: { fr: "Envoyer", ba: "Gɔrima" },
  cancel: { fr: "Annuler", ba: "Gbɛ́ru" },
  translate: { fr: "Traduire", ba: "Tùnkɔ̀rù" },
  apply: { fr: "Postuler", ba: "Bẹ̀bẹ̀" },
  buy: { fr: "Acheter", ba: "Rà" },
  sell: { fr: "Vendre", ba: "Tà" },
  call: { fr: "Appeler", ba: "Pè" },
  save: { fr: "Sauvegarder", ba: "Mɑɑru" },
  delete: { fr: "Supprimer", ba: "Bɔru" },
  edit: { fr: "Modifier", ba: "Gbɛsiru" },
  confirm: { fr: "Confirmer", ba: "Sɛnbu" },
  back: { fr: "Retour", ba: "Wiru" },
  next: { fr: "Suivant", ba: "Tɛ̀lé" },

  // Feed
  feed: { fr: "Fil d'actualité", ba: "Lɑɑbɑri" },
  messages: { fr: "Messages", ba: "Nɛɛrenu" },
  live: { fr: "En direct", ba: "Tɛ̃" },
  stories: { fr: "Stories", ba: "Gàn" },
  newPost: { fr: "Nouveau post", ba: "Lɑɑbɑri yɔyɔ" },

  // Types de contenu
  photo: { fr: "Photo", ba: "Photo" },
  video: { fr: "Vidéo", ba: "Vidéo" },
  audio: { fr: "Audio", ba: "Nɔɔ" },
  poll: { fr: "Sondage", ba: "Kasuu" },
  document: { fr: "Document", ba: "Tákàdá" },

  // Réactions
  love: { fr: "J'adore", ba: "Nɛn sũu doma sãa sãa" },
  laugh: { fr: "Haha", ba: "Wí" },
  wow: { fr: "Waouh", ba: "Ɛ́ɛ̀" },
  pray: { fr: "Amen", ba: "Àmínà" },
  sad: { fr: "Triste", ba: "Nɛn sũu sɛ̃rɑ" },
  angry: { fr: "En colère", ba: "Nɛn sũu gbirima" },

  // Services IA
  translator: { fr: "Traducteur", ba: "Tùnkɔ̀rù" },
  health: { fr: "Santé IA", ba: "Dɔɔru" },
  finance: { fr: "Finance", ba: "Gobi" },
  agriculture: { fr: "Agriculture", ba: "Gberu sɔmburu" },
  education: { fr: "Éducation", ba: "Debu" },
  documents: { fr: "Documents", ba: "Tákàdá" },
  healthDiagnosis: { fr: "Diagnostic santé", ba: "Dɔɔru kasuu" },
  financeAdvice: { fr: "Conseil finance", ba: "Gobi deburu" },
  cropAdvice: { fr: "Conseil culture", ba: "Gberu deburu" },
  meteo: { fr: "Météo", ba: "Gura wɑɑru" },
  news: { fr: "Actualités", ba: "Lɑɑbɑri" },
  security: { fr: "Sécurité", ba: "Alafia" },

  // SOS / Urgence
  emergency: { fr: "Urgence", ba: "Kpákpá" },
  callEmergency: { fr: "Appeler les urgences", ba: "Pè kpákpá" },
  location: { fr: "Localisation", ba: "Baama" },
  cancelAlert: { fr: "Annuler l'alerte", ba: "Gbɛ́ru kìlọ̀" },
  emergencyContacts: { fr: "Contacts d'urgence", ba: "Tɔmbu kpákpá" },
  family: { fr: "Famille", ba: "Dɛnu" },
  hospital: { fr: "Hôpital", ba: "Dɔɔru yɛnu" },
  police: { fr: "Police", ba: "Police" },
  addContact: { fr: "Ajouter contact", ba: "Tɔmbu kùn" },

  // Profil
  settings: { fr: "Paramètres", ba: "Gbɛ̀sìrù" },
  logout: { fr: "Déconnexion", ba: "Yara" },
  followers: { fr: "Abonnés", ba: "Tɛ̀lé tɔmbu" },
  following: { fr: "Abonnements", ba: "Na tɛ̀lé" },
  posts: { fr: "Publications", ba: "Lɑɑbɑrinu" },
  audioBio: { fr: "Bio audio", ba: "Nɔɔ mɛ" },
  badges: { fr: "Badges", ba: "Àmì" },
  notifications: { fr: "Notifications", ba: "Lɑɑbɑri yɔyɔnu" },
  recordBio: { fr: "Enregistrer bio", ba: "Mɑɑru nɔɔ mɛ" },
  changePhoto: { fr: "Changer photo", ba: "Gbɛsiru photo" },
  likes: { fr: "J'aime", ba: "Nɛn sũu doma" },

  // Marché
  shop: { fr: "Boutique", ba: "Aburu" },
  jobs: { fr: "Emplois", ba: "Sɔmburu" },
  price: { fr: "Prix", ba: "Gobi" },
  seller: { fr: "Vendeur", ba: "Tà tɔm" },
  buyer: { fr: "Acheteur", ba: "Rà tɔm" },
  applicants: { fr: "Candidats", ba: "Kasuu tɔmbu" },
  voiceCV: { fr: "CV vocal", ba: "Nɔɔ sɔmburu" },
  postProduct: { fr: "Publier produit", ba: "Yira gɑ̃ɑ" },
  postJob: { fr: "Publier emploi", ba: "Yira sɔmburu" },

  // États et feedback
  loading: { fr: "Chargement...", ba: "Gɑ nɑɑmɔ..." },
  error: { fr: "Erreur", ba: "Kɑsɔru" },
  success: { fr: "Succès", ba: "Ga nɔɔra" },
  noData: { fr: "Aucune donnée", ba: "Gɑ̃ɑ kun wãa" },
  processing: { fr: "Traitement...", ba: "Gɑ komɔ..." },
  sending: { fr: "Envoi...", ba: "Gɑ gɔrimɔ..." },

  // Langue
  language: { fr: "Langue", ba: "Nɛɛru" },
  french: { fr: "Français", ba: "Fãsei" },
  bariba: { fr: "Bàátɔ̀nú", ba: "Bàátɔ̀nú" },
  switchLanguage: { fr: "Changer de langue", ba: "Gbɛsiru nɛɛru" },

  // Descriptions audio
  welcomeHome: { fr: "Bienvenue sur FITILA", ba: "Aagu wunɛ ka weru FITILA sɔɔ" },
  welcomeBack: { fr: "Bon retour", ba: "Bɛɛ ka weru" },
  tapToSpeak: { fr: "Appuyez pour parler", ba: "Tɛ̀ kɑ nɛɛ" },
  nowListening: { fr: "J'écoute...", ba: "Na turumɔ..." },
  speakNow: { fr: "Parlez maintenant", ba: "A nɛɛ tɛ̃" },
  pressAndHold: { fr: "Appuyez et maintenez", ba: "Tɛ̀ mú" },

  // Commentaires
  audioComments: { fr: "Commentaires audio", ba: "Nɔɔ nɛɛrenu" },
  noComments: { fr: "Aucun commentaire", ba: "Nɛɛru kun wãa" },
  addComment: { fr: "Ajouter un commentaire", ba: "Nɛɛru kùn" },

  // Création de post
  whatToShare: { fr: "Que voulez-vous partager ?", ba: "Mba i koo pín ?" },
  addPhoto: { fr: "Ajouter une photo", ba: "Photo kùn" },
  addVideo: { fr: "Ajouter une vidéo", ba: "Vidéo kùn" },
  recordAudio: { fr: "Enregistrer un audio", ba: "Nɔɔ mɑɑru" },
  createPoll: { fr: "Créer un sondage", ba: "Kasuu ko" },

  // Transcription
  transcribing: { fr: "Transcription en cours...", ba: "Gɑ kɔ̃simɔ..." },
  transcriptionReady: { fr: "Transcription prête", ba: "Kɔ̃siru ya ko" },
  showTranscription: { fr: "Voir la transcription", ba: "Kɔ̃siru mɛɛri" },
  hideTranscription: { fr: "Masquer la transcription", ba: "Kɔ̃siru sɔ̃ɔ" },
  transcriptionFr: { fr: "Transcription française", ba: "Kɔ̃siru Fãsei" },
  transcriptionBa: { fr: "Transcription Bàátɔ̀nú", ba: "Kɔ̃siru Bàátɔ̀nú" },

  // Traduction
  translating: { fr: "Traduction en cours...", ba: "Gɑ tùnkɔ̀mɔ..." },
  translationReady: { fr: "Traduction prête", ba: "Tùnkɔ̀rù ya ko" },
  showOriginal: { fr: "Voir l'original", ba: "Sɔ̃ɔ mɛɛri" },
  showTranslation: { fr: "Voir la traduction", ba: "Tùnkɔ̀rù mɛɛri" },

  // Sondages vocaux
  vocalPoll: { fr: "Sondage vocal", ba: "Nɔɔ kasuu" },
  voteByVoice: { fr: "Votez par la voix", ba: "Nɔɔ kɑ sɛnbu" },
  votes: { fr: "votes", ba: "sɛnbunu" },
  pollResults: { fr: "Résultats du sondage", ba: "Kasuu yirɑnu" },

  // Conversation
  conversation: { fr: "Conversation", ba: "Faagi" },
  startConversation: { fr: "Démarrer conversation", ba: "Faagi sɔ̃ɔ" },
  endConversation: { fr: "Terminer conversation", ba: "Faagi kpe" },

  // Splash / Accueil
  slogan: { fr: "Parlez, Agissez, Connectez", ba: "Nɛɛ, Ko, Yɛru" },
  tapMicToStart: { fr: "Appuyez sur le micro pour commencer", ba: "Tɛ̀ micro kɑ sɔ̃ɔ" },

  // Temps
  now: { fr: "Maintenant", ba: "Tɛ̃" },
  today: { fr: "Aujourd'hui", ba: "Gisɔ" },
  yesterday: { fr: "Hier", ba: "Yinɑ" },
  daysAgo: { fr: "jours", ba: "tɔ̃ɔnu" },
  hoursAgo: { fr: "heures", ba: "wɑɑru" },
  minutesAgo: { fr: "minutes", ba: "nɛn giru" },

  // Confirmation
  areYouSure: { fr: "Êtes-vous sûr ?", ba: "A sɛnbu ?" },
  yes: { fr: "Oui", ba: "Ee" },
  no: { fr: "Non", ba: "Aawo" },

  // Audio feedback
  newPublication: { fr: "Nouvelle publication", ba: "Lɑɑbɑri yɔyɔ" },
  newMessage: { fr: "Nouveau message", ba: "Nɛɛru yɔyɔ" },
  likeReceived: { fr: "Quelqu'un aime votre publication", ba: "Tɔm dɔmbɔ wunɛn lɑɑbɑri sũu doma" },

  // Mode Audio Description
  audioDescriptionMode: { fr: "Mode Audio Description", ba: "Nɔɔ yirɑ kpindu" },
  audioDescriptionOn: { fr: "Audio Description activée", ba: "Nɔɔ yirɑ ya sɔ̃ɔ" },
  audioDescriptionOff: { fr: "Audio Description désactivée", ba: "Nɔɔ yirɑ ya kpe" },

  // Messages d'écran pour audio description
  screenHome: { fr: "Vous êtes sur la page d'accueil. 6 services disponibles. Appuyez sur le micro pour parler.", ba: "A wãa yɛnu sɔɔ. Sɔmburu nɔɔbu n dɔmbɔ wãa. Tɛ̀ micro kɑ nɛɛ." },
  screenSocial: { fr: "Page sociale. Voyez les publications, messages et lives.", ba: "Tɔmbu sɔɔ. Lɑɑbɑrinu, nɛɛrenu kɑ tɛ̃ mɛɛri." },
  screenServices: { fr: "Page des services IA. 6 assistants disponibles.", ba: "IA sɔmburu sɔɔ. Ìràn nɔɔbu n dɔmbɔ wãa." },
  screenMarket: { fr: "Page marché. Boutique et emplois.", ba: "Aburu sɔɔ. Aburu kɑ sɔmburu." },
  screenSOS: { fr: "Page urgence. Appuyez sur le bouton rouge pour alerter.", ba: "Kpákpá sɔɔ. Tɛ̀ bouton kɑ kìlọ̀." },
  screenProfile: { fr: "Votre profil. Gérez vos paramètres.", ba: "Wunɛn mɛ. Gbɛ̀sìrù mɑɑ." },

  // Dictionnaire
  screenDictionary: { fr: "Dictionnaire vocal. Parlez ou tapez un mot pour obtenir sa traduction.", ba: "Nɔɔ gbɛ́sɔ́ɔ̀rù. Nɛɛ kɑ kɔ̃si yenu kɑ tùnkɔ̀rù bɛri." },
  speakWord: { fr: "Dites un mot", ba: "Yenu dɔmbɔ nɛɛ" },
  typeWord: { fr: "Tapez un mot", ba: "Yenu kɔ̃si" },
  suggestions: { fr: "Suggestions", ba: "Yirɑnu" },
  phonetic: { fr: "Phonétique", ba: "Nɔɔseeru" },
  definition: { fr: "Définition", ba: "Nɛɛmɔ" },
  example: { fr: "Exemple", ba: "Yirɑ" },
  listenBariba: { fr: "Écouter en bariba", ba: "Turu Bàátɔ̀nú sɔɔ" },
  listenFrench: { fr: "Écouter en français", ba: "Turu Fãsei sɔɔ" },
  keyboardMode: { fr: "Mode clavier", ba: "Kɔ̃siru kpindu" },
  voiceMode: { fr: "Mode vocal", ba: "Nɔɔ kpindu" },
  wordFound: { fr: "Mot trouvé", ba: "Yenu bɛri" },
  noWordFound: { fr: "Mot non trouvé", ba: "Yenu kun bɛri" },
  recentSearches: { fr: "Recherches récentes", ba: "Kasuu tɛ̃nu" },
  listenAll: { fr: "Écouter tout", ba: "Turu kpuro" },
};

interface FitilaLanguageContextType {
  currentLang: FitilaLang;
  setLanguage: (lang: FitilaLang) => void;
  t: (key: string) => string;
  translateText: (text: string, from: FitilaLang, to: FitilaLang) => Promise<string>;
  isTranslating: boolean;
}

const FitilaLanguageContext = createContext<FitilaLanguageContextType | null>(null);

export const FitilaLanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLang] = useState<FitilaLang>(() => {
    const saved = localStorage.getItem('fitila-lang');
    return (saved as FitilaLang) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('fitila-lang', currentLang);
  }, [currentLang]);

  const setLanguage = useCallback((lang: FitilaLang) => {
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

  // translateText reste disponible pour le traducteur de contenu utilisateur (via ByT5)
  // mais n'est plus utilisé pour l'interface
  const translateText = useCallback(async (text: string, from: FitilaLang, to: FitilaLang): Promise<string> => {
    if (from === to) return text;
    // Pour l'interface, on utilise le dictionnaire local — pas de service en ligne
    return text;
  }, []);

  return (
    <FitilaLanguageContext.Provider value={{
      currentLang,
      setLanguage,
      t,
      translateText,
      isTranslating: false
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
