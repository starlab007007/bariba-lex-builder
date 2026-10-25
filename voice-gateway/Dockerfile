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
# indéfiniment.
#
# Deux essais précédents ont échoué :
#  1) Installer torch CPU AVANT requirements.txt ne suffit pas : la
#     commande suivante réévalue tout le graphe depuis PyPI et réinstalle
#     silencieusement la variante CUDA pour satisfaire la contrainte de
#     torch d'omnilingual-asr/fairseq2 (confirmé : pip show torch donnait
#     2.8.0+cu128).
#  2) Épingler la version CPU installée (via un fichier de contraintes)
#     échoue aussi : sans numéro de version précisé, l'index CPU installe
#     la plus récente disponible (2.14.1+cpu), alors que fairseq2n exige
#     torch==2.8.0 pile (extension compilée, ABI figée) — conflit
#     "ResolutionImpossible" au lieu d'un remplacement silencieux.
#
# Solution robuste : laisser pip résoudre requirements.txt normalement
# (il choisit lui-même la version exacte de torch dont fairseq2n a
# besoin, build CUDA par défaut), puis remplacer SEULEMENT les paquets
# torch par le build CPU de cette MÊME version exacte (--no-deps : les
# autres paquets déjà résolus, dont fairseq2n, ne sont pas retouchés).
# S'adapte automatiquement si la version exigée change dans le futur.
#
# Un essai précédent (torch seul) a démarré le service mais l'ASR
# échouait encore avec la même erreur libcudart.so.13 — cette fois dans
# l'extension compilée de `torchaudio` (import de omnilingual_asr), pas
# dans torch lui-même : torchaudio a sa PROPRE extension C (_torchaudio)
# liée au runtime CUDA au moment de son build, indépendante de torch.
# Remplacer torch sans remplacer torchaudio laisse cette extension
# pointer vers un runtime CUDA qui n'est plus installé. Il faut donc
# remplacer torch ET torchaudio ensemble, dans le même appel pip (pour
# que pip choisisse des wheels CPU mutuellement compatibles).
#
# Un essai suivant (torch+torchaudio, mais version lue via `import
# torchaudio`) a aussi échoué : `import torchaudio` échoue DÉJÀ avec
# libcudart.so.13 au moment même de lire sa version (son extension
# native CUDA se charge dès l'import), donc TORCHAUDIO_VER finissait
# vide (erreur avalée par `2>/dev/null || true`) et le force-reinstall
# sautait silencieusement torchaudio — laissant le build CUDA cassé en
# place. `pip show` lit les métadonnées du paquet sans jamais importer
# son extension native, donc il fonctionne même quand l'import échoue.
#
# Un essai suivant encore (torch+torchaudio via pip show, mais chacun à
# SA PROPRE version résolue par requirements.txt — torch==2.8.0 et
# torchaudio==2.11.0, des lignes de version très différentes) a échoué
# différemment : build CPU réussi pour les deux, mais import de
# torchaudio en erreur avec "undefined symbol: torch_library_impl" —
# un désaccord d'ABI entre les deux wheels CPU, confirmé par un
# diagnostic reproduisant l'environnement exact (conteneur
# python:3.11-slim). torch et torchaudio sont censés être installés en
# lockstep (même numéro de version) ; la version de torchaudio résolue
# seule par une contrainte large d'omnilingual-asr/transformers n'est
# pas forcément celle réellement compatible ABI avec CE torch. Forcer
# torchaudio à la MÊME version que torch (au lieu de sa propre version
# résolue) règle le problème — confirmé par le même diagnostic.
RUN pip install --no-cache-dir -r requirements.txt
RUN TORCH_VER="$(pip show torch | grep -i '^Version:' | awk '{print $2}' | cut -d'+' -f1)" \
    && echo "résolu par requirements.txt : torch=${TORCH_VER} — remplacement (torch+torchaudio en lockstep) par les builds CPU" \
    && pip install --no-cache-dir --force-reinstall --no-deps \
         "torch==${TORCH_VER}" "torchaudio==${TORCH_VER}" \
         --index-url https://download.pytorch.org/whl/cpu \
    && python -c "\
import torch; print('torch CPU final :', torch.__version__, '| cuda dispo :', torch.cuda.is_available()); \
import torchaudio; print('torchaudio CPU final :', torchaudio.__version__)"

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
