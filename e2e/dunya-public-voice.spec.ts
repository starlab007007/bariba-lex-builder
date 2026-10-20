import { expect, test } from '@playwright/test';

function toneWav() {
  const b = Buffer.alloc(44 + 4 * 32000);
  b.write('RIFF', 0); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24);
  b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(b.length - 44, 40);
  for (let i = 0; i < (b.length - 44) / 2; i++) b.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 16000) * 8000), 44 + i * 2);
  return b;
}
for (const width of [375, 1280]) test(`visitor voice upload, replay cache and interruption (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 850 });
  await page.addInitScript(() => {
    localStorage.setItem('dunya-web-onboarded', 'true'); localStorage.setItem('dunya-web-mode', '"bba"');
    localStorage.setItem('dunya-web-handsFree', 'false');
  });
  let requests = 0;
  await page.route('**/functions/v1/dunya-voice-turn', async route => {
    requests++;
    const request = route.request();
    expect(request.headers().authorization).toBeUndefined();
    expect(request.postDataJSON().audio_base64).toBeTruthy();
    const events = [
      { type: 'transcript', text: 'A kua', lang: 'bba', engine: 'meta-asr-300m' },
      { type: 'answer', text: 'A kua.', lang: 'bba', subtitle: 'Bonjour.' },
      { type: 'audio', text: 'A kua.', engine: 'meta-mms-tts-bba', audio_base64: toneWav().toString('base64') },
      { type: 'done' },
    ].map(x => JSON.stringify({ ...x, request_id: 'browser-fixture', elapsed_ms: 100 })).join('\n') + '\n';
    await route.fulfill({ contentType: 'application/x-ndjson', headers: { 'Access-Control-Allow-Origin': '*' }, body: events });
  });
  await page.goto('/dunya');
  await page.getByRole('button', { name: 'Plus d’options' }).click();
  await expect(page.getByRole('menuitem', { name: 'Envoyer un vocal' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('input[type=file]').setInputFiles({ name: 'voice.wav', mimeType: 'audio/wav', buffer: toneWav() });
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reprendre', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Arrêter', exact: true }).click();
  await page.getByRole('button', { name: 'Réécouter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Arrêter', exact: true }).click();
  await page.getByRole('button', { name: 'Plus d’options' }).click();
  await page.getByRole('menuitem', { name: 'Réglages' }).click();
  await expect(page.getByText('Mains libres', { exact: true })).toBeVisible();
  await expect(page.getByText('pilote', { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
