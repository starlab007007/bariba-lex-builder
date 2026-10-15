import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./e2e',testMatch:'apprendre-audio.spec.ts',timeout:60_000,workers:2,use:{baseURL:'http://127.0.0.1:8080',trace:'retain-on-failure'},webServer:{command:'npx vite --config vite.voice.config.ts',url:'http://127.0.0.1:8080/e2e/fixtures/apprendre-audio.html',reuseExistingServer:!process.env.CI}});
