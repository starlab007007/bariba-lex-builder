"""FITILA research-only A/B benchmark: Meta models versus deployed Bariba endpoints.

Input JSONL:
{"id":"a1","audio":"corpus/a1.wav","reference":"...", "text":"..."}
Audio should be consented Bariba recordings (WAV, mono recommended).
Never commits audio or tokens. No fallback result is reported as a model success.
"""
import argparse, base64, json, os, re, time, unicodedata, wave
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

STT = "bariba-stt"
TTS = "bariba-tts"

def tokens(text):
    text = unicodedata.normalize("NFC", text).lower()
    return re.findall(r"[^\W_]+", text, flags=re.UNICODE)

def edit_distance(a,b):
    row=list(range(len(b)+1))
    for i,x in enumerate(a,1):
        nxt=[i]+[0]*len(b)
        for j,y in enumerate(b,1):
            nxt[j]=min(nxt[j-1]+1,row[j]+1,row[j-1]+int(x!=y))
        row=nxt
    return row[-1]

def score(reference, transcript):
    a,b=tokens(reference),tokens(transcript)
    # Unicode code points after normalization; keep diacritics.
    ac=list(unicodedata.normalize("NFC",reference).lower())
    bc=list(unicodedata.normalize("NFC",transcript).lower())
    return {"word_errors":edit_distance(a,b),"words":len(a),
            "char_errors":edit_distance(ac,bc),"chars":len(ac)}

def supabase_function(slug, data, url, key, token, timeout=60):
    if not key or not url: raise RuntimeError("Supabase URL and publishable key required")
    headers={"Content-Type":"application/json","apikey":key,
             "Authorization":"Bearer "+(token or key)}
    req=Request(url.rstrip("/")+"/functions/v1/"+slug,
                data=json.dumps(data).encode(),headers=headers,method="POST")
    with urlopen(req,timeout=timeout) as r:
        return json.load(r)

def baseline_stt(audio,url,key,token):
    payload={"audio":"data:audio/wav;base64,"+base64.b64encode(Path(audio).read_bytes()).decode(),
             "robustMode":False,"languageCode":"ba"}
    return supabase_function(STT,payload,url,key,token)

def extract_transcript(obj):
    for name in ("transcription","text","transcript"):
        value=obj.get(name)
        if isinstance(value,str) and value.strip():return value.strip()
    raise RuntimeError("No transcription field in baseline response: "+str(list(obj.keys())))

def meta_asr(audio,lang):
    from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline
    # Official fairseq2 integration: run with real model card, never simulate inference.
    global _PIPE
    if _PIPE is None:_PIPE=ASRInferencePipeline(model_card="omniASR_CTC_300M")
    results=_PIPE.transcribe([audio],lang=[lang],batch_size=1)
    if not results:raise RuntimeError("No ASR result")
    result=results[0]
    return str(getattr(result,"text",result)).strip()

def meta_tts(text,out):
    import torch
    from transformers import VitsModel,AutoTokenizer
    global _TTS
    if _TTS is None:
        _TTS=(VitsModel.from_pretrained("facebook/mms-tts-bba").eval(),
              AutoTokenizer.from_pretrained("facebook/mms-tts-bba"))
    model,tok=_TTS
    with torch.no_grad():
        waveform=model(**tok(text,return_tensors="pt")).waveform.squeeze().cpu().numpy()
    import numpy as np
    audio=np.clip(waveform,-1,1)
    with wave.open(str(out),"wb") as fp:
        fp.setnchannels(1);fp.setsampwidth(2);fp.setframerate(model.config.sampling_rate)
        fp.writeframes((audio*32767).astype("<i2").tobytes())

def audio_duration(filename):
    try:
        with wave.open(str(filename)) as f:return f.getnframes()/f.getframerate()
    except Exception:return None

_PIPE=None
_TTS=None

def evaluate(args):
    root=Path(args.dataset).resolve().parent
    output=Path(args.output).resolve();output.mkdir(parents=True,exist_ok=True)
    cases=[json.loads(line) for line in Path(args.dataset).read_text().splitlines() if line.strip()]
    rows=[]
    for i,case in enumerate(cases):
        item={"id":case["id"],"reference":case.get("reference",""),"comparison_type":"paired",
              "meta_asr_model":"facebook/omniASR-CTC-300M",
              "meta_tts_model":"facebook/mms-tts-bba"}
        audio=(root/case["audio"]).resolve() if case.get("audio") else None
        if audio and not audio.is_relative_to(root):raise ValueError("Dataset audio must remain below manifest directory")
        if audio and not audio.exists():raise FileNotFoundError(audio)
        if audio and case.get("reference"):
            for engine in (["meta","baseline"] if args.engine=="all" else [args.engine]):
                started=time.perf_counter()
                try:
                    if engine=="meta": transcript=meta_asr(str(audio),args.lang)
                    else: transcript=extract_transcript(baseline_stt(audio,args.supabase_url,args.supabase_key,args.supabase_token))
                    metrics=score(case["reference"],transcript)
                    item[engine+"_asr"]={"ok":True,"transcript":transcript,**metrics,
                                          "seconds":round(time.perf_counter()-started,3)}
                except Exception as e:
                    item[engine+"_asr"]={"ok":False,"error":str(e)[:350]}
        if case.get("text"):
            if args.engine in ("all","meta"):
                path=output/(re.sub(r"[^a-zA-Z0-9_-]","_",str(case["id"]))+".mms.wav")
                start=time.perf_counter()
                try:
                    meta_tts(case["text"],path)
                    item["meta_tts"]={"ok":True,"file":str(path),"duration":audio_duration(path),
                                      "seconds":round(time.perf_counter()-start,3)}
                except Exception as e:item["meta_tts"]={"ok":False,"error":str(e)[:350]}
            if args.engine in ("all","baseline"):
                start=time.perf_counter()
                try:
                    result=supabase_function(TTS,{"text":case["text"],"skipRefine":True},
                        args.supabase_url,args.supabase_key,args.supabase_token)
                    item["baseline_tts"]={"ok":bool(result.get("success") and result.get("audio_url")),
                                           "audio_url":result.get("audio_url"),
                                           "seconds":round(time.perf_counter()-start,3),
                                           "response_keys":list(result.keys())}
                except Exception as e:item["baseline_tts"]={"ok":False,"error":str(e)[:350]}
        rows.append(item)
    (output/"results.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2))
    summary={"samples":len(rows),"asr":{},"tts":{},"warning":"No subjective TTS quality score without blinded human evaluation."}
    for engine in ("meta","baseline"):
        valid=[x[engine+"_asr"] for x in rows if x.get(engine+"_asr",{}).get("ok")]
        if valid:
            summary["asr"][engine]={"n":len(valid),
              "WER":sum(v["word_errors"] for v in valid)/max(1,sum(v["words"] for v in valid)),
              "CER":sum(v["char_errors"] for v in valid)/max(1,sum(v["chars"] for v in valid)),
              "mean_seconds":sum(v["seconds"] for v in valid)/len(valid)}
        summary["tts"][engine]={"generated":sum(x.get(engine+"_tts",{}).get("ok",False) for x in rows),
                                 "attempted":sum(engine+"_tts" in x for x in rows)}
    (output/"summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print(json.dumps(summary,ensure_ascii=False,indent=2))

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--dataset",required=True,help="consented JSONL manifest")
    ap.add_argument("--output",default="benchmark-results")
    ap.add_argument("--engine",choices=["meta","baseline","all"],default="all")
    ap.add_argument("--lang",default="bba_Latn",help="Verify supported language identifier with installed omnilingual-asr before use")
    ap.add_argument("--supabase-url",default=os.getenv("FITILA_SUPABASE_URL","https://dvswhjawiooprghzeyol.supabase.co"))
    ap.add_argument("--supabase-key",default=os.getenv("FITILA_SUPABASE_PUBLISHABLE_KEY",""))
    ap.add_argument("--supabase-token",default=os.getenv("FITILA_USER_ACCESS_TOKEN",""))
    evaluate(ap.parse_args())
