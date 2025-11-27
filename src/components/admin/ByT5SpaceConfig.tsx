/**
 * Configuration du Space Gradio ByT5 Expert
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const ByT5SpaceConfig = () => {
  const [spaceUrl, setSpaceUrl] = useState("zimesongbian-modele-byt5-bariba-expert-api-v03");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>("");

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setErrorDetails("");

    try {
      const { data, error } = await supabase.functions.invoke('byt5-bariba-translate', {
        body: {
          text: 'Bonjour',
          sourceLang: 'french',
          targetLang: 'bariba',
          mode: 'fast'
        }
      });

      if (error) {
        throw error;
      }

      if (data && data.translation) {
        setTestResult('success');
        toast.success("✅ Connexion ByT5 Expert réussie !");
      } else {
        throw new Error("Réponse invalide du Space");
      }
    } catch (error: any) {
      setTestResult('error');
      const details = error.message || error.toString();
      setErrorDetails(details);
      toast.error("❌ Échec de la connexion ByT5");
      console.error("ByT5 test error:", error);
    } finally {
      setIsTesting(false);
    }
  };

  const openSpaceUrl = () => {
    window.open(`https://${spaceUrl}.hf.space`, '_blank');
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-2">Configuration ByT5 Expert</h3>
        <p className="text-sm text-muted-foreground">
          Configurez et testez la connexion au Space Gradio ByT5 Expert sur Hugging Face
        </p>
      </div>

      {/* Status actuel */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Statut:</span>
        {testResult === 'success' && (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connecté
          </Badge>
        )}
        {testResult === 'error' && (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Déconnecté
          </Badge>
        )}
        {testResult === null && (
          <Badge variant="secondary">Non testé</Badge>
        )}
      </div>

      {/* Configuration URL */}
      <div className="space-y-2">
        <Label htmlFor="space-url">URL du Space Gradio</Label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">https://</span>
            <Input
              id="space-url"
              value={spaceUrl}
              onChange={(e) => setSpaceUrl(e.target.value)}
              placeholder="username-space-name"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">.hf.space</span>
          </div>
          <Button variant="outline" size="icon" onClick={openSpaceUrl}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Format: username-space-name (sans https:// ni .hf.space)
        </p>
      </div>

      {/* Détails de l'erreur */}
      {errorDetails && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-destructive">Erreur de connexion</p>
              <p className="text-xs text-muted-foreground">{errorDetails}</p>
              <div className="mt-2 text-xs space-y-1">
                <p className="font-medium">Solutions possibles:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Vérifiez que l'URL du Space est correcte sur Hugging Face</li>
                  <li>Assurez-vous que le Space est public ou que votre token a accès</li>
                  <li>Vérifiez que le token HUGGING_FACE_API_TOKEN est configuré</li>
                  <li>Le Space peut être en train de démarrer (réessayez dans 30s)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={testConnection} disabled={isTesting} className="flex-1">
          <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
          {isTesting ? 'Test en cours...' : 'Tester la connexion'}
        </Button>
      </div>

      {/* Informations */}
      <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
        <p className="font-medium">ℹ️ Informations</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Le modèle ByT5 Expert est hébergé sur Hugging Face Spaces</li>
          <li>• Assurez-vous que votre token HF a accès au Space privé</li>
          <li>• Le Space peut prendre 10-30s pour démarrer la première fois</li>
          <li>• L'URL actuelle dans le code: zimesongbian-modele-byt5-bariba-expert-api-v03</li>
        </ul>
      </div>
    </Card>
  );
};
