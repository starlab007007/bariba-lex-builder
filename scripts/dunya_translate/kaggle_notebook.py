"""Génère le notebook Kaggle (kit d'entraînement DUNYA) : python kaggle_notebook.py > notebook.ipynb

Parcours : v03 (privé, via HF_TOKEN) -> mesure de départ -> fine-tuning -> exemples difficiles -> DPO
-> mesure finale sur les mêmes phrases -> publication dans un NOUVEAU dépôt privé seulement si
le nouveau modèle bat v03 -> export ONNX hors ligne -> archive.
"""
import json

V03 = "zimesongbian/modele_byt5_bariba_expert_api_v03_improve"
NEW_REPO = "zimesongbian/byt5-bariba-fitila-v04"

cells = [
 ("markdown", "# FITILA — réentraînement du traducteur FR ↔ Baatɔnum à partir de v03\n"
  "Réglages Kaggle : *Accelerator* = **GPU T4 x2**, *Internet* = **On**, dataset **dunya-translate-kit** ajouté, "
  "secret **HF_TOKEN** (token *Write* Hugging Face) attaché. Lancer avec **Save Version → Save & Run All**.\n\n"
  f"Le modèle en production (`{V03}`) n'est jamais modifié : le nouveau modèle va dans `{NEW_REPO}` "
  "uniquement s'il fait mieux sur les mêmes phrases de test."),
 ("code", "# 1) Kit, GPU, jeton\n"
  "import os, glob, shutil, json\n"
  "hits = glob.glob('/kaggle/input/**/scripts/dunya_translate/train_byt5.py', recursive=True)\n"
  "assert hits, 'Kit introuvable : ajoutez le dataset dunya-translate-kit (Input > Add Input).'\n"
  "ROOT = '/kaggle/working/kit'\n"
  "shutil.rmtree(ROOT, ignore_errors=True)\n"
  "shutil.copytree(hits[0].rsplit('/scripts/', 1)[0], ROOT)\n"
  "!pip -q install transformers sentencepiece accelerate sacrebleu huggingface_hub\n"
  "import torch\n"
  "assert torch.cuda.is_available(), 'Pas de GPU : Settings > Accelerator > GPU T4 x2'\n"
  "print('GPU :', torch.cuda.get_device_name(0))\n"
  "from kaggle_secrets import UserSecretsClient\n"
  "os.environ['HF_TOKEN'] = UserSecretsClient().get_secret('HF_TOKEN')\n"
  "os.chdir(ROOT + '/scripts/dunya_translate')\n"
  f"V03, NEW_REPO = '{V03}', '{NEW_REPO}'\n"
  "N_TEST = 200  # mêmes phrases pour v03 et pour le nouveau modèle"),
 ("code", "# 2) Accès à v03 (échoue tout de suite si le jeton ne peut pas lire le dépôt privé)\n"
  "from transformers import AutoConfig\n"
  "cfg = AutoConfig.from_pretrained(V03)\n"
  "print('v03 accessible :', cfg.model_type, '| couches', cfg.num_layers, '/', cfg.num_decoder_layers)"),
 ("code", "# 3) Données (vérifications puis jeu d'entraînement)\n"
  "!python -m unittest test_pipeline 2>&1 | tail -3\n"
  "!python make_training_data.py"),
 ("markdown", "## Mesure de départ : v03 sur les phrases de test"),
 ("code", "!python eval_translation.py --backend hf --model $V03 --limit $N_TEST --out /kaggle/working/eval_v03.json | head -30"),
 ("markdown", "## Fine-tuning à partir de v03 (taux d'apprentissage bas pour ne pas lui faire oublier ce qu'il sait)"),
 ("code", "!python train_byt5.py --model $V03 --out /kaggle/working/v04 --epochs 4 --lr 1e-4 --batch 8 --accum 4"),
 ("markdown", "## Renforcement : exemples difficiles puis préférences (DPO)"),
 ("code", "!python mine_hard_examples.py --model /kaggle/working/v04 --samples 6 --limit 4000\n"
  "!PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True python dpo.py --model /kaggle/working/v04 --out /kaggle/working/v04-dpo --epochs 1 --batch 2 --accum 4\n"
  "candidates = [p for p in ['/kaggle/working/v04-dpo', '/kaggle/working/v04'] if os.path.exists(p + '/config.json')]\n"
  "print('candidats :', candidates)"),
 ("markdown", "## Mesure finale sur les mêmes phrases et choix du meilleur"),
 ("code", "for c in candidates:\n"
  "    name = os.path.basename(c)\n"
  "    !python eval_translation.py --backend hf --model {c} --limit $N_TEST --out /kaggle/working/eval_{name}.json | tail -3\n"
  "\n"
  "def score(path):\n"
  "    r = json.load(open(path))['report']['by_direction']\n"
  "    get = lambda d: r[d].get('sacrebleu_chrf++', 100 * r[d]['chrf'])\n"
  "    return get('fr-ba'), get('ba-fr')\n"
  "\n"
  "rows = {'v03': score('/kaggle/working/eval_v03.json')}\n"
  "for c in candidates:\n"
  "    rows[os.path.basename(c)] = score(f'/kaggle/working/eval_{os.path.basename(c)}.json')\n"
  "print(f\"{'modèle':10} {'FR→BA':>8} {'BA→FR':>8} {'moyenne':>8}\")\n"
  "for k, (a, b) in rows.items():\n"
  "    print(f'{k:10} {a:8.1f} {b:8.1f} {(a + b) / 2:8.1f}')\n"
  "best = max((k for k in rows if k != 'v03'), key=lambda k: sum(rows[k]), default=None)\n"
  "BEST = f'/kaggle/working/{best}' if best else None\n"
  "# Référence : v03 mesuré ici ET v03 mesuré en production le 13/10 (26,6 FR→BA, 26,9 BA→FR) ;\n"
  "# il faut battre le plus haut des deux d'au moins 0,5 chrF++ en moyenne.\n"
  "floor = max(sum(rows['v03']), 26.6 + 26.9)\n"
  "BETTER = bool(best) and sum(rows[best]) > floor + 1.0\n"
  "print('meilleur nouveau modèle :', best, '| bat v03 :', BETTER)\n"
  "json.dump({'scores': rows, 'best': best, 'better_than_v03': BETTER}, open('/kaggle/working/comparaison.json', 'w'), indent=1)"),
 ("markdown", f"## Publication dans `{NEW_REPO}` (privé) — seulement si le nouveau modèle bat v03"),
 ("code", "if BETTER:\n"
  "    from huggingface_hub import HfApi\n"
  "    from transformers import AutoTokenizer\n"
  "    dst = '/kaggle/working/hf-upload'\n"
  "    shutil.rmtree(dst, ignore_errors=True); os.makedirs(dst)\n"
  "    for f in ['config.json', 'generation_config.json', 'model.safetensors']:\n"
  "        if os.path.exists(f'{BEST}/{f}'): shutil.copy(f'{BEST}/{f}', dst)\n"
  "    AutoTokenizer.from_pretrained('google/byt5-small').save_pretrained(dst)\n"
  "    a, b = rows[best]; a3, b3 = rows['v03']\n"
  "    open(f'{dst}/README.md', 'w').write(\n"
  "        '# ByT5 FITILA — Français ↔ Baatɔnum\\n\\n'\n"
  "        'Affiné à partir de v03 sur le corpus FITILA (dictionnaire, Apprendre, scènes, exercices).\\n\\n'\n"
  "        'Entrée : `fr-ba: <texte français>` ou `ba-fr: <texte baatɔnum>`.\\n\\n'\n"
  "        f'chrF++ ({N_TEST} phrases de test) : FR→BA {a:.1f} (v03 {a3:.1f}), BA→FR {b:.1f} (v03 {b3:.1f}).\\n')\n"
  "    api = HfApi(token=os.environ['HF_TOKEN'])\n"
  "    api.create_repo(NEW_REPO, private=True, exist_ok=True)\n"
  "    api.upload_folder(folder_path=dst, repo_id=NEW_REPO, commit_message=f'{best} : FR→BA {a:.1f} / BA→FR {b:.1f}')\n"
  "    print('Publié : https://huggingface.co/' + NEW_REPO)\n"
  "else:\n"
  "    print('Pas de publication : le nouveau modèle ne bat pas v03. v03 reste en production.')"),
 ("markdown", "## Export ONNX (application hors ligne) et archive à télécharger"),
 ("code", "files = 'comparaison.json eval_*.json'\n"
  "if BEST:\n"
  "    !pip -q install onnx onnxruntime\n"
  "    !python ../dunya_byt5/export_byt5_onnx.py --model $BEST --out /kaggle/working/onnx --sample 'fr-ba: Bonjour' --sample 'ba-fr: A kua'\n"
  "    files += ' onnx'\n"
  "!cd /kaggle/working && zip -qr dunya-translate-result.zip $files && ls -la dunya-translate-result.zip"),
]
nb = {"cells": [{"cell_type": t, "metadata": {}, "source": s.splitlines(True), **({"outputs": [], "execution_count": None} if t == "code" else {})} for t, s in cells],
      "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}}, "nbformat": 4, "nbformat_minor": 5}
print(json.dumps(nb, ensure_ascii=False, indent=1))
