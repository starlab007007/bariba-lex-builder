/**
 * Configuration du Space Gradio ByT5 Expert
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const ByT5SpaceConfig = () => {
  const [spaceUrl, setSpaceUrl] = useState("https://zimesongbian-modele-byt5-bariba-expert-api-v03.hf.space");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [detailedLogs, setDetailedLogs] = useState<any>(null);
  const [urlWarning, setUrlWarning] = useState<string>("");

  // Validate URL format and detect underscores
  const validateUrl = (url: string) => {
    if (!url) {
      setUrlWarning("");
      return;
    }

    // Check for underscores in the URL (HuggingFace converts them to hyphens)
    if (url.includes('_')) {
      const correctedUrl = url.replace(/_/g, '-');
      setUrlWarning(`⚠️ L'URL contient des underscores (_) qui seront convertis en tirets (-) par HuggingFace. URL correcte suggérée: ${correctedUrl}`);
    } else {
      setUrlWarning("");
    }
  };

  // Auto-correct URL by replacing underscores with hyphens
  const autoCorrectUrl = () => {
    const correctedUrl = spaceUrl.replace(/_/g, '-');
    setSpaceUrl(correctedUrl);
    setUrlWarning("");
    toast.success("✅ URL corrigée automatiquement");
  };

  // Validate on URL change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setSpaceUrl(newUrl);
    validateUrl(newUrl);
  };

  // Validate initial URL on mount
  useEffect(() => {
    validateUrl(spaceUrl);
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setErrorDetails("");
    setDetailedLogs(null);

    try {
      console.log('🧪 Testing ByT5 connection with URL:', spaceUrl);
      
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
        setDetailedLogs(data);
        toast.success(`✅ Connexion réussie via ${data.endpoint || 'ByT5 Expert'} !`);
        console.log('✅ Test successful:', data);
      } else if (data && data.error) {
        throw new Error(JSON.stringify(data, null, 2));
      } else {
        throw new Error("Réponse invalide du Space");
      }
    } catch (error: any) {
      setTestResult('error');
      const details = error.message || error.toString();
      setErrorDetails(details);
      
      try {
        const parsed = JSON.parse(details);
        setDetailedLogs(parsed);
      } catch {
        // Not JSON
      }
      
      toast.error("❌ Échec de la connexion ByT5");
      console.error("❌ ByT5 test error:", error);
    } finally {
      setIsTesting(false);
    }
  };

  const openSpaceUrl = () => {
    window.open(spaceUrl, '_blank');
  };

  const openHFSpacePage = () => {
    window.open('https://huggingface.co/spaces/zimesongbian/modele_byt5_bariba_expert_api_v03', '_blank');
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
        <Label htmlFor="space-url">URL complète du Space Gradio</Label>
        <div className="flex gap-2">
          <Input
            id="space-url"
            value={spaceUrl}
            onChange={handleUrlChange}
            placeholder="https://username-space-name.hf.space"
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={openSpaceUrl} title="Ouvrir le Space">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Format: https://username-space-name.hf.space (URL complète avec https://)
        </p>
        
        {/* URL Validation Warning */}
        {urlWarning && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {urlWarning}
                </p>
              </div>
            </div>
            <Button 
              onClick={autoCorrectUrl} 
              size="sm" 
              variant="outline"
              className="w-full border-amber-500/20 hover:bg-amber-500/10"
            >
              🔧 Auto-corriger l'URL
            </Button>
          </div>
        )}
      </div>

      {/* Success details */}
      {testResult === 'success' && detailedLogs && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                ✅ Connexion réussie !
              </p>
              <div className="text-xs space-y-1">
                <p><strong>Traduction test:</strong> {detailedLogs.translation}</p>
                <p><strong>Endpoint utilisé:</strong> {detailedLogs.endpoint}</p>
                <p><strong>Durée:</strong> {detailedLogs.duration}ms</p>
                <p><strong>Confiance:</strong> {detailedLogs.confidence}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error details */}
      {testResult === 'error' && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium text-destructive">
                  {detailedLogs?.error || 'Erreur de connexion'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {detailedLogs?.details || errorDetails.substring(0, 200)}
                </p>
              </div>

              {/* Diagnostics spécifiques si disponibles */}
              {detailedLogs?.diagnostics && (
                <div className="rounded-md bg-background/50 p-3 space-y-2">
                  <p className="text-xs font-medium">🔍 Diagnostic automatique:</p>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>✅ Space Status: {detailedLogs.diagnostics.spaceStatus}</p>
                    <p>✅ Homepage: {detailedLogs.diagnostics.homepageAccessible ? 'Accessible' : 'Non accessible'}</p>
                    <p>❌ Endpoints testés: {detailedLogs.diagnostics.testedEndpoints.length}</p>
                    <p>❌ Aucun endpoint API ne répond</p>
                  </div>
                </div>
              )}

              {/* Root cause si disponible */}
              {detailedLogs?.rootCause && (
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    🔎 Cause probable:
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    {detailedLogs.rootCause}
                  </p>
                </div>
              )}

              {detailedLogs?.troubleshooting && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium hover:underline">
                    💡 Voir les actions recommandées ({detailedLogs.troubleshooting.length} étapes)
                  </summary>
                  <div className="mt-2 bg-background/50 p-3 rounded space-y-1">
                    {detailedLogs.troubleshooting.map((item: string, idx: number) => (
                      <p key={idx} className={item === '' ? 'h-2' : ''}>
                        {item}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              <Button 
                onClick={openHFSpacePage} 
                variant="outline" 
                size="sm" 
                className="w-full"
              >
                📍 Ouvrir la page HuggingFace du Space
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Test button */}
      <Button onClick={testConnection} disabled={isTesting} className="w-full" size="lg">
        <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
        {isTesting ? 'Test en cours...' : 'Tester la connexion'}
      </Button>

      {/* Informations */}
      <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <p className="font-medium">Informations importantes</p>
        </div>
        <ul className="space-y-1.5 text-muted-foreground text-xs">
          <li>• Le modèle ByT5 Expert est hébergé sur Hugging Face Spaces</li>
          <li>• L'URL configurée est sauvegardée dans le secret BYT5_SPACE_URL</li>
          <li>• Assurez-vous que votre token HF a accès au Space privé (permissions FINEGRAINED)</li>
          <li>• Le Space peut prendre 10-30s pour démarrer s'il est en sommeil</li>
          <li>• Le test essaie automatiquement plusieurs endpoints API pour trouver le bon</li>
          <li>• Consultez les logs de l'Edge Function <code>byt5-bariba-translate</code> pour diagnostic détaillé</li>
        </ul>
      </div>
    </Card>
  );
};
