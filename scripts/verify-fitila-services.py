#!/usr/bin/env python3
"""Production smoke tests: real TTS, ASR and self-hosted Gemma, no private data."""
import json
import os
import time
import urllib.error
import urllib.request

base = os.environ.get("FITILA_VOICE_BASE", "http://127.0.0.1:8090")
token = os.environ["FITILA_MODEL_API_TOKEN"]


def call(path, body):
    request = urllib.request.Request(base + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token}, method="POST")
    with urllib.request.urlopen(request, timeout=95) as response:
        return json.load(response)


speech = call("/infer", {"engine": "meta-mms-tts-bba", "text": "Aagu wunɛ ka weru. A kpuna n do?"})
assert len(speech.get("audio_base64", "")) > 1000, "TTS did not produce audio"
heard = call("/infer", {"engine": "meta-asr-300m", "audio_base64": speech["audio_base64"]})
assert isinstance(heard.get("transcript"), str) and heard["transcript"].strip(), "ASR did not produce text"
print("Real MMS-TTS → Omnilingual ASR inference: OK (not a linguistic quality score)", flush=True)
for attempt in range(24):
    try:
        answer = call("/chat", {"message": "Dis bonjour en français.", "max_tokens": 32})
        assert answer.get("model") == "gemma-4-e2b" and answer.get("response_fr", "").strip()
        print("Self-hosted Gemma real answer: OK", flush=True)
        break
    except (urllib.error.URLError, AssertionError):
        if attempt == 23:
            raise
        time.sleep(5)
