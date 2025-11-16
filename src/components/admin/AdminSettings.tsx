import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Database, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { toast } = useToast();

  const handleBackup = () => {
    toast({
      title: 'Sauvegarde en cours',
      description: 'La sauvegarde de la base de données est en cours...',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground">
          Configuration et maintenance du système
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestion des Données</CardTitle>
          <CardDescription>
            Sauvegarder et maintenir les données du dictionnaire
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Sauvegarde complète</div>
              <div className="text-sm text-muted-foreground">
                Exporter toutes les données (dictionnaire, phrases, logs)
              </div>
            </div>
            <Button onClick={handleBackup} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Optimiser la base</div>
              <div className="text-sm text-muted-foreground">
                Nettoyer et optimiser la base de données
              </div>
            </div>
            <Button variant="outline">
              <Database className="mr-2 h-4 w-4" />
              Optimiser
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">Actualiser les index</div>
              <div className="text-sm text-muted-foreground">
                Reconstruire les index de recherche
              </div>
            </div>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations Système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base de données:</span>
              <span className="font-medium">PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backend:</span>
              <span className="font-medium">Lovable Cloud</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
