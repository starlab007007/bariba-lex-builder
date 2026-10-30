import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env', 'utf8').split(/\r?\n/).map(line => {
  const index = line.indexOf('='); return index > 0 ? [line.slice(0,index).trim(),line.slice(index+1).trim().replace(/^["']|["']$/g,'')] : [];
}).filter(item => item.length === 2));
const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) throw new Error('Public FITILA configuration missing');
if (new URL(base).hostname !== 'dvswhjawiooprghzeyol.supabase.co') throw new Error('TTS probe must use the canonical FITILA project');
const response = await fetch(base + '/functions/v1/bariba-tts', {
  method: 'POST', headers: {'Content-Type':'application/json', apikey:key},
  body: JSON.stringify({text:'A kpuna n do?', skipRefine:true}), signal:AbortSignal.timeout(45000),
});
if (!response.ok) throw new Error('TEM TTS probe HTTP ' + response.status);
const payload = await response.json();
const wav = Buffer.from(payload.audio_base64 || '', 'base64');
if (!payload.success || wav.length < 44 || wav.toString('ascii',0,4) !== 'RIFF' || wav.toString('ascii',8,12) !== 'WAVE') throw new Error('TEM TTS did not return a WAV');
let offset=12, format, samples;
while (offset+8 <= wav.length) {
  const name=wav.toString('ascii',offset,offset+4), length=wav.readUInt32LE(offset+4);
  if (offset+8+length > wav.length) throw new Error('Truncated WAV');
  if (name==='fmt ') format=wav.subarray(offset+8,offset+8+length);
  if (name==='data') samples=wav.subarray(offset+8,offset+8+length);
  offset+=8+length+(length%2);
}
if (!format || !samples || format.readUInt16LE(0)!==1 || format.readUInt16LE(14)!==16 || samples.length<100) throw new Error('Invalid PCM speech');
let energy=0;
for(let i=0;i+1<samples.length;i+=2) energy+=Math.pow(samples.readInt16LE(i)/32768,2);
const rms=Math.sqrt(energy/(samples.length/2));
if(rms<0.0001) throw new Error('TTS returned silence');
console.log(JSON.stringify({test:'TEM Bariba inline speech',passed:true,wav_bytes:wav.length,sample_rate:format.readUInt32LE(4),rms}));
