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
          
          // Show success toast only if we have premium data
          if (status.phrasesCount >= 10000) {
            toast({
              title: "✅ Moteur SMT activé",
              description: `${status.phrasesCount.toLocaleString()} paires chargées`,
            });
          }
        } else {
          console.warn("⚠️ SMT system initialized but not fully ready");
        }
      } catch (error: any) {
        console.warn("⚠️ SMT initialization skipped:", error.message);
        // Don't show error toast - system can work without SMT
      }
    };

    // Initialize after a short delay to not block UI
    const timer = setTimeout(initializeSMT, 1000);
    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
}
