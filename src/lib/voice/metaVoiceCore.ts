/**
 * Pure logic for the optional Meta voice engines (MMS-TTS bba, Omnilingual ASR CTC 300M).
 * No imports: tested directly with Deno (tests/voice/metaVoiceCore.test.ts).
 */
export type MetaVoiceFlags = { tts: boolean; asr: boolean };
export type ListenSource = 'human' | 'meta-tts' | 'unavailable';

export const META_FLAG_KEYS = { tts: 'fitila-flag-meta-tts', asr: 'fitila-flag-meta-asr' } as const;

/** Flags are OFF unless explicitly enabled (build env or local override "1"/"0"). Local override wins. */
export function resolveFlags(env: { tts?: string; asr?: string }, local: { tts?: string | null; asr?: string | null }): MetaVoiceFlags {
  const on = (localV: string | null | undefined, envV: string | undefined) =>
    localV === '1' ? true : localV === '0' ? false : envV === 'true' || envV === '1';
  return { tts: on(local.tts, env.tts), asr: on(local.asr, env.asr) };
}

/** Published human audio always wins; Meta TTS only when the flag is on. */
export function chooseListenSource(hasHuman: boolean, flags: MetaVoiceFlags): ListenSource {
  if (hasHuman) return 'human';
  return flags.tts ? 'meta-tts' : 'unavailable';
}

export const MAX_TTS_CHARS = 400;
export const MAX_ASR_BYTES = 8_000_000;

export function validateTtsText(text: string): string | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return 'Texte vide.';
  if (t.length > MAX_TTS_CHARS) return `Texte trop long (max ${MAX_TTS_CHARS} caractères).`;
  return null;
}

/** Maps gateway/HTTP failures to readable French messages; never leaks raw server text. */
export function readableVoiceError(status: number | null, code?: string): string {
  if (code === 'not_configured') return 'Voix Meta non activée sur le serveur.';
  if (status === null) return 'Connexion impossible. Vérifiez internet.';
  if (status === 401) return 'Connectez-vous pour utiliser la voix.';
  if (status === 413) return 'Enregistrement trop long.';
  if (status === 429) return 'Trop de demandes. Réessayez dans un instant.';
  if (status === 400) return 'Demande invalide.';
  return 'Service vocal momentanément indisponible.';
}

/** DUNYA pilot: Meta voices (MMS-TTS is CC BY-NC) are offered only to signed-in pilot accounts (admin/moderator),
 *  ON by default for them, and each user can switch them off. Everyone else keeps the FITILA voices. */
export type DunyaVoiceChoice = 'meta' | 'fitila';
export function dunyaPilotEligible(signedIn: boolean, roles: string[]): boolean {
  return signedIn && roles.some((r) => r === 'admin' || r === 'moderator');
}
export function resolveDunyaVoice(eligible: boolean, choice: DunyaVoiceChoice | null, flags: MetaVoiceFlags): MetaVoiceFlags {
  if (!eligible) return flags; // dormant flags still work for local tests
  if (choice === 'fitila') return { tts: false, asr: false };
  return { tts: true, asr: true };
}
