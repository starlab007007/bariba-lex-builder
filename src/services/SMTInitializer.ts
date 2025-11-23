/**
 * SMT System Initializer
 * Loads and initializes the Statistical Machine Translation system
 */

import { supabase } from "@/integrations/supabase/client";
import { statisticalEngine } from "./StatisticalTranslationEngine";
import { enhancedCorrector } from "./EnhancedGrammaticalCorrector";
import { trieIndex } from "@/utils/TrieIndex";
import { statisticalPatterns } from "./StatisticalPatternsService";

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

    // 🔍 SOLUTION 5: Vérification de cohérence avec la base de données
    const { count: dbPhrasesCount } = await supabase
      .from('training_phrases')
      .select('*', { count: 'exact', head: true });

    // Check localStorage for persistent initialization status
    const storedStatus = localStorage.getItem('smt_initialization_status');
    if (storedStatus) {
      try {
        const parsed = JSON.parse(storedStatus);
        const age = Date.now() - parsed.timestamp;
        
        // 🔍 SOLUTION 5: Vérifier la cohérence du cache avec la DB
        if (parsed.phrasesCount !== dbPhrasesCount) {
          console.warn(`⚠️ Incohérence détectée: cache=${parsed.phrasesCount}, DB=${dbPhrasesCount}`);
          console.warn("♻️ Invalidation du cache et réinitialisation...");
          localStorage.removeItem('smt_initialization_status');
        }
        // If initialized less than 24h ago AND coherent
        else if (age < 24 * 60 * 60 * 1000 && parsed.isInitialized) {
          console.log("✅ SMT System already initialized (from localStorage, age: " + Math.round(age / 1000 / 60) + "min)");
          this.initializationStatus = parsed;
          
          // ✅ SOLUTION 2: Vérifier que les moteurs sont VRAIMENT prêts
          const enginesReady = statisticalEngine.isReady() && enhancedCorrector.isReady();
          
          if (enginesReady) {
            console.log(`✅ Moteurs validés: SMT=${statisticalEngine.isReady()}, Corrector=${enhancedCorrector.isReady()}`);
            return this.initializationStatus;
          } else {
            console.warn("⚠️ Cache valide mais moteurs non prêts, réinitialisation...");
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
      
      // 🔍 SOLUTION: Diagnostic de l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log(`🔐 Auth Status: ${user ? 'AUTHENTICATED ✅' : 'ANONYMOUS ⚠️'}`);
      if (user) {
        console.log(`👤 User ID: ${user.id}`);
        console.log(`📧 Email: ${user.email}`);
      }
      if (authError) {
        console.error('❌ Auth Error:', authError);
      }

      // 🔍 SOLUTION: Utiliser Edge Function avec Service Role pour garantir l'accès
      console.log("🔄 Calling SMT initialization Edge Function with Service Role...");
      
      const { data: initData, error: edgeFunctionError } = await supabase.functions.invoke('smt-initialize', {
        body: {}
      });
      
      let trainingPhrases: any[] = [];
      let phrasesCount = 0;
      let dictionaryCount = 0;
      let sourceStats: Record<string, number> = {};
      
      if (edgeFunctionError) {
        console.error('❌ Edge Function Error:', edgeFunctionError);
        console.error('   Message:', edgeFunctionError.message);
        console.error('   Context:', edgeFunctionError.context);
        
        // ⚠️ FALLBACK: Si Edge Function échoue, charger directement depuis Supabase EN BATCHES
        console.warn('⚠️ Fallback: Loading ALL phrases directly from Supabase...');
        
        // PHASE 1: Charger TOUTES les phrases par batches de 3000
        const BATCH_SIZE = 3000;
        const allPhrases: any[] = [];
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from('training_phrases')
            .select('french_text, bariba_text, quality_score, source')
            .range(offset, offset + BATCH_SIZE - 1);
          
          if (batchError || !batch || batch.length === 0) {
            console.log(`   ✓ Fin du chargement à offset ${offset}`);
            hasMore = false;
            break;
          }
          
          allPhrases.push(...batch);
          offset += batch.length;
          console.log(`   ✓ Chargé ${allPhrases.length} phrases...`);
          hasMore = batch.length === BATCH_SIZE;
        }
        
        const directData = allPhrases;
        const directError = allPhrases.length === 0 ? new Error('No data loaded') : null;
        
        if (directError || !directData || directData.length === 0) {
          throw new Error('Both Edge Function and direct access failed');
        }
        
        // Utiliser les données directes comme trainingPhrases
        trainingPhrases = directData;
        phrasesCount = directData.length;
        dictionaryCount = 0;
        sourceStats = directData.reduce((acc: any, p: any) => {
          const source = p.source || 'unknown';
          acc[source] = (acc[source] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`✅ Fallback SUCCESS: ${phrasesCount} phrases loaded directly`);
        console.log("📊 RÉPARTITION PAR SOURCE:");
        Object.entries(sourceStats).forEach(([source, count]: [string, any]) => {
          console.log(`   ✓ ${source}: ${count.toLocaleString()} phrases`);
        });

        console.log(`📊 Total loaded: ${phrasesCount} phrases, ${dictionaryCount} dictionary entries`);
        
      } else if (!initData || initData.error) {
        console.error('❌ Edge Function returned error:', initData?.error);
        throw new Error(initData?.error || 'Unknown edge function error');
      } else {
        phrasesCount = initData.phrasesCount;
        dictionaryCount = initData.dictionaryCount;
        sourceStats = initData.sourceStats;
        
        console.log(`✅ Edge Function SUCCESS: ${phrasesCount} phrases confirmed in DB`);
        console.log("📊 RÉPARTITION PAR SOURCE:");
        Object.entries(sourceStats).forEach(([source, count]: [string, any]) => {
          console.log(`   ✓ ${source}: ${count.toLocaleString()} phrases`);
        });

        console.log(`📊 Total confirmed: ${phrasesCount} phrases, ${dictionaryCount} dictionary entries`);
        
        // ⚠️ Charger TOUTES les phrases directement depuis Supabase EN BATCHES
        // L'Edge Function confirme seulement que les données existent
        console.log(`🔄 Loading ALL ${phrasesCount} phrases directly from Supabase...`);
        
        const BATCH_SIZE = 3000;
        const allLoadedPhrases: any[] = [];
        let offset = 0;
        let hasMore = true;
        
        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from('training_phrases')
            .select('french_text, bariba_text, quality_score, source')
            .range(offset, offset + BATCH_SIZE - 1);
          
          if (batchError || !batch || batch.length === 0) {
            console.log(`   ✓ Fin du chargement à offset ${offset}`);
            hasMore = false;
            break;
          }
          
          allLoadedPhrases.push(...batch);
          const percentage = Math.round((allLoadedPhrases.length / phrasesCount) * 100);
          console.log(`   ✓ Chargé ${allLoadedPhrases.length} / ${phrasesCount} phrases (${percentage}%)...`);
          hasMore = batch.length === BATCH_SIZE;
          offset += batch.length;
        }
        
        const loadedPhrases = allLoadedPhrases;
        const loadError = allLoadedPhrases.length === 0 ? new Error('No data loaded') : null;
        
        // PHASE 1 VALIDATION: Vérifier que nous avons au moins 95% des données
        if (allLoadedPhrases.length < phrasesCount * 0.95) {
          console.error(`❌ Chargement incomplet: ${allLoadedPhrases.length} / ${phrasesCount} (${Math.round((allLoadedPhrases.length / phrasesCount) * 100)}%)`);
          throw new Error(`Incomplete data loading! Only ${allLoadedPhrases.length}/${phrasesCount} phrases loaded`);
        }
        
        if (loadError || !loadedPhrases) {
          throw new Error(`Failed to load training phrases: ${loadError?.message}`);
        }
        
        trainingPhrases = loadedPhrases;
        console.log(`✅ Loaded ${trainingPhrases.length} phrases for training`);
      }

      if (!trainingPhrases || trainingPhrases.length === 0) {
        throw new Error(`Insufficient data for SMT initialization (0 phrases). Import premium data first.`);
      }
      
      console.log(`✅ Proceeding with SMT initialization using ${trainingPhrases.length} phrases`);

      // Initialize engines in parallel
      console.log(`🔄 Initialisation des moteurs avec ${phrasesCount} phrases...`);
      console.log(`   1️⃣ Moteur statistique SMT (simplifié)...`);
      console.log(`   2️⃣ Correcteur grammatical...`);
      console.log(`   3️⃣ Index Trie...`);
      console.log(`   4️⃣ Patterns statistiques (NOUVEAU)...`);
      
      const [smtResult, correctorResult, trieResult, patternsResult] = await Promise.allSettled([
        statisticalEngine.initialize(
          trainingPhrases.map((p: any) => ({
            french: p.french_text,
            bariba: p.bariba_text,
            quality_score: p.quality_score
          }))
        ),
        enhancedCorrector.learnPatterns(
          trainingPhrases.map((p: any) => ({
            french: p.french_text,
            bariba: p.bariba_text
          }))
        ),
        trieIndex.buildFromPairs(
          trainingPhrases.map((p: any) => ({
            french: p.french_text,
            bariba: p.bariba_text
          }))
        ),
        statisticalPatterns.initialize(
          trainingPhrases.map((p: any) => ({
            french: p.french_text,
            bariba: p.bariba_text
          }))
        )
      ]);

      console.log(`   ${smtResult.status === 'fulfilled' ? '✅' : '❌'} SMT: ${smtResult.status}`);
      console.log(`   ${correctorResult.status === 'fulfilled' ? '✅' : '❌'} Correcteur: ${correctorResult.status}`);
      console.log(`   ${trieResult.status === 'fulfilled' ? '✅' : '❌'} Trie: ${trieResult.status}`);
      console.log(`   ${patternsResult.status === 'fulfilled' ? '✅' : '❌'} Patterns: ${patternsResult.status}`);
      
      if (smtResult.status === 'rejected') console.error("❌ SMT Error:", smtResult.reason);
      if (correctorResult.status === 'rejected') console.error("❌ Corrector Error:", correctorResult.reason);
      if (trieResult.status === 'rejected') console.error("❌ Trie Error:", trieResult.reason);
      if (patternsResult.status === 'rejected') console.error("❌ Patterns Error:", patternsResult.reason);

      const duration = Date.now() - startTime;

      this.initializationStatus = {
        isInitialized: true,
        phrasesCount: trainingPhrases.length,
        dictionaryCount: dictionaryCount || 0,
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
