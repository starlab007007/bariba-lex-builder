function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function fnv1a64(text: string) {
  const bytes = new TextEncoder().encode(normalizeText(text));
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of bytes) {
    hash = ((hash ^ BigInt(byte)) * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function apprendreAudioKey(text: string) {
  return `ap:${fnv1a64(text)}`;
}

