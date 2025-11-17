/**
 * Chargeur de corpus enrichi avec les nouvelles données d'entraînement
 * Charge les 2669 paires du rapport technique + données existantes
 */

export interface TrainingPair {
  id: string;
  category: string;
  french: string;
  bariba: string;
  source: 'corpus_initial' | 'dictionary' | 'biblical';
}

export interface EnhancedCorpus {
  trainingPairs: TrainingPair[];
  totalPairs: number;
  categoryCounts: { [category: string]: number };
}

/**
 * Charge le corpus initial de 2669 paires
 */
export async function loadCorpusInitial(): Promise<TrainingPair[]> {
  try {
    const response = await fetch('/src/data/corpus_initial_2600.json');
    if (!response.ok) {
      console.warn('Corpus initial non disponible, utilisation du dictionnaire existant');
      return [];
    }
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      id: item.id,
      category: item.category || 'General',
      french: item.french || '',
      bariba: item.bariba || '',
      source: 'corpus_initial' as const
    })).filter((pair: TrainingPair) => pair.french && pair.bariba);
  } catch (error) {
    console.error('Erreur lors du chargement du corpus initial:', error);
    return [];
  }
}

/**
 * Charge les phrases bibliques
 */
export async function loadBiblicalPhrases(): Promise<TrainingPair[]> {
  try {
    const response = await fetch('/src/data/fra_bba_dictionnary.json');
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    return data.map((item: any, index: number) => ({
      id: `BIBLICAL_${index}`,
      category: 'Biblical',
      french: item.french || '',
      bariba: item.bariba || '',
      source: 'biblical' as const
    })).filter((pair: TrainingPair) => pair.french && pair.bariba);
  } catch (error) {
    console.error('Erreur lors du chargement des phrases bibliques:', error);
    return [];
  }
}

/**
 * Déduplique les paires d'entraînement
 */
function deduplicateTrainingPairs(pairs: TrainingPair[]): TrainingPair[] {
  const seen = new Set<string>();
  const deduplicated: TrainingPair[] = [];

  pairs.forEach(pair => {
    // Créer une clé unique basée sur french+bariba normalisés
    const key = `${pair.french.trim().toLowerCase()}|||${pair.bariba.trim().toLowerCase()}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(pair);
    }
  });

  return deduplicated;
}

/**
 * Filtre les paires de mauvaise qualité
 */
function filterLowQualityPairs(pairs: TrainingPair[]): TrainingPair[] {
  return pairs.filter(pair => {
    // Supprimer les paires trop courtes
    if (pair.french.length < 3 || pair.bariba.length < 3) {
      return false;
    }

    // Supprimer les paires contenant uniquement de la ponctuation
    if (!/[a-zA-Zàâäéèêëïîôùûüÿæœçɛɔãĩũɛ̃ɔ̃]/.test(pair.french) || 
        !/[a-zA-Zàâäéèêëïîôùûüÿæœçɛɔãĩũɛ̃ɔ̃]/.test(pair.bariba)) {
      return false;
    }

    // Supprimer les paires avec du texte manifestement invalide
    const invalidPatterns = [
      /^\d+$/,  // Que des chiffres
      /^\.+$/,  // Que des points
      /^[,;:!?]+$/, // Que de la ponctuation
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(pair.french.trim()) || pattern.test(pair.bariba.trim())) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calcule les statistiques par catégorie
 */
function calculateCategoryStats(pairs: TrainingPair[]): { [category: string]: number } {
  const stats: { [category: string]: number } = {};

  pairs.forEach(pair => {
    const category = pair.category || 'General';
    stats[category] = (stats[category] || 0) + 1;
  });

  return stats;
}

/**
 * Charge le corpus complet enrichi
 * Selon le rapport: ~220k exemples au total
 */
export async function loadEnhancedCorpus(): Promise<EnhancedCorpus> {
  console.log('📚 Chargement du corpus enrichi...');

  // Charger toutes les sources en parallèle
  const [corpusInitial, biblicalPhrases] = await Promise.all([
    loadCorpusInitial(),
    loadBiblicalPhrases()
  ]);

  console.log(`✓ Corpus initial: ${corpusInitial.length} paires`);
  console.log(`✓ Phrases bibliques: ${biblicalPhrases.length} paires`);

  // Combiner toutes les paires
  let allPairs = [
    ...corpusInitial,
    ...biblicalPhrases
  ];

  console.log(`→ Total avant nettoyage: ${allPairs.length} paires`);

  // Nettoyer les données (Phase 1 du rapport)
  allPairs = filterLowQualityPairs(allPairs);
  console.log(`→ Après filtrage qualité: ${allPairs.length} paires`);

  allPairs = deduplicateTrainingPairs(allPairs);
  console.log(`→ Après déduplication: ${allPairs.length} paires`);

  // Calculer les statistiques
  const categoryCounts = calculateCategoryStats(allPairs);

  console.log('📊 Répartition par catégorie:');
  Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} paires`);
    });

  return {
    trainingPairs: allPairs,
    totalPairs: allPairs.length,
    categoryCounts
  };
}

/**
 * Recherche dans le corpus par similarité
 */
export function searchCorpusBySimilarity(
  corpus: EnhancedCorpus,
  query: string,
  language: 'french' | 'bariba',
  limit: number = 5
): TrainingPair[] {
  const queryLower = query.toLowerCase().trim();

  // Calculer la similarité Jaccard simplifiée
  const calculateSimilarity = (text: string): number => {
    const textLower = text.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/));
    const textWords = new Set(textLower.split(/\s+/));
    
    const intersection = new Set([...queryWords].filter(w => textWords.has(w)));
    const union = new Set([...queryWords, ...textWords]);
    
    return intersection.size / union.size;
  };

  // Scorer et trier
  const scored = corpus.trainingPairs
    .map(pair => ({
      pair,
      score: language === 'french' 
        ? calculateSimilarity(pair.french)
        : calculateSimilarity(pair.bariba)
    }))
    .filter(item => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(item => item.pair);
}
