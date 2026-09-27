import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Activity, ShieldCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground">
          Accès aux opérations de maintenance réellement disponibles dans FITILA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance et données</CardTitle>
          <CardDescription>
            Les actions ci-dessous ouvrent les outils opérationnels correspondants ; aucun bouton factice n’est conservé.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border p-4 space-y-3">
            <div>
              <div className="font-medium">Exporter le dictionnaire</div>
              <div className="text-sm text-muted-foreground">Télécharger les données du dictionnaire depuis l’outil d’export.</div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/export"><Download className="mr-2 h-4 w-4" /> Ouvrir l’export</Link>
            </Button>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div>
              <div className="font-medium">Contrôler la qualité</div>
              <div className="text-sm text-muted-foreground">Consulter les métriques et vérifier la qualité des données.</div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/quality"><ShieldCheck className="mr-2 h-4 w-4" /> Ouvrir Qualité</Link>
            </Button>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div>
              <div className="font-medium">Diagnostic système</div>
              <div className="text-sm text-muted-foreground">Inspecter les traductions, modèles et services actifs.</div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/diagnostic"><Activity className="mr-2 h-4 w-4" /> Ouvrir Diagnostic</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations système</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Application</span><span className="font-medium">FITILA Web</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Base de données</span><span className="font-medium">Supabase PostgreSQL</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Backend</span><span className="font-medium">Supabase + Edge Functions</span></div>
          <div className="flex justify-between gap-4"><span className="text-muted-foreground">Déploiement</span><span className="font-medium">Docker / Traefik</span></div>
          <Button asChild variant="ghost" className="mt-2 px-0">
            <Link to="/admin"><ExternalLink className="mr-2 h-4 w-4" /> Retour au centre de contrôle</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
