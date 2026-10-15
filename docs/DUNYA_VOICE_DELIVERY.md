# DUNYA public voice

The `/dunya` page uses `dunya-voice-turn` for visitors and signed-in users, without pilot roles or client-side model selection. Administrator role checks only control visibility of diagnostics.

## Request and streaming response

POST JSON: either `text` (up to 1600 characters) or canonical `audio_base64` (WAV PCM16, mono, 16 kHz, up to 120 seconds), `lang`, `reply_lang`, and up to eight history turns. `transcribe_only` stops before generating an answer; `speech_only` synthesizes an existing answer without calling the language model again. The browser converts supported recordings and uploads locally, with a 20 MB input limit.

NDJSON events: `stage`, `transcript`, `answer`, `audio`, `notice`, `done`, or `error`. All events carry a request ID and elapsed server time. Only successful inference labels a transcript/audio as Meta; fallback events explicitly identify `bariba-stt` or `bariba-tts`. A non-empty but repetitive transcript requests clarification rather than generating an answer. These heuristics do not constitute an ASR confidence estimate or a measured language-quality guarantee.

The server calls the existing VPS with its private token. It splits canonical WAV near quiet frames at or below 25 seconds and synthesizes chunks of at most 380 characters. It reuses the existing translation and chat functions, requesting `skip_translation` from the latter to avoid a redundant translation. French responses use the browser voice. No claim of mobile offline inference is made.

The browser plays segments in order while later segments are produced, supports pause/resume and cancellation, retains the last six audio responses in memory for replay, and revokes object URLs on eviction/unmount. Transcript history remains in the existing local browser history. Raw audio is not added to the database or training corpus.

## Access and protection

The new function deliberately has platform JWT verification disabled: it checks any supplied user token via Auth itself. An expired token is rejected, not silently treated as a visitor. Visitors can use only this bounded voice endpoint. VPS/service keys never reach the browser. Requests are limited to 11 MB before parsing.

Apply migration `20261015164927_dunya_public_voice_quota.sql` before deploying. Atomic quotas are 6 turns/minute for each visitor IP hash, 12 for each signed-in user, 60 globally/minute, and 1000 globally/day. IP-derived identifiers are HMAC-hashed with the server secret; no raw IP, audio or transcript is stored in these tables. Global limits also bound callers that rotate guest identifiers. Missing quota infrastructure fails closed.

Postgres RPCs are executable only by `service_role`. Both operational tables have RLS enabled and all public/anon/authenticated grants revoked. A shared CPU lease allows only one new-path Meta inference at a time across Edge isolates. Waiting is limited to ten seconds; abandoned leases expire after 150 seconds. This does not control pre-existing direct VPS callers or the legacy gateway.

## Deployment and validation

Existing secrets: `FITILA_VOICE_SERVICE_URL`, `FITILA_MODEL_API_TOKEN`, and standard Supabase server environment variables. No new model download or change to the working VPS image is required. Deploy `fitila-ia-chat` with the optional `skip_translation` support, then `dunya-voice-turn`, then the web bundle.

Tests cover guest orchestration, actual-engine reporting, fallback, empty ASR, long media, Unicode, stream truncation, quotas and invalid sessions. Browser tests use explicit mocked model outputs and generated test tones; these are not language-quality measurements. Real inference, microphone acoustics and native-speaker intelligibility must be evaluated separately. MMS-TTS weights are CC BY-NC 4.0; deployment use must respect that license.

Rollback: restore the previous web bundle. The old `meta-voice-gateway` remains available for legacy callers. The additive quota tables are not user-content stores and can remain in place. Reverting the optional chat parameter does not change legacy requests.
