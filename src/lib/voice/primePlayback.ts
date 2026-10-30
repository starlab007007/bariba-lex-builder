// Reuse the element activated by the user's tap after asynchronous TTS work.
// Mobile browsers may reject a NEW audio element created only after that work.
let element: HTMLAudioElement | null = null;
let activated = false;
export function primeBaribaPlayback(): HTMLAudioElement {
  if (activated && element) return element;
  const wav = new Uint8Array(124), view = new DataView(wav.buffer);
  const tag = (offset: number, value: string) => wav.set(new TextEncoder().encode(value), offset);
  tag(0, 'RIFF'); view.setUint32(4, 116, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true); view.setUint16(34, 8, true); tag(36, 'data');
  view.setUint32(40, 80, true); wav.fill(128, 44);
  const player = element ?? new Audio();
  player.src = 'data:audio/wav;base64,' + btoa(String.fromCharCode(...wav));
  activated = true;
  element = player;
  const initial = player.src;
  void player.play().then(() => { if (player.src === initial) player.pause(); }).catch(() => undefined);
  return player;
}
export function baribaPlaybackElement(): HTMLAudioElement {
  return element ??= new Audio();
}
