import { test, expect } from '../playwright-fixture';

test('redirects visitors to FITILA and renders its shell', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/fitila/);
  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.locator('body')).not.toContainText('Failed to fetch dynamically imported module');
  expect(errors).toEqual([]);
});

test('protects the teacher dashboard for anonymous visitors', async ({ page }) => {
  await page.goto('/fitila/teacher');
  await expect(page).toHaveURL(/\/fitila\/auth\?redirect=/);
});

