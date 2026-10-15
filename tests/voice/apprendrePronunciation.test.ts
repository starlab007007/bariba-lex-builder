import { buildPronunciationLexicon, mixedPronunciationParts, tablePronunciationParts, optionsAreNative } from '../../src/lib/apprendre/pronunciation.ts';
import core from '../../src/data/apprendre_v2.json' with {type:'json'};
import scenes from '../../src/data/scenes_v2.json' with {type:'json'};
import { ApprendreContent, type ApprendreContentJson } from '../../src/lib/apprendre/content.ts';
import { ApTaskFactory } from '../../src/lib/apprendre/tasks.ts';
import { apprendreAudioKey } from '../../src/lib/apprendre/audioKey.ts';
const assert=(ok:unknown,message='assertion failed')=>{if(!ok)throw new Error(message);};
const data=core as unknown as ApprendreContentJson, lexicon=buildPronunciationLexicon(data,scenes);
const spoken=(parts:ReturnType<typeof mixedPronunciationParts>)=>parts.filter(part=>part.bariba).map(part=>part.text);
Deno.test('all explicit catalogue words, examples, forms and scene lines enter the pronunciation index',()=>{
  for(const card of data.cards){assert(lexicon.ba.has(card.ba.normalize('NFC').toLowerCase()));if(card.ex_ba)assert(lexicon.ba.has(card.ex_ba.normalize('NFC').toLowerCase()));if(card.pl)assert(lexicon.ba.has(card.pl.normalize('NFC').toLowerCase()));}
  for(const scene of scenes.scenes)for(const line of scene.lines)if(line.ba)assert(lexicon.ba.has(line.ba.normalize('NFC').toLowerCase()));
});
Deno.test('mixed prose preserves exact text and isolates Bariba instead of French explanations',()=>{
  const raw='« gúra » veut dire pluie ; gamamɔ signifie en train de traire.';
  const parts=mixedPronunciationParts(raw,lexicon);assert(parts.map(part=>part.text).join('')===raw);
  assert(spoken(parts).includes('gúra')&&spoken(parts).includes('gamamɔ'));assert(!spoken(parts).includes('pluie')&&!spoken(parts).includes('traire'));
});
Deno.test('quoted short pronouns are spoken while ordinary French words remain unmarked',()=>{
  assert(spoken(mixedPronunciationParts('« sa » est une forme.',lexicon)).includes('sa'));
  assert(!spoken(mixedPronunciationParts('Sa maison est dans la ville.',lexicon)).includes('Sa'));
});
Deno.test('tables keep the source and French gloss silent and expose inflected Bariba forms',()=>{
  assert(spoken(tablePronunciationParts('gamamɔ','Bàátɔ̀nú',lexicon)).includes('gamamɔ'));
  assert(!spoken(tablePronunciationParts('en train de traire','Usage',lexicon)).length);
  assert(!spoken(tablePronunciationParts('p. 125','Source',lexicon)).length);
  const text='Gura ya koo nɛ. — Il va pleuvoir.';const parts=tablePronunciationParts(text,'Exemple',lexicon);
  assert(parts.map(part=>part.text).join('')===text&&spoken(parts).includes('Gura ya koo nɛ.'));
  assert(!spoken(parts).some(part=>part.includes('pleuvoir')));
});
Deno.test('morphological arrows, variants and annotations are separated without reading French',()=>{
  const text='+ -ba, ou -a → -i';const parts=tablePronunciationParts(text,'Pluriel',lexicon);
  assert(parts.map(part=>part.text).join('')===text);for(const suffix of ['-ba','-a','-i'])assert(spoken(parts).includes(suffix));
  const base=tablePronunciationParts('ko (faire)','Base',lexicon);assert(spoken(base).includes('ko')&&!spoken(base).includes('faire'));
});
Deno.test('plain Latin Bariba quiz options are recognized without treating French choices as Bariba',()=>{
  assert(optionsAreNative(['abenu','aberuba','aberusu','aberi'],lexicon));
  assert(!optionsAreNative(['pluie','grossesse','marché','chemin'],lexicon));
  const factory=new ApTaskFactory(new ApprendreContent(data));
  const tasks=factory.foundationQuiz(data.foundations.find(unit=>unit.id==='classes')!);assert(tasks[0].optionsAreBariba);
});
Deno.test('combining accents remain byte-for-byte intact and publication audio keys stay stable',()=>{
  const text='« gu\u0301ra »';assert(mixedPronunciationParts(text,lexicon).map(part=>part.text).join('')===text);
  assert(apprendreAudioKey(' Agɛdɛ  ye ya do. ' )===apprendreAudioKey('Agɛdɛ ye ya do.'));
});
