import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FullDictionaryImporter } from "./FullDictionaryImporter";
import DictionaryJsonImporter from "./DictionaryJsonImporter";
import TrainingPhraseImporter from "./TrainingPhraseImporter";
import { Database, Upload, Info, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function MassDataImporter() {
  const [showDictionaryImporter, setShowDictionaryImporter] = useState(false);
  const [showPhraseImporter, setShowPhraseImporter] = useState(false);

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Import Massif de Données</AlertTitle>
        <AlertDescription>
          Cette section permet d'importer de grandes quantités de données dans le système.
          Les imports peuvent prendre du temps (jusqu'à 1 heure pour l'ensemble).
          <br />
          <strong>Recommandation:</strong> Commencez par le dictionnaire complet, puis les phrases bibliques.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="dictionary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dictionary" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Dictionnaire Complet
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Personnalisé
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dictionary" className="space-y-4">
          <FullDictionaryImporter 
            onSuccess={() => {
              // Refresh any dependent data
            }}
          />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Import JSON Dictionnaire
                </CardTitle>
                <CardDescription>
                  Importer un fichier JSON personnalisé pour le dictionnaire
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showDictionaryImporter ? (
                  <DictionaryJsonImporter
                    onClose={() => setShowDictionaryImporter(false)}
                    onSuccess={() => {
                      setShowDictionaryImporter(false);
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setShowDictionaryImporter(true)}
                    className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors text-sm text-muted-foreground"
                  >
                    Cliquez pour ouvrir l'importateur
                  </button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Import Phrases d'Entraînement
                </CardTitle>
                <CardDescription>
                  Importer un fichier JSON de phrases pour l'entraînement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showPhraseImporter ? (
                  <TrainingPhraseImporter
                    onClose={() => setShowPhraseImporter(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowPhraseImporter(true)}
                    className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors text-sm text-muted-foreground"
                  >
                    Cliquez pour ouvrir l'importateur
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
