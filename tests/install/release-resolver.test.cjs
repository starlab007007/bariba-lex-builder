const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const compiled = ts.transpileModule(fs.readFileSync('src/lib/androidRelease.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded = new Module('android-release'); loaded._compile(compiled, 'android-release.cjs');
const {latestAndroidRelease,saveAndroidApk} = loaded.exports;
test('newest signed binary wins; HTML fallback and unsafe URLs are rejected',async()=>{
 let current = 37;
 global.fetch = async (url,init) => {
  if(url.includes('releases.json')) return {ok:true,json:async()=>({releases:[
   {version:'invalid',signing:'production',published_at:'2030',arm64:'/dunya-packs/android/../secrets.apk'},
   {version:'broken',signing:'production',published_at:'2029',arm64:'/dunya-packs/android/broken.apk'},
   {version:'unsigned',signing:'ci',published_at:'2028',arm64:'/dunya-packs/android/unsigned.apk'},
   {version:String(current),signing:'production',published_at:'2026',arm64:`/dunya-packs/android/v${current}/FITILA.apk`}
  ]})};
  assert.equal(init.method,'HEAD');
  return {ok:true,headers:new Headers({'content-type':url.includes('broken')?'text/html':'application/octet-stream','content-length':'2097152'})};
 };
 assert.equal((await latestAndroidRelease()).version,'37');
 current=38;assert.equal((await latestAndroidRelease()).version,'38');
});
test('download uses a native download anchor rather than SPA navigation',()=>{
 let clicked=false,removed=false,anchor;
 global.document={createElement:()=>anchor={click(){clicked=true},remove(){removed=true}},body:{appendChild(){}}};
 saveAndroidApk('/dunya-packs/android/v38/FITILA.apk');
 assert.equal(anchor.download,'FITILA.apk');assert(clicked&&removed);
 assert.throws(()=>saveAndroidApk('https://untrusted.example/FITILA.apk'));
});
test('APK and pack navigations bypass the generated SPA fallback',()=>{
 const source=fs.readFileSync('vite.config.ts','utf8');
 assert(source.includes('navigateFallbackDenylist: [/^\\/~oauth/, /^\\/dunya-packs\\//, /\\.apk$/i]'));
 const sw=fs.readFileSync('dist/sw.js','utf8');
 assert(sw.includes('NetworkOnly'));assert(sw.includes('apk$/i'));
});
