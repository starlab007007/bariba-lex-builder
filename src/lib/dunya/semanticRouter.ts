/**
 * DUNYA V3 — lightweight semantic-first router shared by text and voice.
 * Pure functions: no network, model download or browser dependency.
 */
export type DunyaLanguage = 'fr' | 'bba';
export type DunyaInputMode = 'text' | 'voice';
export type DunyaRoute = 'fast' | 'knowledge' | 'reasoning' | 'action';
export type DunyaIntent = 'greeting' | 'definition' | 'knowledge' | 'conversation' | 'action';

export interface SemanticRequest {
  original: string;
  language: DunyaLanguage;
  inputMode: DunyaInputMode;
  intent: DunyaIntent;
  route: DunyaRoute;
  normalizedLookup: string;
  /** Original orthography is always preserved for TTS and display. */
  originalOrthography: string;
  needsSources: boolean;
  requiresConfirmation: boolean;
}

export function normalizeLookup(input: string): string {
  return input.normalize('NFC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

export function routeDunyaInput(original: string, language: DunyaLanguage, inputMode: DunyaInputMode = 'text'): SemanticRequest {
  const normalizedLookup = normalizeLookup(original);
  const frGreeting = /^(bonjour|bonsoir|salut|coucou|merci|au revoir)[\s.!?]*$/u.test(normalizedLookup);
  // Only attested, language-specific greetings may bypass the LLM.
  const greeting = language === 'fr' && frGreeting;
  const definition = language === 'fr' && /\b(que signifie|définis|definition de|définition de)\b/u.test(normalizedLookup);
  const knowledge = language === 'fr' && /\b(selon|source|document|dictionnaire|apprendre|cours|qui est|qu'est-ce que)\b/u.test(normalizedLookup);
  const action = language === 'fr' && /\b(supprime|efface|envoie|publie|modifie|achète|paie)\b/u.test(normalizedLookup);
  const intent: DunyaIntent = greeting ? 'greeting' : action ? 'action' : definition ? 'definition' : knowledge ? 'knowledge' : 'conversation';
  const route: DunyaRoute = greeting ? 'fast' : action ? 'action' : (definition || knowledge) ? 'knowledge' : 'reasoning';
  return {
    original, originalOrthography: original, normalizedLookup, language, inputMode,
    intent, route, needsSources: route === 'knowledge',
    requiresConfirmation: route === 'action',
  };
}

export function frenchGreetingAnswer(request: SemanticRequest): string | null {
  if (request.route !== 'fast' || request.language !== 'fr') return null;
  if (request.normalizedLookup.startsWith('merci')) return 'Je vous en prie.';
  if (request.normalizedLookup.startsWith('au revoir')) return 'Au revoir !';
  return 'Bonjour ! Comment puis-je vous aider ?';
}
