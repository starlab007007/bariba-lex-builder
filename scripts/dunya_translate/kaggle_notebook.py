"""Génère le notebook Kaggle (kit d'entraînement DUNYA) : python kaggle_notebook.py > notebook.ipynb"""
import json

cells = [
 ("markdown", "# FITILA — entraînement du traducteur FR ↔ Baatɔnum (ByT5)\n"
  "Kaggle : *Accelerator* = GPU T4 x2 ou P100, *Internet* = On. Ajoutez le dataset `dunya-translate-kit` (le zip fourni).\n"
  "Optionnel : secret Kaggle `HF_TOKEN` pour repartir des poids v03 (sinon `google/byt5-small`)."),
 ("code", "# 1) Trouver le kit, où que Kaggle l'ait monté (/kaggle/input/<slug>/ ou /kaggle/input/datasets/<user>/<slug>/...)\n"
  "import os, glob, shutil\n"
  "hits = glob.glob('/kaggle/input/**/scripts/dunya_translate/train_byt5.py', recursive=True)\n"
  "assert hits, 'Kit introuvable : ajoutez le dataset dunya-translate-kit (panneau Input > Add Input).'\n"
  "src = hits[0].rsplit('/scripts/', 1)[0]\n"
  "ROOT = '/kaggle/working/kit'\n"
  "shutil.rmtree(ROOT, ignore_errors=True)\n"
  "shutil.copytree(src, ROOT)  # /kaggle/input est en lecture seule : on travaille sur une copie\n"
  "print('kit :', src, '->', ROOT)\n"
  "print(sorted(os.listdir(ROOT)))"),
 ("code", "# 2) Dépendances, GPU, modèle de départ\n"
  "!pip -q install transformers sentencepiece accelerate sacrebleu\n"
  "import torch\n"
  "print('GPU :', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'AUCUN (activez Accelerator = GPU T4 x2)')\n"
  "os.chdir(ROOT + '/scripts/dunya_translate')\n"
  "try:\n"
  "    from kaggle_secrets import UserSecretsClient\n"
  "    os.environ['HF_TOKEN'] = UserSecretsClient().get_secret('HF_TOKEN')\n"
  "except Exception:\n"
  "    pass\n"
  "MODEL = 'zimesongbian/modele_byt5_bariba_expert_api_v03_improve' if os.environ.get('HF_TOKEN') else 'google/byt5-small'\n"
  "LR = '1e-4' if os.environ.get('HF_TOKEN') else '3e-4'\n"
  "print('modèle de départ :', MODEL)"),
 ("code", "!python -m unittest test_pipeline 2>&1 | tail -3\n!python make_training_data.py"),
 ("markdown", "## 1. Fine-tuning supervisé (indices mémoire + glossaire, Apprendre multitâche)"),
 ("code", "!python train_byt5.py --model $MODEL --out /kaggle/working/v04 --epochs 6 --lr $LR --batch 8 --accum 4"),
 ("markdown", "## 2. Renforcement : exemples difficiles puis préférences (DPO)"),
 ("code", "!python mine_hard_examples.py --model /kaggle/working/v04 --samples 6 --limit 4000\n"
  "!python dpo.py --model /kaggle/working/v04 --out /kaggle/working/v04-dpo --epochs 1 --batch 8"),
 ("markdown", "## 3. Mesure sur le jeu de test (mémoire = train seulement)"),
 ("code", "!python eval_translation.py --backend hf --model /kaggle/working/v04 --rag --out /kaggle/working/eval_v04_rag.json | head -40\n"
  "!python eval_translation.py --backend hf --model /kaggle/working/v04-dpo --rag --out /kaggle/working/eval_v04_dpo_rag.json | head -40"),
 ("markdown", "## 4. Export ONNX hors ligne + archive à télécharger\nComparer chrF++ avec la ligne de base v03 (26,0 FR→BA / 23,6 BA→FR avec autocorrection ; 26,6 / 26,9 brut)."),
 ("code", "!pip -q install onnx onnxruntime\n"
  "!python ../dunya_byt5/export_byt5_onnx.py --model /kaggle/working/v04-dpo --out /kaggle/working/onnx --sample 'fr-ba: Bonjour' --sample 'ba-fr: A kua'\n"
  "!cd /kaggle/working && zip -qr dunya-translate-result.zip v04-dpo onnx eval_*.json && ls -la dunya-translate-result.zip"),
]
nb = {"cells": [{"cell_type": t, "metadata": {}, "source": s.splitlines(True), **({"outputs": [], "execution_count": None} if t == "code" else {})} for t, s in cells],
      "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}}, "nbformat": 4, "nbformat_minor": 5}
print(json.dumps(nb, ensure_ascii=False, indent=1))
