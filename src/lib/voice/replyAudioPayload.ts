/** Decode the audio already synthesized by bariba-tts, never HTML/error JSON. */
export function inlineBaribaAudio(data: Record<string, unknown>): Blob | null {
  if (data.success === false || data.error) throw new Error('Voix Baatɔnum momentanément indisponible.');
  const encoded = data.audio_base64 ?? data.audioBase64;
  if (typeof encoded !== 'string' || !encoded.trim()) return null;
  const binary = atob(encoded.replace(/\s+/g, ''));
  if (binary.length < 44 || binary.slice(0, 4) !== 'RIFF' || binary.slice(8, 12) !== 'WAVE') {
    throw new Error('Le service vocal a renvoyé un audio invalide.');
  }
  return new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: 'audio/wav' });
}
