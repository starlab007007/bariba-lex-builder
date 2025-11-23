import { useEffect, useState } from "react";
import { smtInitializer } from "@/services/SMTInitializer";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Global SMT System Initializer
 * Initializes the Statistical Machine Translation system on app load
 */
export function SMTInitializer() {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Initialisation...");

  useEffect(() => {
    const initializeSMT = async () => {
      try {
        setLoading(true);
        setProgress(10);
        setStage("Chargement des données...");
        console.log("🔄 INITIALISATION SMT - Chargement de TOUTES les phrases...");
        
        // Force fresh initialization to get latest data
        smtInitializer.reset();
        setProgress(20);
        setStage("Construction du modèle statistique...");
        
        const status = await smtInitializer.initialize();
        setProgress(90);
        
        if (status.isInitialized && status.smtReady) {
          setProgress(100);
          setStage("SMT prêt !");
          console.log(`✅ ════════════════════════════════════════`);
          console.log(`✅ SMT SYSTÈME COMPLÈTEMENT OPÉRATIONNEL`);
          console.log(`✅ ${status.phrasesCount.toLocaleString()} PHRASES CHARGÉES ET ENTRAÎNÉES`);
          console.log(`✅ Moteur statistique: ${status.smtReady ? 'ACTIF' : 'INACTIF'}`);
          console.log(`✅ Correcteur grammatical: ${status.correctoReady ? 'ACTIF' : 'INACTIF'}`);
          console.log(`✅ Index Trie: ${status.trieReady ? 'ACTIF' : 'INACTIF'}`);
          console.log(`✅ ════════════════════════════════════════`);
          setInitialized(true);
          setLoading(false);
          
          toast({
            title: "✅ Moteur SMT activé et entraîné",
            description: `${status.phrasesCount.toLocaleString()} paires FR-BBA → Modèle prêt pour traduction`,
          });
        } else {
          setLoading(false);
          console.warn("⚠️ SMT system initialized but not fully ready");
          toast({
            title: "⚠️ SMT partiellement initialisé",
            description: `${status.phrasesCount} phrases chargées mais moteur non prêt`,
            variant: "default",
          });
        }
      } catch (error: any) {
        setLoading(false);
        setProgress(0);
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

  // Show loading indicator during initialization
  if (loading && !initialized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
        <Card className="w-80 bg-background/95 backdrop-blur-sm border-primary/20 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">{stage}</p>
                <p className="text-xs text-muted-foreground">
                  {progress < 100 ? "Chargement du moteur SMT..." : "Prêt !"}
                </p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
