/**
 * SMT System Initializer
 * Loads and initializes the Statistical Machine Translation system
 */

import { supabase } from "@/integrations/supabase/client";
import { statisticalEngine } from "./StatisticalTranslationEngine";
import { enhancedCorrector } from "./EnhancedGrammaticalCorrector";
import { trieIndex } from "@/utils/TrieIndex";

interface InitializationStatus {
  isInitialized: boolean;
  phrasesCount: number;
  dictionaryCount: number;
  smtReady: boolean;
  correctoReady: boolean;
  trieReady: boolean;
  duration: number;
}

export class SMTInitializer {
  private static instance: SMTInitializer;
  private initializationStatus: InitializationStatus | null = null;
  private isInitializing = false;

  private constructor() {}

  static getInstance(): SMTInitializer {
    if (!SMTInitializer.instance) {
      SMTInitializer.instance = new SMTInitializer();
    }
    return SMTInitializer.instance;
  }

  /**
   * Initialize the SMT system from database
   */
  async initialize(): Promise<InitializationStatus> {
    if (this.initializationStatus?.isInitialized) {
      console.log("✅ SMT System already initialized");
      return this.initializationStatus;
    }

    if (this.isInitializing) {
      console.log("⏳ Initialization already in progress...");
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      return this.initializationStatus!;
    }

    this.isInitializing = true;
    const startTime = Date.now();

    try {
      console.log("🚀 Initializing SMT System from database...");

      // Load training phrases
      const { data: phrases, error: phrasesError } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text, quality_score')
        .eq('source', 'premium_merged')
        .order('created_at', { ascending: false });

      if (phrasesError) throw phrasesError;

      // Fallback to all phrases if no premium data
      let trainingPhrases = phrases || [];
      if (trainingPhrases.length === 0) {
        console.warn("⚠️ No premium data found, loading all phrases...");
        const { data: allPhrases } = await supabase
          .from('training_phrases')
          .select('french_text, bariba_text, quality_score')
          .limit(10000);
        trainingPhrases = allPhrases || [];
      }

      // Load dictionary
      const { data: dictionary, error: dictError } = await supabase
        .from('dictionary_entries')
        .select('id, word, definition')
        .limit(10000);

      if (dictError) throw dictError;

      console.log(`📊 Loaded ${trainingPhrases.length} phrases, ${dictionary?.length || 0} dictionary entries`);

      if (trainingPhrases.length < 100) {
        throw new Error(`Insufficient data for SMT initialization (${trainingPhrases.length} phrases). Import premium data first.`);
      }

      // Initialize engines in parallel
      const [smtResult, correctorResult, trieResult] = await Promise.allSettled([
        statisticalEngine.initialize(
          trainingPhrases.map(p => ({
            french: p.french_text,
            bariba: p.bariba_text,
            quality_score: p.quality_score
          }))
        ),
        enhancedCorrector.learnPatterns(
          trainingPhrases.map(p => ({
            french: p.french_text,
            bariba: p.bariba_text
          }))
        ),
        trieIndex.buildFromPairs(
          trainingPhrases.map(p => ({
            french: p.french_text,
            bariba: p.bariba_text
          }))
        )
      ]);

      const duration = Date.now() - startTime;

      this.initializationStatus = {
        isInitialized: true,
        phrasesCount: trainingPhrases.length,
        dictionaryCount: dictionary?.length || 0,
        smtReady: smtResult.status === 'fulfilled' && statisticalEngine.isReady(),
        correctoReady: correctorResult.status === 'fulfilled' && enhancedCorrector.isReady(),
        trieReady: trieResult.status === 'fulfilled' && trieIndex.getSize() > 0,
        duration
      };

      console.log("✅ SMT System initialized successfully:");
      console.log(`   📊 Phrases: ${this.initializationStatus.phrasesCount}`);
      console.log(`   📖 Dictionary: ${this.initializationStatus.dictionaryCount}`);
      console.log(`   🤖 SMT Engine: ${this.initializationStatus.smtReady ? '✅' : '❌'}`);
      console.log(`   📝 Corrector: ${this.initializationStatus.correctoReady ? '✅' : '❌'}`);
      console.log(`   🌳 Trie Index: ${this.initializationStatus.trieReady ? '✅' : '❌'}`);
      console.log(`   ⏱️ Duration: ${(duration / 1000).toFixed(2)}s`);

      return this.initializationStatus;
    } catch (error) {
      console.error("❌ SMT initialization failed:", error);
      this.initializationStatus = {
        isInitialized: false,
        phrasesCount: 0,
        dictionaryCount: 0,
        smtReady: false,
        correctoReady: false,
        trieReady: false,
        duration: Date.now() - startTime
      };
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Get current initialization status
   */
  getStatus(): InitializationStatus | null {
    return this.initializationStatus;
  }

  /**
   * Reset initialization (force re-init)
   */
  reset(): void {
    this.initializationStatus = null;
    this.isInitializing = false;
  }
}

export const smtInitializer = SMTInitializer.getInstance();
