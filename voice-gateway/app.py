"""FITILA — passerelle de production pour la voix bariba (TTS + STT).

Contrairement à experiments/bariba_voice_compare/ (recherche, comparaison de
quatre moteurs, PAS une route de production), ce service EST la route de
production appelée en premier par les edge functions bariba-tts / bariba-stt
(voir supabase/functions/_shared/meta-voice.ts). Objectif : rendre la voix
bariba indépendante de la disponibilité des Spaces Hugging Face gratuits
(qui se mettent en veille ou tombent en panne, cf. error_503 / error_404).

Deux moteurs seulement, tous deux chargés au démarrage (pas de chargement
paresseux à la première requête, pour que /health reflète un état réel et
que la première vraie requête ne timeout pas) :

- STT : facebook/omniASR-CTC-300M (Meta Omnilingual ASR). Licence Apache-2.0
  (code + poids) — réutilisable commercialement sans restriction connue.
- TTS : facebook/mms-tts-bba (Meta MMS, modèle officiel pour le baatonum /
  bariba — code ISO 639-3 "bba"). Licence CC-BY-NC-4.0 : usage non commercial
  sauf accord de Meta. FITILA utilise ce modèle avec cette restriction connue
  et documentée (voir README.md de ce dossier) ; ce n'est pas un avis
  juridique, seulement le constat de la licence publiée par Meta.

Contrat HTTP identique à l'ancien service expérimental pour que
meta-voice.ts n'ait besoin d'aucune modification :
  POST /infer  { "engine": "meta-asr-300m", "audio_base64": "..." }
            -> { "engine", "transcript", "elapsed_seconds" }
  POST /infer  { "engine": "meta-mms-tts-bba", "text": "..." }
            -> { "engine", "audio_mime", "audio_base64", "elapsed_seconds" }
  GET  /health -> { "status", "asr_loaded", "tts_loaded", ... }
"""
import base64
from collections import OrderedDict
import logging
import os
import tempfile
import time
from pathlib import Path

import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, VitsModel

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("fitila.voice-gateway")

SERVICE_TOKEN = os.getenv("FITILA_MODEL_API_TOKEN", "")
AUDIO_LIMIT_BYTES = 8_000_000
ASR_MODEL_CARD = "omniASR_CTC_300M"
TTS_MODEL_ID = "facebook/mms-tts-bba"

app = FastAPI(title="FITILA bariba voice gateway", version="1.0.0")

# État de chargement exposé tel quel par /health : jamais un booléen figé.
_state = {"asr_loaded": False, "tts_loaded": False, "asr_error": None, "tts_error": None}
_asr_pipeline = None
_tts_model = None
_tts_tokenizer = None
_TTS_CACHE_MAX = 128
_tts_cache: "OrderedDict[str, bytes]" = OrderedDict()
torch.set_num_threads(max(1, os.cpu_count() or 1))


def _load_models() -> None:
    """Chargement EAGER au démarrage du process (pas à la première requête)."""
    global _asr_pipeline, _tts_model, _tts_tokenizer

    try:
        from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline

        log.info("Chargement ASR (%s)…", ASR_MODEL_CARD)
        _asr_pipeline = ASRInferencePipeline(model_card=ASR_MODEL_CARD)
        _state["asr_loaded"] = True
        log.info("ASR prêt.")
    except Exception as exc:  # noqa: BLE001 — on veut démarrer même si un moteur échoue
        _state["asr_error"] = str(exc)[:300]
        log.exception("Échec du chargement ASR, le service démarre quand même (dégradé).")

    try:
        log.info("Chargement TTS (%s)…", TTS_MODEL_ID)
        _tts_model = VitsModel.from_pretrained(TTS_MODEL_ID).eval()
        _tts_tokenizer = AutoTokenizer.from_pretrained(TTS_MODEL_ID)
        _state["tts_loaded"] = True
        log.info("TTS prêt.")
    except Exception as exc:  # noqa: BLE001
        _state["tts_error"] = str(exc)[:300]
        log.exception("Échec du chargement TTS, le service démarre quand même (dégradé).")


_load_models()


def _warm_up() -> None:
    """Premier passage à vide : la 1re vraie requête ne paie plus l'initialisation paresseuse."""
    try:
        if _state["tts_loaded"]:
            _run_tts("A kua")
            _tts_cache.clear()
    except Exception:  # noqa: BLE001
        log.warning("Warm-up TTS ignoré.")
    try:
        if _state["asr_loaded"]:
            import soundfile as sf
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                sf.write(tmp.name, np_zeros_1s(), 16000)
            try:
                _run_asr(Path(tmp.name))
            except HTTPException:
                pass  # silence => « transcription vide » attendu : seul le chauffage compte
    except Exception:  # noqa: BLE001
        log.warning("Warm-up ASR ignoré.")


def np_zeros_1s():
    import numpy as np
    return np.zeros(16000, dtype="float32")


_warm_up()


class InferRequest(BaseModel):
    engine: str
    text: str | None = None
    audio_base64: str | None = None


@app.get("/health")
def health():
    healthy = _state["asr_loaded"] and _state["tts_loaded"]
    return {
        "status": "ok" if healthy else "degraded",
        "asr_loaded": _state["asr_loaded"],
        "tts_loaded": _state["tts_loaded"],
        "asr_error": _state["asr_error"],
        "tts_error": _state["tts_error"],
    }


def _run_asr(audio_path: Path) -> str:
    if not _state["asr_loaded"] or _asr_pipeline is None:
        raise HTTPException(503, "Moteur ASR indisponible : " + (_state["asr_error"] or "non chargé"))
    results = _asr_pipeline.transcribe([str(audio_path)], batch_size=1)
    if not results:
        raise HTTPException(503, "Aucun résultat ASR")
    result = results[0]
    text = result.get("text") if isinstance(result, dict) else getattr(result, "text", None)
    if not text:
        raise HTTPException(503, "Transcription vide")
    return text


def _run_tts(text: str) -> bytes:
    if not _state["tts_loaded"] or _tts_model is None or _tts_tokenizer is None:
        raise HTTPException(503, "Moteur TTS indisponible : " + (_state["tts_error"] or "non chargé"))
    import soundfile as sf

    # Cache LRU : les phrases de DUNYA se répètent (salutations, réponses essentielles) ;
    # une phrase déjà synthétisée est rendue instantanément, sans CPU.
    cached = _tts_cache.get(text)
    if cached is not None:
        _tts_cache.move_to_end(text)
        return cached
    with torch.inference_mode():
        inputs = _tts_tokenizer(text, return_tensors="pt")
        waveform = _tts_model(**inputs).waveform.squeeze().cpu().numpy()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        sf.write(tmp.name, waveform, _tts_model.config.sampling_rate)
        data = Path(tmp.name).read_bytes()
    _tts_cache[text] = data
    while len(_tts_cache) > _TTS_CACHE_MAX:
        _tts_cache.popitem(last=False)
    return data


@app.post("/infer")
def infer(req: InferRequest, authorization: str | None = Header(default=None)):
    if not SERVICE_TOKEN or authorization != "Bearer " + SERVICE_TOKEN:
        raise HTTPException(401, "Authentication required")
    if req.engine not in {"meta-asr-300m", "meta-mms-tts-bba"}:
        raise HTTPException(400, "Invalid engine")

    start = time.perf_counter()
    try:
        if req.engine == "meta-mms-tts-bba":
            if not req.text or not req.text.strip():
                raise HTTPException(400, "Text required")
            raw = _run_tts(req.text)
            return {
                "engine": req.engine,
                "audio_mime": "audio/wav",
                "audio_base64": base64.b64encode(raw).decode(),
                "elapsed_seconds": round(time.perf_counter() - start, 3),
            }

        if not req.audio_base64:
            raise HTTPException(400, "Audio required")
        data = base64.b64decode(req.audio_base64.split(",")[-1], validate=True)
        if len(data) > AUDIO_LIMIT_BYTES:
            raise HTTPException(413, "Audio exceeds limit")
        with tempfile.TemporaryDirectory(prefix="fitila-asr-") as tmp:
            path = Path(tmp) / "input.wav"
            path.write_bytes(data)
            transcript = _run_asr(path)
            return {
                "engine": req.engine,
                "transcript": transcript,
                "elapsed_seconds": round(time.perf_counter() - start, 3),
            }
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(503, "Inference unavailable: " + str(exc)[:180]) from exc
