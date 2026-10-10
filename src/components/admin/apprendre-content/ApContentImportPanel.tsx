// Panneau admin : publie le contenu pédagogique Apprendre (mots + scènes)
// dans Supabase (`apprendre_module_content`), à partir du JSON embarqué
// dans le bundle web (copie strictement identique — même hash — des
// fichiers `assets/data/` de la branche Flutter de référence
// `feat/apprendre-v2.4-build19-20260927`, voir `src/data/apprendre_v2.json`
// et `scenes_v2.json`).
//
// C'est la seule action qui rend réelle la décision « centraliser le contenu
// dans Supabase » : tant qu'elle n'a pas été déclenchée (une fois, par un
// administrateur, depuis l'app déployée avec de vrais identifiants Supabase),
// `useApprendreContent()` (voir `src/lib/apprendre/contentLoader.ts`) retombe
// sur le JSON embarqué — ce qui fonctionne déjà, sans casser l'existant,
// mais ne bénéficie pas encore de la mise à jour sans redéploiement que
// permet la centralisation.
//
// Non câblé dans une page/onglet admin par ce lot de travail (routing hors
// périmètre, voir le rapport livré à l'utilisateur) — composant autonome à
// monter où l'administrateur du site le jugera pertinent (par ex. un nouvel
// onglet « Contenu Apprendre » à côté de l'onglet Voix existant).

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Database, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApprendreContentJson, ScenesContentJson } from '@/lib/apprendre/content';
import type { Json } from '@/integrations/supabase/types';

type ImportOutcome = { id: string; version: string; hash: string; item_count: number };

type RowState = 'idle' | 'loading' | 'done' | 'error';

interface RowResult {
  state: RowState;
  outcome?: ImportOutcome;
  error?: string;
}

const CONTENT_VERSION = 'v2.4-build19-20260927';

async function importOne(id: 'core' | 'scenes', content: ApprendreContentJson | ScenesContentJson): Promise<ImportOutcome> {
  const { data, error } = await (supabase as any).rpc('apprendre_import_content', {
    _id: id,
    _content: content as unknown as Json,
    _version: CONTENT_VERSION,
  });
  if (error) throw error;
  return data as unknown as ImportOutcome;
}

function ResultRow({ label, result }: { label: string; result: RowResult }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {result.state === 'done' && result.outcome && (
          <p className="text-xs text-muted-foreground">
            {result.outcome.item_count} éléments · hash {result.outcome.hash.slice(0, 10)}… · v{result.outcome.version}
          </p>
        )}
        {result.state === 'error' && <p className="text-xs text-destructive">{result.error}</p>}
      </div>
      {result.state === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {result.state === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
      {result.state === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
      {result.state === 'idle' && <Badge variant="outline">En attente</Badge>}
    </div>
  );
}

export default function ApContentImportPanel() {
  const [core, setCore] = useState<RowResult>({ state: 'idle' });
  const [scenes, setScenes] = useState<RowResult>({ state: 'idle' });
  const [running, setRunning] = useState(false);

  const runImport = async () => {
    setRunning(true);
    setCore({ state: 'loading' });
    setScenes({ state: 'loading' });
    try {
      const [coreModule, scenesModule] = await Promise.all([
        import('@/data/apprendre_v2.json'),
        import('@/data/scenes_v2.json'),
      ]);
      const coreJson = (coreModule.default ?? coreModule) as unknown as ApprendreContentJson;
      const scenesJson = (scenesModule.default ?? scenesModule) as unknown as ScenesContentJson;

      try {
        const outcome = await importOne('core', coreJson);
        setCore({ state: 'done', outcome });
      } catch (err) {
        setCore({ state: 'error', error: err instanceof Error ? err.message : 'Échec de l’import.' });
      }
      try {
        const outcome = await importOne('scenes', scenesJson);
        setScenes({ state: 'done', outcome });
      } catch (err) {
        setScenes({ state: 'error', error: err instanceof Error ? err.message : 'Échec de l’import.' });
      }
      toast.success('Import du contenu Apprendre terminé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec du chargement du JSON embarqué.');
      setCore({ state: 'error', error: 'JSON embarqué introuvable.' });
      setScenes({ state: 'error', error: 'JSON embarqué introuvable.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Contenu Apprendre (mots + scènes)</CardTitle>
        <CardDescription>
          Publie le vocabulaire et les scènes de vie ({CONTENT_VERSION}) dans Supabase, pour que le web et Flutter
          partagent la même source de contenu. Réservé aux administrateurs (`apprendre_import_content` refuse
          silencieusement tout autre rôle).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResultRow label="Mots (apprendre_v2.json)" result={core} />
        <ResultRow label="Scènes (scenes_v2.json)" result={scenes} />
        <Button onClick={runImport} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Publier le contenu dans Supabase
        </Button>
      </CardContent>
    </Card>
  );
}
