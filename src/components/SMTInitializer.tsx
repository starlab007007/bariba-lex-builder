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
        console.log("🔄 Initializing SMT system...");
        // Force fresh initialization to get latest data
        smtInitializer.reset();
        const status = await smtInitializer.initialize();
        
        if (status.isInitialized && status.smtReady) {
          console.log(`✅ SMT system initialized with ${status.phrasesCount.toLocaleString()} phrases`);
          setInitialized(true);
          
          toast({
            title: "✅ Moteur SMT activé",
            description: `${status.phrasesCount.toLocaleString()} paires FR-BBA chargées et prêtes`,
          });
        } else {
          console.warn("⚠️ SMT system initialized but not fully ready");
        }
      } catch (error: any) {
        console.warn("⚠️ SMT initialization skipped:", error.message);
        if (!error.message.includes('Insufficient data')) {
          toast({
            title: "ℹ️ SMT non initialisé",
            description: "Importez des données via l'Admin pour activer le SMT",
            variant: "default",
          });
        }
      }
    };

    // Initialize immediately to get latest data
    initializeSMT();
  }, [toast]);

  return null; // This component doesn't render anything
}
