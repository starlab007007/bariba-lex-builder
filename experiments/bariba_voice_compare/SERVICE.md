# FITILA four-engine research service

Four engines: `meta-asr-300m`, `bariba-stt`, `meta-mms-tts-bba`, `bariba-tts`.

Research service ONLY; MMS-TTS Baatɔnum uses CC BY-NC and must not be deployed into a commercial application without permission. Meta model files download on first request to HF_HOME; ensure license acceptance and appropriate resource quotas. Do not expose container port 8090 publicly; use private tunnel/reverse proxy with authentication. No secrets are in the repository. No model quality claims without an actual test corpus.

```sh
cd experiments/bariba_voice_compare
export FITILA_MODEL_API_TOKEN=... # strong random token
export FITILA_SUPABASE_PUBLISHABLE_KEY=... # public project key
export FITILA_USER_ACCESS_TOKEN=... # optional benchmark user token
# docker compose up --build -d (on a server with access to model repositories)
```

`GET /health` is informational only and DOES NOT guarantee model weights have loaded.

`POST /infer` requires Authorization: Bearer FITILA_MODEL_API_TOKEN. Payload:
```json
{"engine":"meta-asr-300m","audio_base64":"<base64 WAV 16kHz>"}
```
For TTS send `{"engine":"meta-mms-tts-bba","text":"..."}`. Baseline versions use corresponding `bariba-*` Supabase endpoints. Service responds with transcript or generated audio; failed inference results in non-200, never a fabricated transcription.

This is a **server adapter only**, not proof that models are deployed to VPS or that Flutter has begun calling the service. Audio base64 inputs must be WAV; convert WebM/MP4 via FFmpeg at ingress. The existing production Bariba functions remain unchanged.
