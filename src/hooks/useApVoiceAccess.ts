// Portage fidèle de `ApVoiceAccess` (fitila_flutter/lib/apprendre/apprendre_voice_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927) — rôles voix de l'utilisateur
// connecté, lus dans la table Supabase `user_roles`. Gate uniquement la
// visibilité des chips « Studio Voix » / « Validation voix » du Hub
// (apprendre_v24_spec.md §10.1) ; ne bloque rien d'autre côté web.
//
// Même schéma que `useEditorRole.ts` (mêmes table/colonnes, même usage de
// `useAuth()`), volontairement dupliqué plutôt que factorisé pour rester
// fidèle à l'indépendance de `ApVoiceAccess` côté Dart (pas de dépendance
// croisée avec le rôle éditeur).

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface ApVoiceAccess {
  /** Droit d'enregistrer des voix de référence (Studio Voix). */
  speaker: boolean;
  /** Droit de valider les enregistrements soumis (Validation voix). */
  reviewer: boolean;
  loading: boolean;
}

/**
 * `speaker = admin || roles.includes('voice_speaker')`,
 * `reviewer = admin || roles.includes('voice_reviewer')` — spec §10.1.
 * Hors connexion, sans utilisateur, ou en cas d'erreur réseau/requête :
 * silencieusement `{ speaker: false, reviewer: false }` (jamais d'exception),
 * comme `ApVoiceAccess.load()` qui retombe sur `ApVoiceAccess.none`.
 */
export function useApVoiceAccess(): ApVoiceAccess {
  const { user, isAdmin } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    // Les admins ont implicitement tous les droits voix — pas besoin de requête.
    if (isAdmin) {
      setRoles([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const loadRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error checking voice roles:', error);
          return;
        }
        if (!cancelled) {
          setRoles((data ?? []).map((row) => row.role));
        }
      } catch (e) {
        console.error('Error checking voice roles:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  return {
    speaker: isAdmin || roles.includes('voice_speaker'),
    reviewer: isAdmin || roles.includes('voice_reviewer'),
    loading,
  };
}
