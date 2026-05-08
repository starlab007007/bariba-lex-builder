export interface TourStep {
  id: string;
  /** CSS selector data-tour="xxx" — null means fullscreen card */
  target: string | null;
  emoji: string;
  titleFr: string;
  titleBa: string;
  textFr: string;
  textBa: string;
  /** Which image to show for fullscreen-only steps */
  image?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'menu',
    target: '[data-tour="tour-menu"]',
    emoji: '☰',
    titleFr: 'Le menu',
    titleBa: 'Menu',
    textFr: 'Appuyez ici pour ouvrir le menu et voir toutes les fonctions.',
    textBa: 'A tɛ ne daa menu wɛ.',
  },
  {
    id: 'feed',
    target: '[data-tour="tour-feed-indicator"]',
    emoji: '🎬',
    titleFr: 'Les fils',
    titleBa: 'Yɛnu kɛra',
    textFr: 'Glissez à gauche ou droite pour changer de fil : Patrimoine, Ma Voix, Création.',
    textBa: 'A kpa wiru gaa gɔɔ wee.',
  },
  {
    id: 'create',
    target: '[data-tour="tour-create-btn"]',
    emoji: '➕',
    titleFr: 'Créer',
    titleBa: 'Ko yɔyɔ',
    textFr: 'Appuyez ici pour créer un contenu : audio, vidéo ou photo.',
    textBa: 'A tɛ ne daa ko yɔyɔ wɛ.',
  },
  {
    id: 'learn',
    target: '[data-tour="tour-tab-learn"]',
    emoji: '📚',
    titleFr: 'Apprendre',
    titleBa: 'Dɔnni',
    textFr: 'Apprenez le Bariba avec des leçons interactives.',
    textBa: 'A dɔn Baatɔnum ne.',
  },
  {
    id: 'dico',
    target: '[data-tour="tour-tab-dico"]',
    emoji: '📖',
    titleFr: 'Dictionnaire',
    titleBa: 'Gɛrɛ sɛbu',
    textFr: 'Cherchez un mot en Bariba ou en Français.',
    textBa: 'A wuri gɛrɛ dɔɔ ne.',
  },
  {
    id: 'translate',
    target: '[data-tour="tour-tab-translate"]',
    emoji: '🌍',
    titleFr: 'Traducteur',
    titleBa: 'Gɛrɛ wɔɔbu',
    textFr: 'Traduisez entre Bariba et Français.',
    textBa: 'A wɔɔbu gɛrɛ ne.',
  },
  {
    id: 'ia',
    target: '[data-tour="tour-tab-ia"]',
    emoji: '🤖',
    titleFr: 'Fitila IA',
    titleBa: 'Fitila IA',
    textFr: 'Posez vos questions à l\'intelligence artificielle en Bariba.',
    textBa: 'A sɔ Fitila IA ne.',
  },
  {
    id: 'keyboard-intro',
    target: null,
    emoji: '⌨️',
    titleFr: 'Clavier Bariba',
    titleBa: 'Clavier Baatɔnum',
    textFr: 'Activez le clavier Bariba pour taper les caractères spéciaux : ɔ ɛ ŋ ã ĩ ũ.',
    textBa: 'A yiru clavier Baatɔnum wɛ.',
  },
  {
    id: 'keyboard-step1',
    target: null,
    emoji: '⚙️',
    titleFr: 'Étape 1',
    titleBa: 'Tɛni 1',
    textFr: 'Ouvrez Paramètres → Langue et saisie → Clavier virtuel → Activer "Clavier Bariba Fitila".',
    textBa: 'A yɛ Paramètres → Langue → Activer Clavier Bariba.',
  },
  {
    id: 'keyboard-step2',
    target: null,
    emoji: '🌐',
    titleFr: 'Étape 2',
    titleBa: 'Tɛni 2',
    textFr: 'Dans n\'importe quelle app, appuyez longuement sur la barre d\'espace ou l\'icône 🌐 pour changer de clavier.',
    textBa: 'A tɛ barre d\'espace wɛ gaa kpa clavier wɛ.',
  },
];

export const TOUR_STORAGE_KEY = 'fitila_tour_done';