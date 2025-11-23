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
  cachePrewarmed?: boolean;
  cachePreloadCount?: number;
  timestamp?: number;
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
   * Checks localStorage first to avoid re-initialization on page reload
   */
  async initialize(): Promise<InitializationStatus> {
    // Check if already initialized in memory
    if (this.initializationStatus?.isInitialized) {
      console.log("✅ SMT System already initialized in memory");
      return this.initializationStatus;
    }

    // Check localStorage for persistent initialization status
    const storedStatus = localStorage.getItem('smt_initialization_status');
    if (storedStatus) {
      try {
        const parsed = JSON.parse(storedStatus);
        const age = Date.now() - parsed.timestamp;
        // If initialized less than 24h ago, reuse
        if (age < 24 * 60 * 60 * 1000 && parsed.isInitialized) {
          console.log("✅ SMT System already initialized (from localStorage, age: " + Math.round(age / 1000 / 60) + "min)");
          this.initializationStatus = parsed;
          // Verify engines are still ready
          if (statisticalEngine.isReady() && enhancedCorrector.isReady()) {
            return this.initializationStatus;
          } else {
            console.log("⚠️ Engines not ready, re-initializing...");
            localStorage.removeItem('smt_initialization_status');
          }
        }
      } catch (e) {
        console.warn("Failed to parse stored SMT status:", e);
        localStorage.removeItem('smt_initialization_status');
      }
    }

    if (this.isInitializing) {
      console.log("⏳ Initialization already in progress, waiting...");
      // Wait for initialization with timeout (max 60s)
      const maxWait = 60000; // 60 seconds
      const startWait = Date.now();
      while (this.isInitializing && (Date.now() - startWait) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (this.isInitializing) {
        console.error("❌ Initialization timeout - forcing reset");
        this.isInitializing = false;
        throw new Error("Initialization timeout");
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

      // CHARGEMENT DE TOUTES LES PHRASES PAR PAGINATION
      // Supabase limite à 1000 résultats par défaut, donc on pagine pour tout charger
      console.log(`🔄 Chargement de TOUTES les ${totalCount} phrases par pagination...`);
      
      const BATCH_SIZE = 1000;
      const trainingPhrases: any[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        console.log(`🔄 Chargement batch ${Math.floor(offset / BATCH_SIZE) + 1}...`);
        
        const { data: batch, error: batchError } = await supabase
          .from('training_phrases')
          .select('french_text, bariba_text, quality_score, source')
          .order('created_at', { ascending: false })
          .range(offset, offset + BATCH_SIZE - 1);

        if (batchError) {
          console.error(`❌ Erreur batch à offset ${offset}:`, batchError);
          throw batchError;
        }

        if (batch && batch.length > 0) {
          trainingPhrases.push(...batch);
          offset += batch.length;
          const percentage = Math.round((trainingPhrases.length / (totalCount || 1)) * 100);
          console.log(`   ✓ Chargé ${trainingPhrases.length} / ${totalCount} phrases (${percentage}%)...`);
          hasMore = batch.length === BATCH_SIZE;
        } else {
          console.log(`   ⚠️ Batch vide à offset ${offset}, arrêt de la pagination`);
          hasMore = false;
        }
      }
      
      console.log(`✅ TOUTES LES PHRASES CHARGÉES: ${trainingPhrases.length} / ${totalCount} au total`);
      
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
      console.log(`🔄 Initialisation des moteurs avec ${trainingPhrases.length} phrases...`);
      console.log(`   1️⃣ Initialisation moteur statistique SMT...`);
      console.log(`   2️⃣ Apprentissage correcteur grammatical...`);
      console.log(`   3️⃣ Construction index Trie...`);
      
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

      console.log(`   ${smtResult.status === 'fulfilled' ? '✅' : '❌'} Moteur SMT: ${smtResult.status}`);
      console.log(`   ${correctorResult.status === 'fulfilled' ? '✅' : '❌'} Correcteur: ${correctorResult.status}`);
      console.log(`   ${trieResult.status === 'fulfilled' ? '✅' : '❌'} Trie Index: ${trieResult.status}`);
      
      if (smtResult.status === 'rejected') console.error("❌ SMT Error:", smtResult.reason);
      if (correctorResult.status === 'rejected') console.error("❌ Corrector Error:", correctorResult.reason);
      if (trieResult.status === 'rejected') console.error("❌ Trie Error:", trieResult.reason);

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

      // Pre-warm cache with most frequent translations
      await this.preWarmCache();

      console.log("✅ ====== SMT SYSTEM INITIALIZED ======");
      console.log(`   📊 TOTAL PHRASES: ${this.initializationStatus.phrasesCount.toLocaleString()}`);
      console.log(`   📖 Dictionary: ${this.initializationStatus.dictionaryCount.toLocaleString()}`);
      console.log(`   🤖 SMT Engine: ${this.initializationStatus.smtReady ? '✅ READY' : '❌ NOT READY'}`);
      console.log(`   📝 Corrector: ${this.initializationStatus.correctoReady ? '✅ READY' : '❌ NOT READY'}`);
      console.log(`   🌳 Trie Index: ${this.initializationStatus.trieReady ? '✅ READY' : '❌ NOT READY'}`);
      console.log(`   ⏱️ Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log("✅ ====================================");

      // Save to localStorage for persistence across page reloads
      const statusToStore = {
        ...this.initializationStatus,
        timestamp: Date.now()
      };
      localStorage.setItem('smt_initialization_status', JSON.stringify(statusToStore));

      // Save metrics to database for historical tracking
      await this.saveInitializationLog(sourceStats);

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
    localStorage.removeItem('smt_initialization_status');
    return await this.initialize();
  }

  /**
   * Pre-warm cache with most frequent phrases from translation_memory
   */
  private async preWarmCache(): Promise<void> {
    try {
      console.log("🔥 Pre-warming cache with top 1000 frequent phrases...");
      
      const { translationCache } = await import("@/utils/TranslationCache");
      
      // Load top 1000 most used translations from memory
      const { data: frequentPhrases, error } = await supabase
        .from('translation_memory')
        .select('source_text, target_text, source_language, target_language')
        .order('usage_count', { ascending: false })
        .limit(1000);

      if (error) {
        console.warn("⚠️ Could not load frequent phrases for cache:", error.message);
        return;
      }

      if (frequentPhrases && frequentPhrases.length > 0) {
        frequentPhrases.forEach(p => {
          const key = `${p.source_language}:${p.source_text}`;
          translationCache.set(key, p.target_text, 98, 'prewarmed');
        });
        
        console.log(`✅ Cache pre-warmed with ${frequentPhrases.length} translations`);
        
        if (this.initializationStatus) {
          this.initializationStatus.cachePrewarmed = true;
          this.initializationStatus.cachePreloadCount = frequentPhrases.length;
        }
      }
    } catch (err) {
      console.warn("⚠️ Cache pre-warming failed:", err);
    }
  }

  /**
   * Save initialization log to database for historical tracking
   */
  private async saveInitializationLog(sourceStats: Record<string, number>): Promise<void> {
    try {
      if (!this.initializationStatus) return;

      const { error } = await supabase
        .from('smt_initialization_logs')
        .insert({
          phrases_count: this.initializationStatus.phrasesCount,
          dictionary_count: this.initializationStatus.dictionaryCount,
          duration_ms: this.initializationStatus.duration,
          smt_ready: this.initializationStatus.smtReady,
          corrector_ready: this.initializationStatus.correctoReady,
          trie_ready: this.initializationStatus.trieReady,
          cache_prewarmed: this.initializationStatus.cachePrewarmed || false,
          cache_preload_count: this.initializationStatus.cachePreloadCount || 0,
          source_stats: sourceStats,
          performance_metrics: {
            phrasesPerSecond: Math.round(this.initializationStatus.phrasesCount / (this.initializationStatus.duration / 1000)),
            avgLoadTime: this.initializationStatus.duration / 1000
          }
        });

      if (error) {
        console.warn("⚠️ Failed to save initialization log:", error.message);
      } else {
        console.log("✅ Initialization metrics saved to database");
      }
    } catch (err) {
      console.warn("⚠️ Error saving initialization log:", err);
    }
  }
}

export const smtInitializer = SMTInitializer.getInstance();
