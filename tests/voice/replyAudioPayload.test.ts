import { inlineBaribaAudio } from '../../src/lib/voice/replyAudioPayload.ts';
Deno.test('TEM playback uses returned WAV and rejects HTTP-200 error payloads', () => {
  const bytes = new Uint8Array(46);
  bytes.set(new TextEncoder().encode('RIFF'), 0);
  bytes.set(new TextEncoder().encode('WAVE'), 8);
  const encoded = btoa(String.fromCharCode(...bytes));
  const audio = inlineBaribaAudio({success: true, audio_base64: encoded, audio_url: 'https://example.invalid/second-inference'});
  if (!audio || audio.size !== 46 || audio.type !== 'audio/wav') throw new Error('Inline WAV not selected');
  for (const payload of [{success:false}, {error:'sleeping'}, {audio_base64:btoa('<html>not audio</html>')}]) {
    let rejected = false;
    try { inlineBaribaAudio(payload); } catch { rejected = true; }
    if (!rejected) throw new Error('Invalid speech accepted');
  }
  if (inlineBaribaAudio({audio_url:'https://example.invalid/legacy'}) !== null) throw new Error('Legacy URL must remain compatible');
});
