import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: ['dunya-public-voice.spec.ts', 'dunya-language-and-offline.spec.ts'], timeout: 45_000,
  use: { baseURL: 'http://127.0.0.1:8080', launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] }, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 8080', url: 'http://127.0.0.1:8080/dunya', reuseExistingServer: !process.env.CI },
});
