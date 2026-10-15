import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: 'voice-modules.spec.ts', timeout: 40_000, workers: 2,
  use: { baseURL: 'http://127.0.0.1:8080', trace: 'retain-on-failure', launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } },
  webServer: { command: 'npx vite --config vite.voice.config.ts', url: 'http://127.0.0.1:8080/e2e/fixtures/voice-modules.html', reuseExistingServer: !process.env.CI },
});
