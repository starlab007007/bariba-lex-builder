import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition, openBrowser } from '@remotion/renderer';
import path from 'path';
const [compId, out, frameStr] = process.argv.slice(2);
const frame = parseInt(frameStr || '100', 10);
const bundled = await bundle({ entryPoint: path.resolve('/dev-server/remotion/src/index.ts'), webpackOverride: c => c });
const browser = await openBrowser('chrome', {
  browserExecutable: '/bin/chromium',
  chromiumOptions: { args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'] },
  chromeMode: 'chrome-for-testing',
});
const composition = await selectComposition({ serveUrl: bundled, id: compId, puppeteerInstance: browser });
await renderStill({ composition, serveUrl: bundled, output: out, frame, puppeteerInstance: browser });
await browser.close({ silent: false });
console.log('still', out);
