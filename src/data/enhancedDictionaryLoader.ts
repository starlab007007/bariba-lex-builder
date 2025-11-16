/**
 * Chargeur enrichi pour toutes les sources de données
 * Charge le dictionnaire + phrases bibliques + exemples
 */

import { loadComprehensiveDictionary, type DictionaryEntry } from "./fullDictionaryData";

export interface BiblicalPhrase {
  french: string;
  bariba: string;
  reference: string;
  frenchWords: string[];
  baribaWords: string[];
}

export interface DictionaryExample {
  french: string;
  bariba: string;
  word: string;
  partOfSpeech?: string;
}

export interface EnhancedDictionaryData {
  entries: DictionaryEntry[];
  phrases: BiblicalPhrase[];
  examples: DictionaryExample[];
}

/**
 * Charger les phrases bibliques depuis fra_bba_dictionnary.json
 */
async function loadBiblicalPhrases(): Promise<BiblicalPhrase[]> {
  try {
    console.log("📖 Chargement des phrases bibliques...");
    const response = await fetch('/src/data/fra_bba_dictionnary.json');
    
    if (!response.ok) {
      console.error(`Erreur de chargement fra_bba: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const phrases: BiblicalPhrase[] = [];
    
    for (const item of data) {
      if (!item.bariba || !item.french) continue;

      const baribaText = item.bariba.trim();
      const frenchText = item.french.trim();

      phrases.push({
        french: frenchText,
        bariba: baribaText,
        reference: item.reference || '',
        frenchWords: frenchText.toLowerCase().split(/\s+/),
        baribaWords: baribaText.toLowerCase().split(/\s+/)
      });
    }

    console.log(`✅ ${phrases.length} phrases bibliques chargées`);
    return phrases;
  } catch (error) {
    console.error("❌ Erreur lors du chargement des phrases bibliques:", error);
    return [];
  }
}

/**
 * Charger les exemples depuis dictionnaire-10-2.json
 */
async function loadDictionaryExamples(): Promise<DictionaryExample[]> {
  try {
    console.log("📚 Chargement des exemples du dictionnaire...");
    const response = await fetch('/src/data/dictionnaire-10-2.json');
    
    if (!response.ok) {
      console.error(`Erreur de chargement dictionnaire-10-2: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const examples: DictionaryExample[] = [];
    
    for (const item of data) {
      if (!item.word) continue;

      const exampleFrancais = Array.isArray(item.example_francais) ? item.example_francais : [];
      const exampleBariba = Array.isArray(item.example_bariba) ? item.example_bariba : [];

      const minLength = Math.min(exampleFrancais.length, exampleBariba.length);
      
      for (let i = 0; i < minLength; i++) {
        const frenchEx = exampleFrancais[i]?.trim();
        const baribaEx = exampleBariba[i]?.trim();
        
        if (frenchEx && baribaEx && frenchEx.length > 0) {
          examples.push({
            french: frenchEx,
            bariba: baribaEx,
            word: item.word.trim(),
            partOfSpeech: item.part_of_speech || item.pos
          });
        }
      }
    }

    console.log(`✅ ${examples.length} exemples chargés`);
    return examples;
  } catch (error) {
    console.error("❌ Erreur lors du chargement des exemples:", error);
    return [];
  }
}

/**
 * Charger toutes les données enrichies
 */
export async function loadEnhancedDictionary(): Promise<EnhancedDictionaryData> {
  console.log("🚀 Chargement des données enrichies...");
  
  const [entries, phrases, examples] = await Promise.all([
    loadComprehensiveDictionary(),
    loadBiblicalPhrases(),
    loadDictionaryExamples()
  ]);

  console.log("📊 Données chargées:");
  console.log(`  - Entrées dictionnaire: ${entries.length}`);
  console.log(`  - Phrases bibliques: ${phrases.length}`);
  console.log(`  - Exemples: ${examples.length}`);

  return {
    entries,
    phrases,
    examples
  };
}
