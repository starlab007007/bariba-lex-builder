import { useEffect, useState } from "react";
import { smtInitializer } from "@/services/SMTInitializer";
import { useToast } from "@/hooks/use-toast";

/**
 * Global SMT System Initializer
 * Initializes the Statistical Machine Translation system on app load
 */
export function SMTInitializer() {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeSMT = async () => {
      try {
        console.log("🔄 INITIALISATION SMT - Chargement de TOUTES les phrases...");
        // Force fresh initialization to get latest data
        smtInitializer.reset();
        const status = await smtInitializer.initialize();
        
        if (status.isInitialized && status.smtReady) {
          console.log(`✅ ════════════════════════════════════════`);
          console.log(`✅ SMT SYSTÈME COMPLÈTEMENT OPÉRATIONNEL`);
          console.log(`✅ ${status.phrasesCount.toLocaleString()} PHRASES CHARGÉES ET ENTRAÎNÉES`);
          console.log(`✅ Moteur statistique: ${status.smtReady ? 'ACTIF' : 'INACTIF'}`);
          console.log(`✅ Correcteur grammatical: ${status.correctoReady ? 'ACTIF' : 'INACTIF'}`);
          console.log(`✅ Index Trie: ${status.trieReady ? 'ACTIF' : 'INACTIF'}`);
          console.log(`✅ ════════════════════════════════════════`);
          setInitialized(true);
          
          toast({
            title: "✅ Moteur SMT activé et entraîné",
            description: `${status.phrasesCount.toLocaleString()} paires FR-BBA → Modèle prêt pour traduction`,
          });
        } else {
          console.warn("⚠️ SMT system initialized but not fully ready");
          toast({
            title: "⚠️ SMT partiellement initialisé",
            description: `${status.phrasesCount} phrases chargées mais moteur non prêt`,
            variant: "default",
          });
        }
      } catch (error: any) {
        console.error("❌ SMT initialization error:", error.message);
        if (!error.message.includes('Insufficient data')) {
          toast({
            title: "❌ Erreur SMT",
            description: "Importez des données via Admin → Données",
            variant: "destructive",
          });
        }
      }
    };

    // Initialize immediately to get latest data
    initializeSMT();
  }, [toast]);

  return null; // This component doesn't render anything
}
