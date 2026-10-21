import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('Apprendre est la page par défaut', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Fil · bientôt')).toHaveCount(0);
});

test('Fil affiche « bientôt » sans contenu', async ({ page }) => {
  await page.goto('/social');
  await expect(page.getByRole('heading', { name: 'Fil · bientôt' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aller à Apprendre' })).toBeVisible();
});
