import { expect, test, type Page } from '@playwright/test';

/**
 * Language selection and offline behaviour of DUNYA on the web.
 *
 * The server is mocked: this proves what the SCREEN sends and shows, i.e. that
 * the selected language is the language of the request, that nothing is sent
 * without a network, and that no French leaks into a Baatɔnum answer.
 */
type Sent = { lang: string; reply_lang: string; text?: string };

async function openDunya(page: Page, mode: 'fr' | 'bba' | 'both') {
  await page.addInitScript((m) => {
    localStorage.setItem('dunya-web-onboarded', 'true');
    localStorage.setItem('dunya-web-mode', JSON.stringify(m));
    localStorage.setItem('dunya-web-handsFree', 'false');
  }, mode);
  const sent: Sent[] = [];
  await page.route('**/functions/v1/dunya-voice-turn', async (route) => {
    const body = route.request().postDataJSON() as Sent;
    sent.push(body);
    const reply = body.reply_lang === 'bba' ? { text: 'A kua.', subtitle: 'Merci.' } : { text: 'Bonjour !' };
    const events = [
      { type: 'transcript', text: body.text ?? '', lang: body.lang, engine: 'text' },
      { type: 'answer', ...reply, lang: body.reply_lang },
      { type: 'done' },
    ].map((e) => JSON.stringify({ ...e, request_id: 'fixture', elapsed_ms: 10 })).join('\n') + '\n';
    await route.fulfill({ contentType: 'application/x-ndjson', headers: { 'Access-Control-Allow-Origin': '*' }, body: events });
  });
  await page.goto('/dunya');
  await page.getByRole('button', { name: 'Écrire', exact: true }).click();
  return sent;
}

async function say(page: Page, text: string) {
  const box = page.locator('textarea').last();
  await box.fill(text);
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
}

test('Français: the request is French in, French out', async ({ page }) => {
  const sent = await openDunya(page, 'fr');
  await say(page, 'Bonjour DUNYA');
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toMatchObject({ lang: 'fr', reply_lang: 'fr' });
});

test('Baatɔnum: the request is Baatɔnum in, Baatɔnum out', async ({ page }) => {
  const sent = await openDunya(page, 'bba');
  await say(page, 'A kua');
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toMatchObject({ lang: 'bba', reply_lang: 'bba' });
});

test('Les deux: the reply follows the language that was spoken, no mixing', async ({ page }) => {
  const sent = await openDunya(page, 'both');
  await say(page, 'Bonjour, comment vas-tu ?');
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].lang).toBe(sent[0].reply_lang);
});

test('switching language changes the language of the next request, with no reload', async ({ page }) => {
  const sent = await openDunya(page, 'fr');
  await say(page, 'Bonjour');
  await expect.poll(() => sent.length).toBe(1);
  await page.getByRole('radio', { name: 'Baatɔnum' }).click();
  await say(page, 'A kua');
  await expect.poll(() => sent.length).toBe(2);
  expect(sent[0]).toMatchObject({ lang: 'fr', reply_lang: 'fr' });
  expect(sent[1]).toMatchObject({ lang: 'bba', reply_lang: 'bba' });
});

for (const mode of ['fr', 'bba', 'both'] as const) {
  test(`offline in mode ${mode}: nothing is sent, the answer is local and in French`, async ({ page, context }) => {
    const sent = await openDunya(page, mode);
    await context.setOffline(true);
    await say(page, 'Que signifie nim ?');
    await expect(page.getByRole('status').filter({ hasText: 'Hors ligne' })).toBeVisible();
    expect(sent).toHaveLength(0);
  });
}

test('offline in mode both: an attested French sentence is answered in Baatɔnum from the memory', async ({ page, context }) => {
  const sent = await openDunya(page, 'both');
  await page.waitForTimeout(2500); // let the precached memory load before going offline
  await context.setOffline(true);
  await say(page, 'Quand es-tu venu?');
  await expect(page.getByText('Domma a na?').first()).toBeVisible();
  expect(sent).toHaveLength(0);
});

test('offline in mode bba: an unknown sentence gets no French excerpt', async ({ page, context }) => {
  await openDunya(page, 'bba');
  await context.setOffline(true);
  await say(page, 'Que signifie nim ?');
  await expect(page.getByRole('status').filter({ hasText: 'mémoire attestée' })).toBeVisible();
  await expect(page.getByText('ressources locales FITILA')).toHaveCount(0);
});
