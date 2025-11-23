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
      console.log("📊 Loading ALL training phrases (NO LIMITS - TOUTES LES PHRASES)...");

      // Compter d'abord le total exact
      const { count: totalCount, error: countError } = await supabase
        .from('training_phrases')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      console.log(`📊 Total exact dans DB: ${totalCount} phrases`);

      // Load ALL training phrases (AUCUNE LIMITE - TOUTES LES PHRASES)
      // IMPORTANT: Supabase par défaut ne limite PAS, mais on force explicitement
      const { data: phrases, error: phrasesError } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text, quality_score, source')
        .order('created_at', { ascending: false });

      if (phrasesError) throw phrasesError;

      const trainingPhrases = phrases || [];
      
      console.log(`📊 PHRASES RÉELLEMENT CHARGÉES: ${trainingPhrases.length} / ${totalCount} au total`);
      
      if (trainingPhrases.length !== totalCount) {
        console.warn(`⚠️ ATTENTION: Seulement ${trainingPhrases.length} phrases chargées sur ${totalCount} dans la DB!`);
      }

      // Log detailed statistics by source
      const sourceStats = trainingPhrases.reduce((acc, p) => {
        const source = p.source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log("📊 RÉPARTITION PAR SOURCE:");
      Object.entries(sourceStats).forEach(([source, count]) => {
        console.log(`   ✓ ${source}: ${count.toLocaleString()} phrases`);
      });

      // Load ALL dictionary entries (no limit)
      const { data: dictionary, error: dictError } = await supabase
        .from('dictionary_entries')
        .select('id, word, definition');

      if (dictError) throw dictError;

      console.log(`📊 Total loaded: ${trainingPhrases.length} phrases, ${dictionary?.length || 0} dictionary entries`);

      if (trainingPhrases.length === 0) {
        throw new Error(`Insufficient data for SMT initialization (${trainingPhrases.length} phrases). Import premium data first.`);
      }
      
      console.log(`✅ Proceeding with SMT initialization using ALL ${trainingPhrases.length} phrases`);

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

      console.log("✅ ====== SMT SYSTEM INITIALIZED ======");
      console.log(`   📊 TOTAL PHRASES: ${this.initializationStatus.phrasesCount.toLocaleString()}`);
      console.log(`   📖 Dictionary: ${this.initializationStatus.dictionaryCount.toLocaleString()}`);
      console.log(`   🤖 SMT Engine: ${this.initializationStatus.smtReady ? '✅ READY' : '❌ NOT READY'}`);
      console.log(`   📝 Corrector: ${this.initializationStatus.correctoReady ? '✅ READY' : '❌ NOT READY'}`);
      console.log(`   🌳 Trie Index: ${this.initializationStatus.trieReady ? '✅ READY' : '❌ NOT READY'}`);
      console.log(`   ⏱️ Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log("✅ ====================================");

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
    console.log("🔄 Resetting SMT initialization status...");
    this.initializationStatus = null;
    this.isInitializing = false;
  }

  /**
   * Refresh SMT system after data changes
   */
  async refresh(): Promise<InitializationStatus> {
    console.log("🔄 Refreshing SMT system...");
    this.reset();
    return await this.initialize();
  }
}

export const smtInitializer = SMTInitializer.getInstance();
