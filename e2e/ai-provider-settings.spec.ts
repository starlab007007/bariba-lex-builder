import { expect, test } from '@playwright/test';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

for (const width of [375, 1280]) {
  test(`admin switches Gemini and Mistral and the choice survives reload at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let provider = 'mistral', version = 1;
    const actions: string[] = [];
    await page.route('**/functions/v1/ai-provider-settings', async route => {
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
      const body = route.request().postDataJSON(); actions.push(body.action);
      if (body.action === 'activate') { expect(body.expected_version).toBe(version); provider = body.provider; version++; }
      await route.fulfill({ headers: cors, json: { settings: { active_provider: provider, version, updated_at: '2026-10-15T00:00:00Z' }, providers: [
        { provider: 'mistral', configured: true, model: 'mistral-small-latest' }, { provider: 'gemini', configured: true, model: 'gemini-3.1-flash-lite' },
      ], ...(body.action === 'test' ? { test: { ok: true, model: 'tested', duration_ms: 500 } } : {}) } });
    });
    await page.goto('/e2e/fixtures/ai-provider.html');
    await expect(page.getByRole('region', { name: 'Mistral', exact: true }).getByText('Actif', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tester Gemini', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('répond correctement');
    await expect(page.getByRole('button', { name: 'Activer Gemini', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Activer Gemini', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Gemini Flash-Lite', exact: true }).getByText('Actif', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('region', { name: 'Gemini Flash-Lite', exact: true }).getByText('Actif', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/ai-provider-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Activer Mistral', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Mistral', exact: true }).getByText('Actif', { exact: true })).toBeVisible();
    expect(actions.filter(x => x === 'test')).toHaveLength(1); expect(actions.filter(x => x === 'activate')).toHaveLength(2);
  });
}
test('missing Gemini key disables activation and shows how to configure it', async ({ page }) => {
  await page.route('**/functions/v1/ai-provider-settings', route => route.fulfill({ headers: cors, json: { settings: { active_provider: 'mistral', version: 1 }, providers: [{ provider: 'mistral', configured: true, model: 'mistral-small-latest' }, { provider: 'gemini', configured: false, model: 'gemini-3.1-flash-lite' }] } }));
  await page.goto('/e2e/fixtures/ai-provider.html');
  await expect(page.getByRole('button', { name: 'Activer Gemini', exact: true })).toBeDisabled(); await expect(page.getByText(/Ajoutez GEMINI_API_KEY/)).toBeVisible();
});
test('failed activation displays the provider error and keeps Mistral active', async ({ page }) => {
  await page.route('**/functions/v1/ai-provider-settings', route => route.request().postDataJSON()?.action === 'activate'
    ? route.fulfill({ status: 429, headers: cors, json: { message: 'Gemini est temporairement limité. Le choix actif est conservé.' } })
    : route.fulfill({ headers: cors, json: { settings: { active_provider: 'mistral', version: 1 }, providers: [{ provider: 'mistral', configured: true, model: 'mistral-small-latest' }, { provider: 'gemini', configured: true, model: 'gemini-3.1-flash-lite' }] } }));
  await page.goto('/e2e/fixtures/ai-provider.html'); await page.getByRole('button', { name: 'Activer Gemini', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Le choix actif est conservé');
  await expect(page.getByRole('region', { name: 'Mistral', exact: true }).getByText('Actif', { exact: true })).toBeVisible();
});
