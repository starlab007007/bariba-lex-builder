// Logique hybride partagée de Tem IA (assistant du Code Foncier Baatɔnum),
// utilisée à la fois par le mode texte et le mode vocal de FitilaTemIA.
//
// EN LIGNE : un vrai raisonnement conversationnel (accueil, compréhension,
// citation des articles, relance), strictement borné au contenu du Code
// foncier retrouvé par le serveur — jamais de connaissance générale
// (supabase/functions/fitila-tem-ia-chat).
//
// HORS LIGNE (dès que le réseau ou le serveur IA sont indisponibles) : la
// recherche locale embarquée inchangée (`answerFromCorpus`, foncierRAG.ts),
// simplement mieux présentée en mode texte — jamais de reformulation ni de
// traduction du contenu légal lui-même, qui reste exactement celui du corpus.

import { supabase } from '@/integrations/supabase/client';
import type { FoncierSource } from '@/components/fitila/FoncierSourcesModal';

export interface TemIaTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface TemIaOnlineAnswer {
  /** Texte en Baatɔnum si `bariba` est vrai ; sinon en français (repli
   * quand la traduction côté serveur est indisponible). */
  text: string;
  bariba: boolean;
  sources: FoncierSource[];
}

/**
 * Accueil hors ligne — réutilise la phrase déjà établie de cet écran
 * (jamais de texte Baatɔnum inventé) pour rester lisible ET lisible à
 * voix haute (une seule langue) en mode vocal.
 */
export const TEM_IA_OFFLINE_GREETING = 'Yaa sɔ̃ɔ tem bausu gari Baribarum.';

/**
 * Vrai si `message` n'est qu'une salutation ou une formule de politesse,
 * sans question de fond — jamais sur un message qui contient aussi une
 * vraie question, pour ne jamais escamoter une préoccupation réelle.
 */
export function isTemIaGreetingOnly(message: string): boolean {
  const normalized = message.trim().toLowerCase().replace(/[!?.,\s]+$/u, '').trim();
  if (!normalized) return false;
  return /^(bonjour|bonsoir|salut|coucou|hello|slt|cc|bonne\s+(soir[ée]e?|journ[ée]e?|nuit)|merci(\s+beaucoup)?|au\s+revoir|bye)$/.test(normalized);
}

/**
 * Tente le raisonnement en ligne (LLM strictement borné aux articles du
 * Code foncier retrouvés par le même moteur de recherche que le mode hors
 * ligne). Retourne `null` sur le moindre souci (pas de réseau, serveur
 * indisponible, IA non configurée, délai dépassé) — l'appelant doit alors
 * retomber sur `answerFromCorpus` (moteur local inchangé).
 */
export async function tryTemIaOnline(
  question: string,
  history: TemIaTurn[] = [],
  timeoutMs = 15000,
): Promise<TemIaOnlineAnswer | null> {
  try {
    const invoke = supabase.functions.invoke('fitila-tem-ia-chat', {
      body: {
        message: question.trim(),
        ...(history.length ? { history } : {}),
      },
    });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Tem IA en ligne : délai dépassé.')), timeoutMs);
    });
    const { data, error } = await Promise.race([invoke, timeout]);
    if (error || !data || data.error) return null;

    const fallback = data.fallback === true;
    const ba = typeof data.response_ba === 'string' ? data.response_ba.trim() : '';
    const fr = typeof data.response_fr === 'string' ? data.response_fr.trim() : '';
    const useBariba = ba.length > 0 && !fallback;
    const text = useBariba ? ba : fr;
    if (!text) return null;

    const sources: FoncierSource[] = Array.isArray(data.sources) ? data.sources : [];
    return { text, bariba: useBariba, sources };
  } catch {
    return null;
  }
}

/**
 * Présentation « texte » d'une réponse hors ligne (recherche locale
 * inchangée) : cite le ou les articles, encadre le contenu Baatɔnum brut
 * d'une phrase française et relance par une question de suivi — jamais de
 * reformulation ou de traduction du contenu légal lui-même.
 *
 * À utiliser UNIQUEMENT pour l'affichage texte : le mode vocal doit
 * continuer à lire le texte brut (une seule langue), pas cette version
 * encadrée en français — sinon la synthèse vocale Baatɔnum mélangerait
 * les langues.
 */
export function formatOfflineAnswerForText(
  answer: string,
  sources: FoncierSource[],
  isFallback: boolean,
): string {
  const body = answer.replace(/\.\s+/g, '.\n\n').trim();
  if (isFallback || sources.length === 0) {
    return `${body}\n\nPouvez-vous reformuler ou préciser votre préoccupation ?`;
  }
  const lead = sources.length === 1
    ? `Selon l'article ${sources[0].number} du Code foncier :`
    : `D'après les articles ${sources.map(s => s.number).join(', ')} du Code foncier :`;
  return `${lead}\n\n${body}\n\nAvez-vous une autre préoccupation concernant votre terrain ou vos papiers fonciers ?`;
}
