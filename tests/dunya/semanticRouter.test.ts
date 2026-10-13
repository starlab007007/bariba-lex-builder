import { routeDunyaInput, frenchGreetingAnswer, normalizeLookup } from '../../src/lib/dunya/semanticRouter.ts';
function assert(condition: boolean, msg: string) { if (!condition) throw new Error(msg); }
Deno.test('French text greeting uses fast path', () => {
 const r = routeDunyaInput('Bonjour !', 'fr', 'text');
 assert(r.route === 'fast' && frenchGreetingAnswer(r) !== null, 'French fast greeting');
});
Deno.test('Voice and text share the same intent routing', () => {
 const a = routeDunyaInput('Que signifie ce mot ?', 'fr', 'text');
 const b = routeDunyaInput('Que signifie ce mot ?', 'fr', 'voice');
 assert(a.route === b.route && a.route === 'knowledge', 'shared semantic route');
});
Deno.test('Bariba original orthography is preserved, never silently translated', () => {
 const src = 'Dòmma a nà ? ɔ̃ ɛ́';
 const r = routeDunyaInput(src, 'bba', 'text');
 assert(r.originalOrthography === src && r.original === src, 'original Bariba');
 assert(r.route === 'reasoning', 'unknown Bariba sentence must not be guessed as greeting');
});
Deno.test('Sensitive actions require confirmation', () => {
 const r = routeDunyaInput('Supprime mes notes', 'fr', 'text');
 assert(r.route === 'action' && r.requiresConfirmation, 'action gating');
});
Deno.test('Normalization keeps contrastive Baatonum tones', () => {
 assert(normalizeLookup('sɔ̃ɔ') !== normalizeLookup('sɔɔ'), 'nasality preserved');
});

Deno.test('Bariba messages never receive an invented French direct answer', () => {
 const r = routeDunyaInput('A kua', 'bba', 'voice');
 assert(r.language === 'bba' && r.route === 'reasoning', 'Bariba remains an independent language input');
 assert(frenchGreetingAnswer(r) === null, 'no French fallback greeting');
});
Deno.test('French external and destructive commands require explicit confirmation', () => {
 for (const command of ['Envoie le message', 'Supprime mes notes', 'Publie ma photo']) {
  const r = routeDunyaInput(command, 'fr', 'text');
  assert(r.route === 'action' && r.requiresConfirmation, command);
 }
});
