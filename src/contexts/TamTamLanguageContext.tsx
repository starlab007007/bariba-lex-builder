import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSimpleTranslation } from '@/hooks/useSimpleTranslation';

export type TamTamLang = 'fr' | 'ba';

interface TranslationDict {
  [key: string]: { fr: string; ba: string };
}

// Dictionnaire complet des traductions UI - 150+ entrées
const translations: TranslationDict = {
  // Navigation
  home: { fr: "Accueil", ba: "Sɔ́ɔ̀rù" },
  social: { fr: "Social", ba: "Gbɛ̀kú" },
  market: { fr: "Marché", ba: "Kíkà" },
  profile: { fr: "Profil", ba: "Mɛ̀" },
  services: { fr: "Services", ba: "Sínsín" },
  sos: { fr: "SOS", ba: "Kpákpá" },
  help: { fr: "Aide", ba: "Ìràn" },
  ia: { fr: "IA", ba: "ÌA" },
  dictionary: { fr: "Dictionnaire", ba: "Gbɛ́-sɔ́ɔ̀rù" },
  
  // Actions principales
  share: { fr: "Partager", ba: "Pín" },
  like: { fr: "J'aime", ba: "N dɔ̀" },
  comment: { fr: "Commenter", ba: "Kɔ́" },
  listen: { fr: "Écouter", ba: "Tɛ́ɛ́" },
  record: { fr: "Enregistrer", ba: "Wé" },
  send: { fr: "Envoyer", ba: "Ná" },
  cancel: { fr: "Annuler", ba: "Gbɛ́" },
  translate: { fr: "Traduire", ba: "Tùn" },
  apply: { fr: "Postuler", ba: "Bẹ̀bẹ̀" },
  buy: { fr: "Acheter", ba: "Rà" },
  sell: { fr: "Vendre", ba: "Tà" },
  call: { fr: "Appeler", ba: "Pè" },
  save: { fr: "Sauvegarder", ba: "Fípamọ́" },
  delete: { fr: "Supprimer", ba: "Pa rẹ́" },
  edit: { fr: "Modifier", ba: "Ṣàtúnṣe" },
  confirm: { fr: "Confirmer", ba: "Fìdí múlẹ̀" },
  back: { fr: "Retour", ba: "Padà" },
  next: { fr: "Suivant", ba: "Tẹ̀lé" },
  
  // Feed
  feed: { fr: "Fil d'actualité", ba: "Sɔ́ɔ̀rù gbɛ̀" },
  messages: { fr: "Messages", ba: "Bàátɔ́kɔ̀" },
  live: { fr: "En direct", ba: "Dìn" },
  stories: { fr: "Stories", ba: "Gàn" },
  newPost: { fr: "Nouveau post", ba: "Sɔ́ɔ̀rù yɔ́yɔ́" },
  
  // Types de contenu
  photo: { fr: "Photo", ba: "Fɔ́tò" },
  video: { fr: "Vidéo", ba: "Vídéò" },
  audio: { fr: "Audio", ba: "Kɔ̀rì" },
  poll: { fr: "Sondage", ba: "Bìɔ̀" },
  document: { fr: "Document", ba: "Tákàdá" },
  
  // Réactions
  love: { fr: "J'adore", ba: "N dɔ̀ gàn" },
  laugh: { fr: "Haha", ba: "Wí" },
  wow: { fr: "Waouh", ba: "Ɛ́ɛ̀" },
  pray: { fr: "Amen", ba: "Àmínà" },
  sad: { fr: "Triste", ba: "Bínú" },
  angry: { fr: "En colère", ba: "Bínú gàn" },
  
  // Services IA
  translator: { fr: "Traducteur", ba: "Tùnkɔ̀" },
  health: { fr: "Santé IA", ba: "Àlàfíà" },
  finance: { fr: "Finance", ba: "Sìká" },
  agriculture: { fr: "Agriculture", ba: "Àgbè" },
  education: { fr: "Éducation", ba: "Kíkɔ́" },
  documents: { fr: "Documents", ba: "Tákàdá" },
  healthDiagnosis: { fr: "Diagnostic santé", ba: "Àyẹ̀wò àlàfíà" },
  financeAdvice: { fr: "Conseil finance", ba: "Ìmọ̀ràn owó" },
  cropAdvice: { fr: "Conseil culture", ba: "Ìmọ̀ràn àgbè" },
  meteo: { fr: "Météo", ba: "Ọjọ́ oṣù" },
  news: { fr: "Actualités", ba: "Ìròyìn" },
  security: { fr: "Sécurité", ba: "Ààbò" },
  
  // SOS / Urgence
  emergency: { fr: "Urgence", ba: "Kpákpá" },
  callEmergency: { fr: "Appeler les urgences", ba: "Pè kpákpá" },
  location: { fr: "Localisation", ba: "Ibì" },
  cancelAlert: { fr: "Annuler l'alerte", ba: "Dákẹ́ ìkìlọ̀" },
  emergencyContacts: { fr: "Contacts d'urgence", ba: "Àwọn pè kpákpá" },
  family: { fr: "Famille", ba: "Ẹbí" },
  hospital: { fr: "Hôpital", ba: "Ilé ìwòsàn" },
  police: { fr: "Police", ba: "Ọlọ́pàá" },
  addContact: { fr: "Ajouter contact", ba: "Fi kùn ènìyàn" },
  
  // Profil
  settings: { fr: "Paramètres", ba: "Ètò" },
  logout: { fr: "Déconnexion", ba: "Jáde" },
  followers: { fr: "Abonnés", ba: "Àwọn" },
  following: { fr: "Abonnements", ba: "Tɛ̀lé" },
  posts: { fr: "Publications", ba: "Sɔ́ɔ̀rù" },
  audioBio: { fr: "Bio audio", ba: "Kíkà ara" },
  badges: { fr: "Badges", ba: "Àmì" },
  notifications: { fr: "Notifications", ba: "Ìfitónilétí" },
  recordBio: { fr: "Enregistrer bio", ba: "Wé kíkà ara" },
  changePhoto: { fr: "Changer photo", ba: "Yí fɔ́tò padà" },
  likes: { fr: "J'aime", ba: "Fẹ́ràn" },
  
  // Marché
  shop: { fr: "Boutique", ba: "Ṣọ́ọ̀pù" },
  jobs: { fr: "Emplois", ba: "Iṣẹ́" },
  price: { fr: "Prix", ba: "Ówó" },
  seller: { fr: "Vendeur", ba: "Olùtà" },
  buyer: { fr: "Acheteur", ba: "Olùrà" },
  applicants: { fr: "Candidats", ba: "Àwọn olùbẹ̀wò" },
  voiceCV: { fr: "CV vocal", ba: "Kíkà ohùn iṣẹ́" },
  postProduct: { fr: "Publier produit", ba: "Sọ ọjà" },
  postJob: { fr: "Publier emploi", ba: "Sọ iṣẹ́" },
  
  // États et feedback
  loading: { fr: "Chargement...", ba: "Ń gbé..." },
  error: { fr: "Erreur", ba: "Àsìsè" },
  success: { fr: "Succès", ba: "Àseyorí" },
  noData: { fr: "Aucune donnée", ba: "Kò sí" },
  processing: { fr: "Traitement...", ba: "Ń ṣiṣẹ́..." },
  sending: { fr: "Envoi...", ba: "Ń fi ránṣẹ́..." },
  
  // Langue
  language: { fr: "Langue", ba: "Èdè" },
  french: { fr: "Français", ba: "Fàránsé" },
  bariba: { fr: "Bàátɔ̀nú", ba: "Bàátɔ̀nú" },
  switchLanguage: { fr: "Changer de langue", ba: "Yí èdè padà" },
  
  // Descriptions audio
  welcomeHome: { fr: "Bienvenue sur TAM-TAM", ba: "Kú àbọ̀ sí TAM-TAM" },
  welcomeBack: { fr: "Bon retour", ba: "Kú àbọ̀ padà" },
  tapToSpeak: { fr: "Appuyez pour parler", ba: "Tẹ̀ láti sɔ̀rọ̀" },
  nowListening: { fr: "J'écoute...", ba: "Mo ń gbọ́..." },
  speakNow: { fr: "Parlez maintenant", ba: "Sọ̀rọ̀ báyìí" },
  pressAndHold: { fr: "Appuyez et maintenez", ba: "Tẹ̀ mú" },
  
  // Commentaires
  audioComments: { fr: "Commentaires audio", ba: "Kɔ́ kɔ̀rì" },
  noComments: { fr: "Aucun commentaire", ba: "Kò sí kɔ́" },
  addComment: { fr: "Ajouter un commentaire", ba: "Fi kɔ́ kun" },
  
  // Création de post
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
  transcriptionFr: { fr: "Transcription française", ba: "Kíkọ̀ Fàránsé" },
  transcriptionBa: { fr: "Transcription Bàátɔ̀nú", ba: "Kíkọ̀ Bàátɔ̀nú" },
  
  // Traduction
  translating: { fr: "Traduction en cours...", ba: "Ń tùnmọ̀..." },
  translationReady: { fr: "Traduction prête", ba: "Ìtúmọ̀ ti ṣetán" },
  showOriginal: { fr: "Voir l'original", ba: "Wo àkọ́kọ́" },
  showTranslation: { fr: "Voir la traduction", ba: "Wo ìtúmọ̀" },
  
  // Sondages vocaux
  vocalPoll: { fr: "Sondage vocal", ba: "Bìɔ̀ ohùn" },
  voteByVoice: { fr: "Votez par la voix", ba: "Dìbò pẹ̀lú ohùn" },
  votes: { fr: "votes", ba: "ìdìbò" },
  pollResults: { fr: "Résultats du sondage", ba: "Àbájáde bìɔ̀" },
  
  // Conversation
  conversation: { fr: "Conversation", ba: "Ìfọ̀rọ̀wérọ̀" },
  startConversation: { fr: "Démarrer conversation", ba: "Bẹ̀rẹ̀ ìfọ̀rọ̀wérọ̀" },
  endConversation: { fr: "Terminer conversation", ba: "Parí ìfọ̀rọ̀wérọ̀" },
  
  // Splash / Accueil
  slogan: { fr: "Parlez, Agissez, Connectez", ba: "Sọ̀rọ̀, Ṣe, So pọ̀" },
  tapMicToStart: { fr: "Appuyez sur le micro pour commencer", ba: "Tẹ̀ maikì láti bẹ̀rẹ̀" },
  
  // Temps
  now: { fr: "Maintenant", ba: "Báyìí" },
  today: { fr: "Aujourd'hui", ba: "Òní" },
  yesterday: { fr: "Hier", ba: "Àná" },
  daysAgo: { fr: "jours", ba: "ọjọ́" },
  hoursAgo: { fr: "heures", ba: "wákàtí" },
  minutesAgo: { fr: "minutes", ba: "ìṣẹ́jú" },
  
  // Confirmation
  areYouSure: { fr: "Êtes-vous sûr ?", ba: "Ṣé o dá ọ lójú?" },
  yes: { fr: "Oui", ba: "Bẹ́ẹ̀ni" },
  no: { fr: "Non", ba: "Bẹ́ẹ̀kọ́" },
  
  // Audio feedback
  newPublication: { fr: "Nouvelle publication", ba: "Sɔ́ɔ̀rù tuntun" },
  newMessage: { fr: "Nouveau message", ba: "Ìránṣẹ́ tuntun" },
  likeReceived: { fr: "Quelqu'un aime votre publication", ba: "Ẹnìkan fẹ́ràn sɔ́ɔ̀rù rẹ" },
  
  // Mode Audio Description
  audioDescriptionMode: { fr: "Mode Audio Description", ba: "Ètò Àpèjúwe Ohùn" },
  audioDescriptionOn: { fr: "Audio Description activée", ba: "Àpèjúwe Ohùn ti ṣí" },
  audioDescriptionOff: { fr: "Audio Description désactivée", ba: "Àpèjúwe Ohùn ti pa" },
  
  // Messages d'écran pour audio description
  screenHome: { fr: "Vous êtes sur la page d'accueil. 6 services disponibles. Appuyez sur le micro pour parler.", ba: "O wà ní ojú ewé àkọ́kọ́. Sínsín mẹ́fà wà. Tẹ̀ maikì láti sọ̀rọ̀." },
  screenSocial: { fr: "Page sociale. Voyez les publications, messages et lives.", ba: "Ojú ewé àwùjọ. Wo sɔ́ɔ̀rù, ìránṣẹ́ àti gbígbé." },
  screenServices: { fr: "Page des services IA. 6 assistants disponibles.", ba: "Ojú ewé sínsín ÌA. Olùrànlọ́wọ́ mẹ́fà wà." },
  screenMarket: { fr: "Page marché. Boutique et emplois.", ba: "Ojú ewé ọjà. Ṣọ́ọ̀pù àti iṣẹ́." },
  screenSOS: { fr: "Page urgence. Appuyez sur le bouton rouge pour alerter.", ba: "Ojú ewé kpákpá. Tẹ̀ bọ́tìn pupa láti kìlọ̀." },
  screenProfile: { fr: "Votre profil. Gérez vos paramètres.", ba: "Mɛ̀ rẹ. Ṣàkóso ètò rẹ." },
  
  // Dictionnaire
  screenDictionary: { fr: "Dictionnaire vocal. Parlez ou tapez un mot pour obtenir sa traduction.", ba: "Gbɛ́-sɔ́ɔ̀rù ohùn. Sọ tàbí kọ ɔ̀rɔ̀ láti rí ìtúmọ̀." },
  speakWord: { fr: "Dites un mot", ba: "Sọ ɔ̀rɔ̀ kan" },
  typeWord: { fr: "Tapez un mot", ba: "Kọ ɔ̀rɔ̀" },
  suggestions: { fr: "Suggestions", ba: "Àbá" },
  phonetic: { fr: "Phonétique", ba: "Ìró" },
  definition: { fr: "Définition", ba: "Ìtúmọ̀" },
  example: { fr: "Exemple", ba: "Àpẹẹrẹ" },
  listenBariba: { fr: "Écouter en bariba", ba: "Gbọ́ ní Bàátɔ̀nú" },
  listenFrench: { fr: "Écouter en français", ba: "Gbọ́ ní Fàránsé" },
  keyboardMode: { fr: "Mode clavier", ba: "Ètò ìkọ̀wé" },
  voiceMode: { fr: "Mode vocal", ba: "Ètò ohùn" },
  wordFound: { fr: "Mot trouvé", ba: "Ɔ̀rɔ̀ rí" },
  noWordFound: { fr: "Mot non trouvé", ba: "Kò rí ɔ̀rɔ̀" },
  recentSearches: { fr: "Recherches récentes", ba: "Àwọn ìwádìí tó ṣẹ̀ṣẹ̀" },
  listenAll: { fr: "Écouter tout", ba: "Gbọ́ gbogbo" },
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
  // BARIBA par défaut
  const [currentLang, setCurrentLang] = useState<TamTamLang>(() => {
    const saved = localStorage.getItem('tamtam-lang');
    return (saved as TamTamLang) || 'ba'; // Bariba par défaut
  });
  
  const { translateFrenchToBariba, translateBaribaToFrench, isTranslating } = useSimpleTranslation();

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
        const result = await translateFrenchToBariba(text);
        return result.translation;
      } else {
        const result = await translateBaribaToFrench(text);
        return result.translation;
      }
    } catch {
      return text;
    }
  }, [translateFrenchToBariba, translateBaribaToFrench]);

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
