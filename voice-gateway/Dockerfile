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
# HOME=/srv (en plus de HF_HOME) : une fois l'ASR fonctionnel (import
# pyarrow/numpy réglé plus bas), son chargement échouait encore au runtime
# avec "PermissionError: [Errno 13] Permission denied: '/home/fitila'" —
# fairseq2 (via son asset download manager, utilisé par omnilingual-asr
# pour charger les poids du modèle) met son cache sous $HOME/.cache/fairseq2,
# PAS sous HF_HOME (ça, c'est huggingface_hub, utilisé par le TTS
# seulement). L'utilisateur `fitila` créé plus bas (useradd sans -m) n'a pas
# de répertoire personnel : /home/fitila n'existe même pas. Fixer HOME=/srv
# fait atterrir le cache fairseq2 dans /srv/.cache/fairseq2, un répertoire
# déjà recouvert par le `chown -R fitila:fitila /srv` plus bas — même
# logique que HF_HOME, appliquée à fairseq2.
ENV HF_HOME=/srv/.cache/huggingface \
    HOME=/srv \
    PYTHONUNBUFFERED=1

COPY requirements.txt /srv/requirements.txt
# setuptools/wheel : absents par défaut de l'image depuis Python 3.11-slim
# récente ; sans eux, l'installation d'un paquet sdist en dépendance
# transitive (fairseq2, via omnilingual-asr) échoue avec
# "BackendUnavailable: Cannot import 'setuptools.build_meta'".
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
# Ce VPS est CPU uniquement (pas de GPU). `pip install -r requirements.txt`
# seul installe par défaut des builds CUDA pour torch/torchaudio/fairseq2n,
# qui échouent au runtime avec "libcudart.so.13: cannot open shared object
# file" (TTS fonctionne quand même, mais l'ASR reste "degraded"
# indéfiniment). Historique condensé des essais qui ont précédé le fix
# actuel (chacun identifié par un diagnostic jetable séparé) :
#  1) torch CPU installé AVANT requirements.txt : silencieusement
#     remplacé par la variante CUDA à l'étape suivante (qui réévalue tout
#     le graphe pour satisfaire la contrainte exacte torch==2.8.0 de
#     fairseq2n).
#  2) Contraintes pip sur une version CPU non précisée : installe la plus
#     récente (2.14.1+cpu) au lieu de 2.8.0 exact → ResolutionImpossible.
#  3) Remplacer SEULEMENT torch par le CPU de la bonne version (après coup,
#     --no-deps) : le service démarre, mais torchaudio (extension C
#     compilée séparée, liée CUDA à SON propre build) échoue encore.
#  4) Remplacer torch+torchaudio, version de torchaudio lue par
#     `import torchaudio` : cet import échoue déjà (même erreur CUDA) au
#     moment de lire sa version, donc elle finit vide et torchaudio est
#     sauté — `pip show` (métadonnées, pas d'import) règle ce point précis.
#  5) Remplacer torch+torchaudio via pip show, mais chacun à SA PROPRE
#     version (torch==2.8.0, torchaudio==2.11.0, jamais prouvées
#     compatibles) : "undefined symbol: torch_library_impl" — désaccord
#     d'ABI. torch et torchaudio doivent être en lockstep de version.
#
# Avec torch+torchaudio en lockstep CPU réglé, l'ASR échouait encore,
# cette fois avec un message explicite de fairseq2n lui-même :
# "fairseq2 requires a CUDA 12.8 build of PyTorch 2.8.0, but the
# installed version is a CPU-only build" — fairseq2n (extension compilée
# derrière fairseq2, dépendance transitive d'omnilingual-asr) REFUSE tout
# torch CPU, quelle que soit sa version : ce n'est pas un problème d'ABI
# mais fairseq2n lui-même qui n'a pas de variant CPU générique. Le projet
# fairseq2 publie ses propres wheels CPU sur un index séparé, scopé par
# version de torch (https://fair.pkg.atmeta.com/fairseq2/whl/pt<torch>/cpu —
# voir https://github.com/facebookresearch/fairseq2#variants) ; confirmé
# que fairseq2n==0.5.2+cpu (la version exacte qu'omnilingual-asr exige)
# y est bien publié pour pt2.8.0.
RUN pip install --no-cache-dir -r requirements.txt
RUN TORCH_VER="$(pip show torch | grep -i '^Version:' | awk '{print $2}' | cut -d'+' -f1)" \
    && echo "résolu par requirements.txt : torch=${TORCH_VER} — remplacement (torch+torchaudio en lockstep) par les builds CPU" \
    && pip install --no-cache-dir --force-reinstall --no-deps \
         "torch==${TORCH_VER}" "torchaudio==${TORCH_VER}" \
         --index-url https://download.pytorch.org/whl/cpu \
    && FAIRSEQ2N_VER="$(pip show fairseq2n | grep -i '^Version:' | awk '{print $2}' | cut -d'+' -f1)" \
    && echo "résolu par requirements.txt : fairseq2n=${FAIRSEQ2N_VER} — remplacement par le variant cpu (index fairseq2, pt${TORCH_VER})" \
    && pip install --no-cache-dir --force-reinstall --no-deps \
         "fairseq2n==${FAIRSEQ2N_VER}" "fairseq2==${FAIRSEQ2N_VER}" \
         --index-url "https://fair.pkg.atmeta.com/fairseq2/whl/pt${TORCH_VER}/cpu" \
    && python -c "\
import torch; print('torch CPU final :', torch.__version__, '| cuda dispo :', torch.cuda.is_available()); \
import torchaudio; print('torchaudio CPU final :', torchaudio.__version__); \
import fairseq2n, fairseq2; print('fairseq2n/fairseq2 CPU final : ok')"

# pyarrow (dépendance transitive d'omnilingual-asr, chargée via
# omnilingual_asr.datasets.* dès qu'on importe ASRInferencePipeline) exige
# NumPy >= 2.0 À L'EXÉCUTION — mais sans le déclarer comme dépendance pip
# (requires_dist vide côté pyarrow), donc invisible pour le résolveur. À
# l'inverse, fairseq2 0.5.2/0.6 (la version exacte qu'omnilingual-asr exige)
# déclare lui "numpy~=1.23" dans ses métadonnées pip, strictement
# incompatible avec un pin numpy>=2.0 dans requirements.txt (confirmé :
# pip échoue alors avec ResolutionImpossible dès `pip install -r
# requirements.txt`, avant même d'atteindre le swap CPU ci-dessus). En
# pratique ce pin de fairseq2 est trop strict : fairseq2n/fairseq2
# fonctionnent très bien avec NumPy 2.x (vérifié ci-dessous). Fix, dans le
# même esprit que le swap torch/fairseq2n plus haut : laisser numpy non
# pinné dans requirements.txt (la résolution choisit alors librement, sans
# jamais buter sur la contrainte stricte de fairseq2 — ex. numpy 1.26.4),
# puis forcer numpy vers >=2.0 ICI, après coup, avec --no-deps (contourne
# le conflit déclaré mais pas réel). Sans ce fix, le service démarre et le
# TTS fonctionne, mais l'ASR échoue systématiquement à l'import avec
# "ImportError: pyarrow requires NumPy 2.0 or newer, found 1.26.4".
RUN pip install --no-cache-dir --force-reinstall --no-deps "numpy>=2.0,<2.6" \
    && python -c "\
import numpy; print('numpy CPU final :', numpy.__version__); \
import pyarrow; print('pyarrow final :', pyarrow.__version__)"

# Vérification BLOQUANTE (pas de `|| true`) de l'import complet d'omnilingual_asr,
# en particulier sa chaîne omnilingual_asr -> .datasets -> .datasets.impl.
# mixture_parquet_asr_dataset -> .datasets.storage.mixture_parquet_storage
# -> pyarrow (voir le fix numpy ci-dessus). Avant ce fix, ce même import,
# dans le bloc best-effort plus bas (qui avale toute erreur avec `|| true`
# pour ne pas bloquer le build si le registre de poids est indisponible),
# échouait silencieusement : le build "réussissait" quand même et expédiait
# une image où l'ASR ne démarre jamais (TTS seul fonctionnait). En isolant
# cet import ici, SANS `|| true`, toute régression équivalente (numpy ou
# autre) fait échouer le build au lieu d'être masquée.
RUN python -c "\
from omnilingual_asr.models.inference.pipeline import ASRInferencePipeline; \
print('omnilingual_asr (chaîne d\'import complète, incl. datasets/pyarrow) : ok')"

COPY app.py /srv/app.py

# Pré-téléchargement best-effort au build (ASR Apache-2.0, TTS CC-BY-NC — voir
# README.md). Si le registre des assets est indisponible pendant le build,
# ce n'est pas fatal : le service retentera au premier démarrage. L'IMPORT
# lui-même est déjà vérifié de façon bloquante ci-dessus ; seul le
# téléchargement des poids reste best-effort ici.
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
