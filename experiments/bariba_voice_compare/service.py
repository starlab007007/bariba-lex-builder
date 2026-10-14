"""Research-only four-engine Bariba inference gateway. Not production-commercial MMS.
Uses local Meta models and existing Supabase Edge Functions, with real failures surfaced.
"""
import base64, json, os, tempfile, time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field
from compare import meta_asr,meta_tts,baseline_stt,supabase_function,extract_transcript

app=FastAPI(title="FITILA Bariba four-engine research API",version="0.1.0")
VALID={"meta-asr-300m","bariba-stt","meta-mms-tts-bba","bariba-tts"}
SERVICE_TOKEN=os.getenv("FITILA_MODEL_API_TOKEN","")
SUPABASE_URL=os.getenv("FITILA_SUPABASE_URL","https://dvswhjawiooprghzeyol.supabase.co")
SUPABASE_KEY=os.getenv("FITILA_SUPABASE_PUBLISHABLE_KEY","")
SUPABASE_JWT=os.getenv("FITILA_USER_ACCESS_TOKEN","")
LIMIT=8_000_000

class Inference(BaseModel):
    engine:str
    text:str|None=None
    audio_base64:str|None=None

@app.get("/health")
def health():
    return {"status":"ok","engines":sorted(VALID),"model_loaded":False,"note":"health does not attest model availability"}

@app.post("/infer")
def infer(req:Inference,authorization:str|None=Header(default=None)):
    if not SERVICE_TOKEN or authorization != "Bearer "+SERVICE_TOKEN:
        raise HTTPException(401,"Authentication required")
    if req.engine not in VALID: raise HTTPException(400,"Invalid engine")
    start=time.perf_counter()
    try:
        if req.engine.endswith("tts-bba") or req.engine=="bariba-tts":
            if not req.text or not req.text.strip():raise HTTPException(400,"Text required")
            if req.engine=="bariba-tts":
                result=supabase_function("bariba-tts",{"text":req.text,"skipRefine":True},SUPABASE_URL,SUPABASE_KEY,SUPABASE_JWT)
                if not result.get("success") or not result.get("audio_url"):raise RuntimeError("Bariba TTS failed to generate audio")
                return {"engine":req.engine,"audio_url":result["audio_url"],"elapsed_seconds":round(time.perf_counter()-start,3)}
            with tempfile.TemporaryDirectory(prefix="fitila-mms-") as tmp:
                file=Path(tmp)/"speech.wav"
                meta_tts(req.text,file)
                raw=file.read_bytes()
                return {"engine":req.engine,"audio_mime":"audio/wav","audio_base64":base64.b64encode(raw).decode(),"elapsed_seconds":round(time.perf_counter()-start,3)}
        if not req.audio_base64:raise HTTPException(400,"Audio required")
        data=base64.b64decode(req.audio_base64.split(",")[-1],validate=True)
        if len(data)>LIMIT:raise HTTPException(413,"Audio exceeds limit")
        with tempfile.TemporaryDirectory(prefix="fitila-asr-") as tmp:
            path=Path(tmp)/"input.wav"
            path.write_bytes(data)
            if req.engine=="meta-asr-300m":
                transcript=meta_asr(str(path),"")
            else:
                transcript=extract_transcript(baseline_stt(path,SUPABASE_URL,SUPABASE_KEY,SUPABASE_JWT))
            return {"engine":req.engine,"transcript":transcript,"elapsed_seconds":round(time.perf_counter()-start,3)}
    except HTTPException:raise
    except Exception as e:raise HTTPException(503,"Inference unavailable: "+str(e)[:180])
