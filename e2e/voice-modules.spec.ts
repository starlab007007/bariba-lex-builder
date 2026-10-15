import { expect, test, type Page } from '@playwright/test';
import { replySpeechChunks } from '../src/lib/voice/speechTextCore';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS' };
function wav() {
  const buffer = Buffer.alloc(6444); buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(buffer.length - 44, 40);
  for (let n = 44; n < buffer.length; n += 2) buffer.writeInt16LE(Math.round(Math.sin(n / 15) * 8000), n);
  return buffer;
}
async function setup(page: Page, opts: { voiceFailure?: boolean; delayed?: boolean } = {}) {
  const requests: any[] = [], translations: any[] = [];
  await page.addInitScript(() => {
    const state = { media: [] as any[], finish() { const active = this.media.findLast((m: any) => !m.stopped); active?.onended?.(); if (active) active.stopped = true; } };
    (window as any).__voiceTest = state;
    (window as any).Audio = class {
      src: string; playbackRate = 1; stopped = false; onended: (() => void) | null = null; onerror: (() => void) | null = null;
      constructor(src: string) { this.src = src; state.media.push(this); }
      play() { this.stopped = false; return Promise.resolve(); }
      pause() { this.stopped = true; }
      removeAttribute() {} load() {}
    };
  });
  await page.route('**/data/translation-memory.json', route => route.fulfill({ json: { v: 1, pairs: [], fr2ba: {}, ba2fr: {} } }));
  await page.route('**/data/dictionary*', route => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/**', route => route.fulfill({ headers: cors, json: route.request().method() === 'POST' ? { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...route.request().postDataJSON() } : [] }));
  await page.route('**/functions/v1/byt5-bariba-translate', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = route.request().postDataJSON(); translations.push(body);
    return route.fulfill({ headers: cors, json: { translation: body.sourceLang === 'french' ? `Baatɔnum ${body.text}.` : `Français ${body.text}.`, method: 'test-byt5' } });
  });
  await page.route('**/functions/v1/dunya-voice-turn', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const body = route.request().postDataJSON(); requests.push(body);
    if (opts.delayed) await new Promise(resolve => setTimeout(resolve, 600));
    if (opts.voiceFailure) { await route.fulfill({ status: 429, headers: cors, json: { code: 'rate_limited' } }); return; }
    const events = body.transcribe_only ? [{ type: 'stage', stage: 'transcribing' }, { type: 'transcript', text: 'Saria 14se ya nɛɛ mba?', engine: 'meta-asr-300m', lang: body.lang }, { type: 'done' }]
      : [{ type: 'audio', audio_base64: wav().toString('base64'), engine: 'meta-mms-tts-bba', text: body.text }, { type: 'done' }];
    await route.fulfill({ headers: { ...cors, 'Content-Type': 'application/x-ndjson' }, body: events.map(event => JSON.stringify({ request_id: 'test', ...event })).join('\n') + '\n' });
  });
  return { requests, translations };
}
for (const width of [375, 768, 1280]) {
  test(`IA: every local answer has working MMS controls and no overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); const { requests } = await setup(page);
    await page.goto('/e2e/fixtures/voice-modules.html?module=ia');
    await page.getByRole('button', { name: 'Saria 14se ya nɛɛ mba?', exact: true }).click();
    const player = page.getByTestId('reply-audio-player').first();
    await player.getByRole('button', { name: 'Écouter la réponse', exact: true }).click();
    await expect(player.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    expect(requests.at(-1).speech_only).toBe(true); expect(requests.at(-1).lang).toBe('bba');
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(player.getByRole('button', { name: 'Reprendre', exact: true })).toBeVisible();
    await player.getByRole('button', { name: 'Reprendre', exact: true }).click();
    await player.getByRole('combobox', { name: 'Vitesse de lecture' }).selectOption('1.2');
    expect(await page.evaluate(() => (window as any).__voiceTest.media.at(-1).playbackRate)).toBe(1.2);
    await page.screenshot({ path: `test-results/ia-voice-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await player.getByRole('button', { name: 'Arrêter la lecture' }).click();
    await expect(player.getByRole('button', { name: 'Écouter la réponse', exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByTestId('reply-audio-player').first()).toBeVisible();
  });
  test(`Translator: replay the selected old translation, not the last result, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); const { requests } = await setup(page);
    await page.goto('/e2e/fixtures/voice-modules.html?module=translator');
    await page.getByRole('checkbox').first().uncheck();
    const input = page.getByPlaceholder('Écrivez en français…');
    await input.fill('Première demande inconnue'); await page.getByRole('button', { name: 'Traduire le texte', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Écouter la traduction', exact: true })).toHaveCount(1);
    await input.fill('Seconde demande inconnue'); await page.getByRole('button', { name: 'Traduire le texte', exact: true }).click();
    const replies = page.getByRole('button', { name: 'Écouter la traduction', exact: true }); await expect(replies).toHaveCount(2);
    await replies.first().click(); await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    expect(requests.at(-1).text).toContain('Première demande'); expect(requests.at(-1).text).not.toContain('Seconde demande');
    await page.screenshot({ path: `test-results/translator-voice-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test('IA: uploaded voice is transcribed with Omnilingual, editable and never sent automatically', async ({ page }) => {
  const { requests } = await setup(page); await page.goto('/e2e/fixtures/voice-modules.html?module=ia');
  await page.getByLabel('Fichier vocal').setInputFiles({ name: 'question.wav', mimeType: 'audio/wav', buffer: wav() });
  const input = page.locator('textarea').first(); await expect(input).toHaveValue('Saria 14se ya nɛɛ mba?');
  await expect(page.getByTestId('reply-audio-player')).toHaveCount(0);
  expect(requests[0].transcribe_only).toBe(true); expect(requests[0].audio_base64).toBeTruthy();
  await expect(page.getByRole('status')).toContainText('Omnilingual');
  await input.fill('Saria 15se ya nɛɛ mba?'); await page.getByRole('button', { name: 'Envoyer la question', exact: true }).click();
  await expect(page.getByTestId('reply-audio-player')).toHaveCount(1);
});
test('Translator: voice and written text can be combined before submitting', async ({ page }) => {
  const { requests, translations } = await setup(page); await page.goto('/e2e/fixtures/voice-modules.html?module=translator');
  await page.getByRole('button', { name: 'Voix', exact: true }).click();
  const input = page.getByLabel('Texte à traduire'); await input.fill('Introduction');
  await page.getByLabel('Fichier vocal').setInputFiles({ name: 'question.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(input).toHaveValue('Introduction\nSaria 14se ya nɛɛ mba?'); expect(translations).toHaveLength(0);
  expect(requests[0].lang).toBe('fr');
  await page.getByRole('button', { name: 'Traduire le message', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Écouter la traduction', exact: true })).toHaveCount(1);
});
test('Failed voice transcription keeps the recording available for retry and preserves written text', async ({ page }) => {
  await setup(page, { voiceFailure: true }); await page.goto('/e2e/fixtures/voice-modules.html?module=ia');
  await page.locator('textarea').first().fill('Mon texte');
  await page.getByLabel('Fichier vocal').setInputFiles({ name: 'question.wav', mimeType: 'audio/wav', buffer: wav() });
  await expect(page.getByRole('alert')).toContainText('très sollicité');
  await expect(page.getByRole('button', { name: 'Réessayer la transcription' })).toBeVisible();
  await expect(page.getByLabel('Votre vocal')).toBeVisible(); await expect(page.locator('textarea').first()).toHaveValue('Mon texte');
});
test('Cancelling a transcription ignores late results', async ({ page }) => {
  await setup(page, { delayed: true }); await page.goto('/e2e/fixtures/voice-modules.html?module=ia');
  await page.getByLabel('Fichier vocal').setInputFiles({ name: 'question.wav', mimeType: 'audio/wav', buffer: wav() });
  await page.getByRole('button', { name: 'Annuler le vocal' }).click();
  await page.waitForTimeout(800); await expect(page.locator('textarea').first()).toHaveValue('');
});
test('Long answers continue through every speech chunk and replay uses the local audio cache', async ({ page }) => {
  const { requests } = await setup(page); await page.goto('/e2e/fixtures/voice-modules.html?module=reader');
  const text = Array.from({ length: 100 }, (_, n) => `Bàátɔ̀nú saria ${n + 1}se.`).join(' ');
  await page.getByRole('button', { name: 'Écouter la réponse', exact: true }).click();
  for (let part = 0; part < replySpeechChunks(text).length; part++) { await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible(); await page.evaluate(() => (window as any).__voiceTest.finish()); }
  await expect(page.getByRole('button', { name: 'Réécouter', exact: true })).toBeVisible();
  expect(requests.map(r => r.text).join(' ')).toBe(text);
  const count = requests.length; await page.getByRole('button', { name: 'Réécouter', exact: true }).click(); await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible(); expect(requests).toHaveLength(count);
});
test('Live microphone captures a voice and releases the microphone after transcription', async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => { const stream = await original(constraints); (window as any).__micTracks = stream.getTracks(); return stream; };
  });
  await page.goto('/e2e/fixtures/voice-modules.html?module=ia');
  await page.getByRole('button', { name: 'Dicter', exact: true }).click();
  await expect(page.getByRole('button', { name: /Terminer/ })).toBeVisible();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: /Terminer/ }).click();
  await expect(page.locator('textarea').first()).toHaveValue('Saria 14se ya nɛɛ mba?');
  expect(await page.evaluate(() => (window as any).__micTracks.every((track: MediaStreamTrack) => track.readyState === 'ended'))).toBe(true);
});
test('Microphone permission failure keeps written input available', async ({ page }) => {
  await setup(page); await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Denied', 'NotAllowedError')); });
  await page.goto('/e2e/fixtures/voice-modules.html?module=ia');
  await page.getByRole('button', { name: 'Dicter', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Autorisez le microphone');
  await page.locator('textarea').first().fill('Saria 14se');
  await expect(page.getByRole('button', { name: 'Envoyer la question', exact: true })).toBeEnabled();
});
test('French source text uses the labelled device voice and does not call the Baatonum synthesizer', async ({ page }) => {
  const { requests } = await setup(page);
  await page.addInitScript(() => {
    speechSynthesis.speak = utterance => { (window as any).__frenchUtterance = utterance; queueMicrotask(() => utterance.onstart?.(new SpeechSynthesisEvent('start', { utterance }))); };
    speechSynthesis.pause = () => {}; speechSynthesis.resume = () => {}; speechSynthesis.cancel = () => {};
  });
  await page.goto('/e2e/fixtures/voice-modules.html?module=translator');
  await page.getByRole('checkbox').first().uncheck();
  await page.getByPlaceholder('Écrivez en français…').fill('Une phrase française originale');
  await page.getByRole('button', { name: 'Traduire le texte', exact: true }).click();
  await page.getByRole('button', { name: 'Écouter le texte source', exact: true }).click();
  await expect(page.getByText('Voix française de l’appareil', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__frenchUtterance.text)).toBe('Une phrase française originale');
  expect(requests).toHaveLength(0);
});
test('A speech quota error leaves the answer readable and offers a retry', async ({ page }) => {
  await setup(page, { voiceFailure: true }); await page.goto('/e2e/fixtures/voice-modules.html?module=ia');
  await page.getByRole('button', { name: 'Saria 14se ya nɛɛ mba?', exact: true }).click();
  await page.getByRole('button', { name: 'Écouter la réponse', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('très sollicité');
  await expect(page.getByRole('button', { name: 'Réessayer', exact: true })).toBeVisible();
  await expect(page.getByTestId('reply-audio-player')).toHaveCount(1);
});
