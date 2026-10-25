# FITILA bariba voice gateway — service de PRODUCTION (pas experiments/).
# Les poids sont pré-téléchargés au build pour que le conteneur démarre vite
# et reste fonctionnel même si huggingface.co est temporairement inaccessible
# au runtime (c'est justement le problème que ce service corrige pour la
# voix bariba : ne plus dépendre d'un tiers externe à chaque requête).
FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsndfile1 build-essential cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
ENV HF_HOME=/srv/.cache/huggingface \
    PYTHONUNBUFFERED=1

COPY requirements.txt /srv/requirements.txt
# setuptools/wheel : absents par défaut de l'image depuis Python 3.11-slim
# récente ; sans eux, l'installation d'un paquet sdist en dépendance
# transitive (fairseq2, via omnilingual-asr) échoue avec
# "BackendUnavailable: Cannot import 'setuptools.build_meta'".
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
# Ce VPS est CPU uniquement (pas de GPU) : `pip install torch` depuis PyPI
# installe par défaut la variante CUDA, qui tente de charger libcudart.so
# au chargement du pipeline ASR (omnilingual-asr/fairseq2) et échoue avec
# "libcudart.so.13: cannot open shared object file" — le service démarre
# quand même (TTS fonctionne) mais reste "degraded" (ASR indisponible)
# indéfiniment. Installer torch CPU en amont ne suffit PAS : la commande
# suivante (`pip install -r requirements.txt`, qui tire omnilingual-asr)
# réévalue tout le graphe de dépendances depuis l'index PyPI par défaut et
# réinstalle silencieusement la variante CUDA pour satisfaire la
# contrainte de torch d'omnilingual-asr/fairseq2 — confirmé empiriquement
# (`pip show torch` donnait encore 2.8.0+cu128 après ce premier essai).
# Un fichier de contraintes épingle la version CPU exacte déjà installée,
# pour que la commande suivante la considère satisfaite sans jamais
# consulter l'index par défaut pour torch.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip freeze | grep -i '^torch==' > /tmp/torch-constraint.txt \
    && cat /tmp/torch-constraint.txt
RUN pip install --no-cache-dir -r requirements.txt -c /tmp/torch-constraint.txt

COPY app.py /srv/app.py

# Pré-téléchargement best-effort au build (ASR Apache-2.0, TTS CC-BY-NC — voir
# README.md). Si le registre des assets est indisponible pendant le build,
# ce n'est pas fatal : le service retentera au premier démarrage.
RUN python -c "\
from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline; \
ASRInferencePipeline(model_card='omniASR_CTC_300M')" || true
RUN python -c "\
from transformers import VitsModel, AutoTokenizer; \
VitsModel.from_pretrained('facebook/mms-tts-bba'); \
AutoTokenizer.from_pretrained('facebook/mms-tts-bba')" || true

RUN useradd -r -u 10001 fitila && chown -R fitila:fitila /srv
USER fitila

EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8090/health',timeout=5).status==200 else 1)"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
