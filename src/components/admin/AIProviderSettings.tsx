import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Provider = 'mistral' | 'gemini';
type Snapshot = {
  settings: { active_provider: Provider; version: number; updated_at: string };
  providers: { provider: Provider; configured: boolean; model: string; vision_model: string }[];
};
type Result = Snapshot & { test?: { ok: boolean; model: string; duration_ms: number }; unchanged?: boolean };
const labels: Record<Provider, string> = { mistral: 'Mistral', gemini: 'Gemini Flash-Lite' };

async function request(body: Record<string, unknown>): Promise<Result> {
  const { data, error } = await supabase.functions.invoke('ai-provider-settings', { body });
  if (error) {
    let detail: { message?: string } = {};
    if (error.context instanceof Response) detail = await error.context.json().catch(() => ({}));
    throw new Error(detail.message || 'Le réglage IA ne peut pas être chargé. Réessayez.');
  }
  if (!data?.settings || !Array.isArray(data.providers)) throw new Error('Le service de configuration IA est indisponible.');
  return data;
}

export default function AIProviderSettings() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState<string | null>('loading');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    request({ action: 'get' }).then(data => { if (active) setSnapshot(data); })
      .catch(error => { if (active) setMessage({ text: error.message, error: true }); })
      .finally(() => { if (active) setBusy(null); });
    return () => { active = false; };
  }, []);
  const refresh = async () => {
    setBusy('loading'); setMessage(null);
    try { setSnapshot(await request({ action: 'get' })); }
    catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Chargement impossible.', error: true }); }
    finally { setBusy(null); }
  };
  const run = async (action: 'test' | 'activate', provider: Provider) => {
    if (!snapshot) return;
    setBusy(`${action}:${provider}`); setMessage(null);
    try {
      const data = await request({ action, provider, expected_version: snapshot.settings.version });
      setSnapshot(data);
      setMessage({ error: false, text: action === 'activate'
        ? `${labels[provider]} est actif pour tous les utilisateurs. Les prochaines demandes utiliseront ce moteur.`
        : `${labels[provider]} répond correctement${data.test ? ` (${(data.test.duration_ms / 1000).toFixed(1)} s)` : ''}.` });
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Le changement a échoué.', error: true }); }
    finally { setBusy(null); }
  };
  return (
    <Card id="ai-provider-settings">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-600" /> Moteur IA de FITILA</CardTitle>
            <CardDescription>Choisissez le moteur commun aux assistants, à la rédaction, à l’OCR et à la révision des traductions.</CardDescription>
          </div>
          <Button aria-label="Actualiser le réglage IA" variant="ghost" size="icon" disabled={!!busy} onClick={refresh} className="shrink-0">
            <RefreshCw className={`h-4 w-4 ${busy === 'loading' ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {busy === 'loading' && !snapshot && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement du moteur actif…</p>}
        {snapshot && <div className="grid gap-3 md:grid-cols-2">
          {snapshot.providers.map(item => {
            const active = item.provider === snapshot.settings.active_provider;
            const pending = busy?.endsWith(`:${item.provider}`);
            return <section key={item.provider} aria-label={labels[item.provider]} className={`min-w-0 rounded-xl border p-4 ${active ? 'border-amber-500 bg-amber-500/5' : ''}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">{labels[item.provider]}</h3>
                {active && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"><CheckCircle2 className="h-3.5 w-3.5" /> Actif</span>}
              </div>
              <p className="break-all font-mono text-xs text-muted-foreground">{item.model}</p>
              <p className={`mt-2 text-sm ${item.configured ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300'}`}>{item.configured ? 'Clé serveur présente' : 'Clé serveur à ajouter'}</p>
              {!item.configured && <p className="mt-2 break-words text-xs text-muted-foreground">Ajoutez {item.provider === 'gemini' ? 'GEMINI_API_KEY' : 'MISTRAL_API_KEY'} dans les secrets Supabase, puis actualisez.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={!!busy || !item.configured} onClick={() => run('test', item.provider)}>{busy === `test:${item.provider}` ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Zap className="mr-1.5 h-4 w-4" />} Tester {item.provider === 'gemini' ? 'Gemini' : 'Mistral'}</Button>
                <Button size="sm" disabled={!!busy || active || !item.configured} onClick={() => run('activate', item.provider)}>{pending && busy?.startsWith('activate:') && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{active ? 'Moteur actif' : `Activer ${item.provider === 'gemini' ? 'Gemini' : 'Mistral'}`}</Button>
              </div>
            </section>;
          })}
        </div>}
        {message && <p role={message.error ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${message.error ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'}`}>{message.text}</p>}
        <p className="text-xs leading-relaxed text-muted-foreground">L’activation vérifie d’abord une réponse réelle. La voix bariba conserve Omnilingual et Meta MMS ; ByT5 et les corpus restent chargés de la traduction.</p>
        <a href="https://supabase.com/dashboard/project/dvswhjawiooprghzeyol/functions/secrets" target="_blank" rel="noreferrer" className="inline-block text-sm underline underline-offset-4">Configurer les clés serveur</a>
      </CardContent>
    </Card>
  );
}
