// Chargement du contenu Apprendre (mots + scènes) côté web.
//
// Décision produit (validée par l'utilisateur) : le contenu pédagogique est
// centralisé dans Supabase (`apprendre_module_content`, migration
// `20260928090000_apprendre_module_content.sql`) — web ET Flutter lisent à
// terme la même source, Flutter gardant son JSON embarqué comme repli
// hors-ligne uniquement. Ce module reproduit la même stratégie côté web :
// 1. essaie de lire le contenu publié dans Supabase (à jour, modifiable
//    sans redéploiement via l'import admin — voir `contentImport.ts`) ;
// 2. si Supabase est injoignable, pas encore importé, ou renvoie un contenu
//    vide/invalide, retombe silencieusement sur le JSON embarqué dans le
//    bundle web (`src/data/apprendre_v2.json` / `scenes_v2.json`, copie
//    strictement identique — même hash — des fichiers `assets/data/` de la
//    branche Flutter de référence `feat/apprendre-v2.4-build19-20260927`),
//    afin que l'apprenant ne voie jamais un module vide.
//
// Rien ici ne modifie la logique pédagogique elle-même (`content.ts` et le
// reste de `src/lib/apprendre/`, déjà portés et vérifiés) — ce module ne
// fait que décider D'OÙ vient le JSON brut avant de le passer aux
// constructeurs `ApprendreContent`/`ScenesContent`.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ApprendreContent, ScenesContent, type ApprendreContentJson, type ScenesContentJson } from './content';

export type ApprendreContentSource = 'supabase' | 'bundled';

export interface ApprendreContentBundle {
  content: ApprendreContent;
  scenesContent: ScenesContent;
  /** D'où vient CE chargement — utile pour un indicateur discret côté admin/debug, pas nécessaire à l'apprenant. */
  source: ApprendreContentSource;
  /** Version publiée côté Supabase, si `source === 'supabase'`. */
  version?: string;
}

/**
 * Un contenu Supabase est jugé utilisable s'il contient au moins un mot (ou
 * une scène, pour `scenes_v2.json`) — un enregistrement présent mais vide
 * (import raté, ligne recréée sans contenu) ne doit pas remplacer le repli
 * embarqué par un module silencieusement vide.
 */
function looksLikeUsableCoreJson(value: unknown): value is ApprendreContentJson {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ApprendreContentJson>;
  return Array.isArray(v.cards) && v.cards.length > 0 && Array.isArray(v.themes) && Array.isArray(v.foundations);
}
function looksLikeUsableScenesJson(value: unknown): value is ScenesContentJson {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<ScenesContentJson>;
  return Array.isArray(v.scenes) && v.scenes.length > 0 && Array.isArray(v.categories);
}

/** Charge les deux lignes de contenu (`core`, `scenes`) depuis Supabase, ou `null` si indisponible/incomplet. */
async function loadFromSupabase(): Promise<{ core: ApprendreContentJson; scenes: ScenesContentJson; version: string } | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('apprendre_module_content')
      .select('id, content, content_version')
      .in('id', ['core', 'scenes']);
    if (error || !data) return null;

    const core = data.find((row) => row.id === 'core')?.content;
    const scenes = data.find((row) => row.id === 'scenes')?.content;
    const version = data.find((row) => row.id === 'core')?.content_version ?? data[0]?.content_version;
    if (!looksLikeUsableCoreJson(core) || !looksLikeUsableScenesJson(scenes)) return null;

    return { core, scenes, version: version ?? 'supabase' };
  } catch {
    // Hors-ligne, RLS refusée, table pas encore migrée sur ce projet, etc. —
    // le repli embarqué prend le relais silencieusement (voir loadApprendreContent).
    return null;
  }
}

/** Charge le JSON embarqué dans le bundle web (import dynamique — code-splitting Vite, comme `fullDictionaryData.ts`). */
async function loadBundled(): Promise<{ core: ApprendreContentJson; scenes: ScenesContentJson }> {
  const [coreModule, scenesModule] = await Promise.all([
    import('@/data/apprendre_v2.json'),
    import('@/data/scenes_v2.json'),
  ]);
  return {
    core: (coreModule.default ?? coreModule) as unknown as ApprendreContentJson,
    scenes: (scenesModule.default ?? scenesModule) as unknown as ScenesContentJson,
  };
}

/**
 * Point d'entrée unique : charge le contenu Apprendre (mots + scènes),
 * Supabase d'abord, repli embarqué sinon. Ne lève jamais d'exception pour
 * une indisponibilité réseau/Supabase — seul un JSON embarqué structurellement
 * invalide (bug de build) ferait échouer cette fonction.
 */
export async function loadApprendreContent(): Promise<ApprendreContentBundle> {
  const fromSupabase = await loadFromSupabase();
  if (fromSupabase) {
    return {
      content: new ApprendreContent(fromSupabase.core),
      scenesContent: new ScenesContent(fromSupabase.scenes),
      source: 'supabase',
      version: fromSupabase.version,
    };
  }
  const bundled = await loadBundled();
  return {
    content: new ApprendreContent(bundled.core),
    scenesContent: new ScenesContent(bundled.scenes),
    source: 'bundled',
  };
}

/**
 * Hook React Query — un futur écran Hub (§11) l'appelle une fois et passe
 * `content`/`scenesContent` aux écrans déjà portés (`ApReviewScreen`,
 * `ApScenesHubScreen`, `ApSessionScreen`, …). `staleTime` long : le contenu
 * pédagogique change rarement (import admin explicite, pas un flux temps réel).
 */
export function useApprendreContent() {
  return useQuery({
    queryKey: ['apprendre-content-bundle'],
    queryFn: loadApprendreContent,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
