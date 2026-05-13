// Phrases Bariba les plus fréquentes — utilisées par le mode ⚡ du clavier.
// Chaque entrée : { ba: bariba NFC, fr: traduction française, cat: catégorie }

export interface PhraseRapide {
  ba: string;
  fr: string;
  cat: 'salut' | 'nombre' | 'courtoisie' | 'marche' | 'famille' | 'temps';
}

export const PHRASES_RAPIDES: PhraseRapide[] = [
  // Salutations
  { ba: 'Alaafia', fr: 'Bonjour / Ça va', cat: 'salut' },
  { ba: 'Yɛnu', fr: 'Oui', cat: 'salut' },
  { ba: 'Awo', fr: 'Non', cat: 'salut' },
  { ba: 'Soo', fr: 'Bienvenue', cat: 'salut' },
  { ba: 'Sɛmɛ gbãanu', fr: 'Merci beaucoup', cat: 'courtoisie' },
  { ba: 'A koo dɛ', fr: 'À bientôt', cat: 'salut' },
  { ba: 'Mã nɔ wɛ baa', fr: 'Comment vas-tu ?', cat: 'salut' },
  { ba: 'N ka ka mɛɛrɔ', fr: 'Pardon / Excuse-moi', cat: 'courtoisie' },

  // Nombres
  { ba: 'Tia', fr: 'Un (1)', cat: 'nombre' },
  { ba: 'Yiru', fr: 'Deux (2)', cat: 'nombre' },
  { ba: 'Ita', fr: 'Trois (3)', cat: 'nombre' },
  { ba: 'Nnɛ', fr: 'Quatre (4)', cat: 'nombre' },
  { ba: 'Nɔɔbu', fr: 'Cinq (5)', cat: 'nombre' },
  { ba: 'Nɔɔba', fr: 'Six (6)', cat: 'nombre' },
  { ba: 'Nɔɔba yɛndu', fr: 'Sept (7)', cat: 'nombre' },
  { ba: 'Nɔɔba yiru', fr: 'Huit (8)', cat: 'nombre' },
  { ba: 'Nɔɔba ita', fr: 'Neuf (9)', cat: 'nombre' },
  { ba: 'Wɔkuru', fr: 'Dix (10)', cat: 'nombre' },

  // Famille
  { ba: 'Baaba', fr: 'Père', cat: 'famille' },
  { ba: 'Mɛmma', fr: 'Mère', cat: 'famille' },
  { ba: 'Bii', fr: 'Enfant', cat: 'famille' },
  { ba: 'Sɔnɔ', fr: 'Frère / Sœur', cat: 'famille' },

  // Marché
  { ba: 'Yɛrɔ', fr: 'Combien ?', cat: 'marche' },
  { ba: 'Tii', fr: 'Eau', cat: 'marche' },
  { ba: 'Dii', fr: 'Manger', cat: 'marche' },
  { ba: 'Ka mì kpã', fr: 'C’est cher', cat: 'marche' },

  // Temps
  { ba: 'Yɔ̃ka', fr: 'Aujourd’hui', cat: 'temps' },
  { ba: 'Sɔɔ', fr: 'Hier', cat: 'temps' },
  { ba: 'Sia', fr: 'Demain', cat: 'temps' },
];