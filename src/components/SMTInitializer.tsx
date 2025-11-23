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
        const status = await smtInitializer.initialize();
        
        if (status.isInitialized && status.smtReady) {
          console.log("✅ SMT system initialized successfully");
          setInitialized(true);
          
          // Show accurate phrase count
          toast({
            title: "✅ Moteur SMT activé",
            description: `${status.phrasesCount.toLocaleString()} paires FR-BBA chargées`,
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

    // Initialize after a short delay
    const timer = setTimeout(initializeSMT, 1000);
    return () => clearTimeout(timer);
  }, [toast]);

  return null; // This component doesn't render anything
}
