import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {apprendreAudioKey} from '../src/lib/apprendre/audioKey';
const core=JSON.parse(readFileSync(new URL('../src/data/apprendre_v2.json',import.meta.url),'utf8'));
const scenes=JSON.parse(readFileSync(new URL('../src/data/scenes_v2.json',import.meta.url),'utf8'));
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};
const first='Agɛdɛ ye ya do.',second='Nim mu boo yiba.';
function wav(){const b=Buffer.alloc(6444);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
async function setup(page:Page,opts:{human?:boolean;brokenHuman?:boolean;delayed?:boolean;quota?:boolean;manifestDelay?:boolean}={}){
 const requests:any[]=[];let quota=!!opts.quota;
 await page.addInitScript(()=>{
  localStorage.setItem('fitila_meta_tts','0');
  const state={media:[] as any[],finish(){const active=this.media.findLast((audio:any)=>!audio.stopped);if(active){active.stopped=true;active.onended?.();}}};(window as any).__apAudio=state;
  (window as any).Audio=class{src:string;stopped=false;onended:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(src:string){this.src=src;state.media.push(this);}play(){this.stopped=false;return Promise.resolve();}pause(){this.stopped=true;}removeAttribute(){}load(){}};
 });
 await page.route('**/rest/v1/**',route=>route.fulfill({headers:cors,json:[]}));
 await page.route('**/rest/v1/rpc/apprendre_audio_manifest**',async route=>{if(opts.manifestDelay)await new Promise(resolve=>setTimeout(resolve,650));return route.fulfill({headers:cors,json:opts.human?[{audio_key:apprendreAudioKey(first),voice:'femme',variant:'standard',storage_path:'reference.wav',duration_ms:2000,speaker_name:'Locutrice publiée'}]:[]});});
 await page.route('**/storage/v1/object/sign/**',route=>route.request().method()==='POST'?route.fulfill({headers:cors,json:{signedURL:'/object/sign/apprendre-audio/reference.wav?token=test'}}):route.fulfill({headers:{...cors,'Content-Type':'audio/wav'},status:opts.brokenHuman?404:200,body:wav()}));
 await page.route('**/functions/v1/dunya-voice-turn',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const body=route.request().postDataJSON();requests.push(body);
  if(opts.delayed)await new Promise(resolve=>setTimeout(resolve,650));
  if(quota)return route.fulfill({status:429,headers:cors,json:{code:'rate_limited'}});
  return route.fulfill({headers:{...cors,'Content-Type':'application/x-ndjson'},body:JSON.stringify({type:'audio',text:body.text,audio_base64:wav().toString('base64'),engine:'meta-mms-tts-bba'})+'\n'+JSON.stringify({type:'done'})+'\n'});
 });
 return{requests,allow:()=>{quota=false;}};
}
const goto=(page:Page,view='audio',id='')=>page.goto('/e2e/fixtures/apprendre-audio.html?view='+view+(id?'&id='+encodeURIComponent(id):''));
const texts=(page:Page)=>page.locator('[data-ap-audio-text]').evaluateAll(elements=>elements.map(element=>element.getAttribute('data-ap-audio-text')));
test('The actual learning home exposes greeting and proverb pronunciations to a visitor',async({page})=>{
 await page.setViewportSize({width:375,height:900});const {requests}=await setup(page);await goto(page,'hub');await expect(page.getByRole('heading',{name:'Apprendre',exact:true})).toBeVisible();
 await expect(page.getByText(/Appuyez sur le haut-parleur devant/)).toBeVisible();const audio=await texts(page);expect(audio.some(text=>text==='Mɛɛribu'||text==='A kpuna n do ?')).toBe(true);expect(core.proverbs.some((proverb:any)=>audio.includes(proverb.ba))).toBe(true);
 expect(requests).toHaveLength(0);expect(await page.locator('button button').count()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const width of [375,768,1280])test(`A visitor can listen, stop and replay without a flag or human recording at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const {requests}=await setup(page);await goto(page);
 expect(requests).toHaveLength(0);await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+first,exact:true})).toBeVisible();
 expect(requests[0].speech_only).toBe(true);expect(requests[0].lang).toBe('bba');expect(requests[0].text).toBe(first);expect(requests[0].audio_base64).toBeUndefined();
 await page.getByRole('button',{name:'Arrêter : '+first,exact:true}).click();await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+first,exact:true})).toBeVisible();expect(requests).toHaveLength(1);
 await page.getByRole('button',{name:'Écouter : '+second,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+second,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Écouter : '+first,exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('button button').count()).toBe(0);
 await page.getByRole('button',{name:'Quitter l’écoute',exact:true}).click();expect(await page.evaluate(()=>(window as any).__apAudio.media.every((audio:any)=>audio.stopped))).toBe(true);
});
test('Published human audio has priority over synthesis',async({page})=>{
 const {requests}=await setup(page,{human:true});await goto(page);await expect(page.getByRole('button',{name:'Écouter : '+first,exact:true})).toHaveAttribute('title','Voix humaine publiée');
 await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+first,exact:true})).toBeVisible();expect(requests).toHaveLength(0);
});
test('An unavailable published recording falls back to MMS',async({page})=>{
 const {requests}=await setup(page,{human:true,brokenHuman:true});await goto(page);await expect(page.getByRole('button',{name:'Écouter : '+first,exact:true})).toHaveAttribute('title','Voix humaine publiée');
 await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+first,exact:true})).toHaveAttribute('title','Voix synthétique · Meta MMS');expect(requests).toHaveLength(1);
});
test('A first click waits for the human manifest instead of bypassing or cancelling its recording',async({page})=>{
 const {requests}=await setup(page,{human:true,manifestDelay:true});await goto(page);await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+first,exact:true})).toBeVisible();expect(requests).toHaveLength(0);
});
test('Cancelled generation cannot start late playback',async({page})=>{
 await setup(page,{delayed:true});await goto(page);await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await page.getByRole('button',{name:'Annuler l’écoute : '+first,exact:true}).click();
 await expect(page.getByRole('button',{name:'Écouter : '+first,exact:true})).toBeVisible();await page.getByRole('button',{name:'Écouter : '+second,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+second,exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).__apAudio.media.filter((audio:any)=>!audio.stopped).length)).toBe(1);
});
test('Quota errors preserve the text and offer a working retry',async({page})=>{
 const state=await setup(page,{quota:true});await goto(page);await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await expect(page.getByRole('status')).toBeVisible();await expect(page.getByText(first,{exact:true})).toBeVisible();
 state.allow();await page.getByRole('button',{name:'Réessayer : '+first,exact:true}).click();await expect(page.getByRole('button',{name:'Arrêter : '+first,exact:true})).toBeVisible();
});
for(const width of [375,1280])test(`All ten foundation renderers expose words, examples, pairs and table forms at ${width}px`,async({page})=>{
 test.setTimeout(180_000);await page.setViewportSize({width,height:900});const {requests}=await setup(page);
 for(const unit of core.foundations){await goto(page,'foundation',unit.id);await expect(page.getByText(unit.title_fr,{exact:true})).toBeVisible();const audio=await texts(page);
  if(unit.title_ba)expect(audio).toContain(unit.title_ba);
  for(const section of unit.sections){if(['examples','culture'].includes(section.type))for(const item of section.items)expect(audio).toContain(item.ba);if(section.type==='pairs')for(const item of section.items){expect(audio).toContain(item.a.ba);expect(audio).toContain(item.b.ba);}if(section.type==='order'){for(const word of section.ba)expect(audio).toContain(word);expect(audio).toContain(section.ba.join(' '));}}
  if(unit.id==='pronoms')expect(audio).toContain('na');if(unit.id==='verbe')expect(audio).toContain('gamamɔ');
  expect(await page.locator('button button').count()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }expect(requests).toHaveLength(0);
});
test('Theme words, their examples and forms are available beyond the first 120 entries',async({page})=>{
 const {requests}=await setup(page);await goto(page,'theme');await expect(page.getByRole('article')).toHaveCount(120);
 const more=page.getByRole('button',{name:/Afficher les mots suivants/});if(await more.count())await more.click();expect(await page.getByRole('article').count()).toBeGreaterThan(120);
 const expand=page.getByRole('button',{name:/^Exemples et formes :/}).first();const label=await expand.getAttribute('aria-label');const word=label!.slice('Exemples et formes : '.length);await expand.click();const card=core.cards.find((card:any)=>card.ba===word);const article=page.getByRole('article',{name:word,exact:true}).first();
 const audio=await article.locator('[data-ap-audio-text]').evaluateAll(elements=>elements.map(element=>element.getAttribute('data-ap-audio-text')));expect(audio).toContain(word);if(card.pl)expect(audio).toContain(card.pl);if(card.ex_ba)expect(audio).toContain(card.ex_ba);expect(requests).toHaveLength(0);
});
test('All 44 scenes expose vocabulary and every successive spoken line',async({page})=>{
 test.setTimeout(240_000);await setup(page);
 for(const scene of scenes.scenes){await goto(page,'scene',scene.id);await expect(page.getByText(scene.title,{exact:true})).toBeVisible();let audio=await texts(page);for(const word of scene.vocab)expect(audio).toContain(word.ba);
  await page.getByText('Écouter',{exact:true}).click();await page.getByRole('button',{name:'Commencer la scène',exact:true}).click();
  for(let i=0;i<=scene.lines.length;i++){const advance=page.getByRole('button',{name:/^(Suite|Je l’ai dit)$/});if(!await advance.count())break;await advance.click();}
  audio=await texts(page);for(const line of scene.lines)if(line.ba&&line.who!=='narrator')expect(audio).toContain(line.ba);
  expect(await page.locator('button button').count()).toBe(0);
 }
});
test('Listening to a choice or ordered word never selects or grades it',async({page})=>{
 const {requests}=await setup(page);await goto(page,'session');await page.getByRole('button',{name:'Écouter : '+first,exact:true}).click();await expect(page.getByText('Bonne réponse',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Choisir : '+first,exact:true})).toBeEnabled();
 expect(requests[0].text).toBe(first);await page.getByRole('button',{name:'Choisir : '+first,exact:true}).click();await page.getByRole('button',{name:'Continuer',exact:true}).click();
 await page.getByRole('button',{name:'Écouter : Agɛdɛ',exact:true}).click();await expect(page.getByRole('button',{name:'Vérifier',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Agɛdɛ',exact:true}).click();await expect(page.getByRole('button',{name:'Vérifier',exact:true})).toBeDisabled();
});
test('The result screen keeps pronunciations for the phrases to review',async({page})=>{
 await setup(page);await goto(page,'results');await expect(page.getByText('À retenir',{exact:true})).toBeVisible();const audio=await texts(page);expect(audio).toContain(first);expect(audio).toContain('Agɛdɛ ye ya do');
});
test('Long pronunciations play every chunk without truncation',async({page})=>{
 const {requests}=await setup(page);await goto(page,'long');const row=page.locator('[data-ap-ba-text]').last();await row.getByRole('button').click();
 for(let clip=0;clip<4;clip++){await expect(row.getByRole('button')).toHaveAttribute('aria-label',/^Arrêter :/);await expect.poll(()=>page.evaluate(()=>(window as any).__apAudio.media.length)).toBe(clip+1);await page.evaluate(()=>(window as any).__apAudio.finish());}
 await expect(row.getByRole('button')).toHaveAttribute('aria-label',/^Écouter :/);expect(requests.every(body=>body.text.length<=380)).toBe(true);
});
