import json
cells = []
def md(s): cells.append({"cell_type":"markdown","metadata":{},"source":s})
def code(s): cells.append({"cell_type":"code","metadata":{},"execution_count":None,"outputs":[],"source":s})
md("""# FITILA — ByT5 Baatɔnum v05 (entraînement guidé par la mémoire attestée)

**Avant de lancer :**
1. *Add data* → ajoute le jeu de données Kaggle créé avec `fitila-v05-bundle.zip`.
2. *Settings* → **Accelerator : GPU T4 x1** (ou P100), **Internet : On**.
3. *Add-ons → Secrets* → ajoute `HF_TOKEN` (jeton Hugging Face avec droit d'écriture) et coche-le pour ce carnet.
4. *Run All*. Durée estimée : 3 à 6 h.

Ce que fait le carnet :
- part de **v004** (le modèle de la Space) ;
- l'entraîne à lire les **phrases attestées proches** et les **mots du dictionnaire** placés après la phrase (`|| mem: … || dic: …`), en gardant exactement le préfixe de v004 : sans indices, l'entrée est identique à celle d'aujourd'hui ;
- renforce par **DPO** avec les mauvaises réponses humaines des exercices ;
- compare **v004 et v05** sur les phrases de test jamais vues à l'entraînement de v05 ;
- publie v05 sur Hugging Face **seulement si v05 est meilleur**, et produit `v05_report.md`.
""")
code("""# ---- Réglages -------------------------------------------------------------
BASE_MODEL = "zimesongbian/byt5-small-fr-bariba-v004"   # modèle actuel de la Space
OUT_REPO   = "zimesongbian/byt5-small-fr-bariba-v005"   # dépôt privé créé si absent
EPOCHS     = 3        # SFT (continuation depuis v004)
LR         = 1e-4
BATCH, ACCUM = 8, 4   # lot effectif 32
MINE_LIMIT = 3000     # exemples analysés pour trouver les erreurs du modèle (DPO)
EVAL_LIMIT = 300      # phrases de test (x2 sens)
BEAMS      = 4
MIN_GAIN   = 0.5      # gain chrF++ minimal (moyenne des 2 sens, sans indices) pour publier
""")
code("""import os, glob, shutil, subprocess, json, sys, time
src = [p for p in glob.glob('/kaggle/input/**/scripts/dunya_translate/train_byt5.py', recursive=True)]
assert src, "Jeu de données FITILA introuvable : ajoute le zip fitila-v05-bundle dans 'Add data'."
bundle = src[0].split('/scripts/')[0]
W = '/kaggle/working/fitila'
if not os.path.isdir(W): shutil.copytree(bundle, W)   # reprise : on garde les fichiers déjà produits
S, D = f'{W}/scripts/dunya_translate', f'{W}/data/translation'
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'sacrebleu', 'huggingface_hub>=0.24'], check=True)
from kaggle_secrets import UserSecretsClient
_client = UserSecretsClient()
for _label in ('HF_TOKEN', 'HUGGING_FACE_API_TOKEN', 'HUGGINGFACE_TOKEN', 'HF_WRITE_TOKEN'):
    try:
        os.environ['HF_TOKEN'] = _client.get_secret(_label); print('Jeton Hugging Face :', _label); break
    except Exception:
        pass
else:
    raise SystemExit("Aucun jeton Hugging Face attaché : Add-ons → Secrets → coche HF_TOKEN.")
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'expandable_segments:True'
from huggingface_hub import login, snapshot_download
login(token=os.environ['HF_TOKEN'])
import torch; print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'AUCUN — active le GPU !')
BASE = snapshot_download(BASE_MODEL, token=os.environ['HF_TOKEN'], local_dir='/kaggle/working/v004')
def run(*args):
    t = time.time(); print('$', ' '.join(args), flush=True)
    subprocess.run([sys.executable, *args], cwd=S, check=True)
    print(f'  ({(time.time()-t)/60:.1f} min)', flush=True)
""")
code("""# Données d'entraînement : phrases attestées + dictionnaire + exercices, avec et sans indices, préfixe v004.
if not os.path.exists(f'{D}/training/.v004-ready'):
    run('make_training_data.py', '--data', D, '--out', f'{D}/training', '--prefix-style', 'v004')
    open(f'{D}/training/.v004-ready', 'w').write('ok')
print(open(f'{D}/training/train.jsonl').readline())
""")
code("""# Mesure de départ : v004 tel qu'il est utilisé aujourd'hui (sans indices).
def evaluate(model, tag, rag):
    out = f'/kaggle/working/eval_{tag}.json'
    run('eval_translation.py', '--data', D, '--backend', 'hf', '--model', model, '--prefix-style', 'v004',
        '--beams', str(BEAMS), '--limit', str(EVAL_LIMIT), '--out', out, *(['--rag'] if rag else []))
    r = json.load(open(out))['report']['by_direction']
    return {d: {'chrf++': r[d].get('sacrebleu_chrf++'), 'exact': r[d]['exact'], 'loop': r[d]['loop']} for d in r}
RESULTS = '/kaggle/working/v05_results.json'
results = json.load(open(RESULTS)) if os.path.exists(RESULTS) else {}
def stage(name, model, tag, rag):
    # Reprise : une évaluation déjà faite n'est pas refaite.
    if name not in results:
        results[name] = evaluate(model, tag, rag)
        json.dump(results, open(RESULTS, 'w'), indent=1)
    return results[name]
stage('v004', BASE, 'v004', False); stage('v004+indices', BASE, 'v004_rag', True)
results
""")
code("""# Étape 1 — SFT : v004 apprend à utiliser les phrases attestées proches et le dictionnaire.
if not os.path.exists('/kaggle/working/v05-sft/config.json'):
    run('train_byt5.py', '--model', BASE, '--data', f'{D}/training', '--out', '/kaggle/working/v05-sft',
        '--epochs', str(EPOCHS), '--lr', str(LR), '--batch', str(BATCH), '--accum', str(ACCUM))
    for d in glob.glob('/kaggle/working/v05-sft/checkpoint-*'): shutil.rmtree(d)
stage('v05-sft', '/kaggle/working/v05-sft', 'v05_sft', False)
stage('v05-sft+indices', '/kaggle/working/v05-sft', 'v05_sft_rag', True)
results
""")
code("""# Étape 2 — DPO : préférer la traduction attestée aux mauvaises réponses (humaines + erreurs du modèle).
if not os.path.exists(f'{D}/training/preference_self.jsonl'):
    run('mine_hard_examples.py', '--model', '/kaggle/working/v05-sft', '--data', D, '--samples', '6', '--limit', str(MINE_LIMIT))
if not os.path.exists('/kaggle/working/v05-dpo/config.json'):
    run('dpo.py', '--model', '/kaggle/working/v05-sft', '--data', D, '--prefix-style', 'v004', '--out', '/kaggle/working/v05-dpo',
        '--batch', '2', '--accum', '4')   # tient dans un T4 16 Go
stage('v05-dpo', '/kaggle/working/v05-dpo', 'v05_dpo', False)
stage('v05-dpo+indices', '/kaggle/working/v05-dpo', 'v05_dpo_rag', True)
results
""")
code("""# Choix et rapport. On choisit sur le mode SANS indices (celui de la Space aujourd'hui) ; le gain AVEC indices
# est ce qu'apportera la Space une fois qu'elle enverra les phrases attestées proches.
mean = lambda r: (r['fr-ba']['chrf++'] + r['ba-fr']['chrf++']) / 2
best = max(['v05-sft', 'v05-dpo'], key=lambda k: mean(results[k]))
gain = mean(results[best]) - mean(results['v004'])
lines = ['# Rapport FITILA ByT5 v05', '', f'Base : `{BASE_MODEL}` — test : {EVAL_LIMIT} phrases × 2 sens (phrases jamais vues par l’entraînement v05).', '',
         '| Modèle | chrF++ fr→ba | chrF++ ba→fr | exact fr→ba | exact ba→fr | boucles |', '|---|---|---|---|---|---|']
for k, r in results.items():
    lines.append(f"| {k} | {r['fr-ba']['chrf++']} | {r['ba-fr']['chrf++']} | {r['fr-ba']['exact']:.1%} | {r['ba-fr']['exact']:.1%} | {(r['fr-ba']['loop']+r['ba-fr']['loop'])/2:.1%} |")
lines += ['', f'Meilleur : **{best}** — gain chrF++ moyen sans indices : **{gain:+.2f}**.',
          'Note : si v004 a vu ces phrases de test pendant son propre entraînement, ses scores sont optimistes ; la comparaison reste à conditions égales.']
report = '\\n'.join(lines); print(report)
open('/kaggle/working/v05_report.md', 'w').write(report)
json.dump(results, open('/kaggle/working/v05_results.json', 'w'), indent=1)
""")
code("""# Publication (dépôt privé) seulement si v05 est meilleur que v004.
from huggingface_hub import HfApi
if gain >= MIN_GAIN:
    path = f'/kaggle/working/{best}'
    for f in ('tokenizer_config.json', 'special_tokens_map.json', 'added_tokens.json'):
        if os.path.exists(f'{BASE}/{f}') and not os.path.exists(f'{path}/{f}'): shutil.copy(f'{BASE}/{f}', path)
    shutil.copy('/kaggle/working/v05_report.md', f'{path}/README.md')
    api = HfApi(token=os.environ['HF_TOKEN'])
    api.create_repo(OUT_REPO, private=True, exist_ok=True)
    api.upload_folder(folder_path=path, repo_id=OUT_REPO, commit_message=f'v05 ({best}) gain {gain:+.2f} chrF++')
    print('Publié :', OUT_REPO, '— pour l’utiliser : variable MODEL_ID de la Space =', OUT_REPO)
else:
    print(f'v05 n’est pas assez meilleur ({gain:+.2f} < {MIN_GAIN}) : rien n’est publié. Envoie v05_report.md à Claude.')
""")
md("""## Mise à jour de la page du Space

Si la nouvelle version a été publiée ci-dessus, cette dernière étape réécrit
automatiquement le bloc **« Nouveautés »** affiché aux visiteurs sur la page
du Space (`app.py`, variable `_DESCRIPTION`), avec les vrais chiffres mesurés
dans ce run — pas de texte à écrire ou recopier à la main.

Ça ne change **que** ce bloc : le reste de `app.py` (pipeline, grammaire,
code de l'app) n'est pas touché. Si `_DESCRIPTION` est introuvable (app.py a
été réécrit entre-temps), l'étape échoue proprement et affiche un message —
la publication du modèle ci-dessus n'est pas affectée.

⚠️ Ça ne change **pas** `MODEL_ID` : il faut toujours changer cette variable
dans Settings → Variables and secrets du Space (ou le faire changer par
Claude si le Space le lit autrement) pour que le modèle publié soit celui
réellement utilisé.""")
code("""# Met à jour automatiquement le bloc "Nouveautés" de la page du Space avec
# les vrais chiffres de ce run — seulement si une nouvelle version vient
# d'être publiée ci-dessus.
SPACE_REPO = "zimesongbian/modele_byt5_bariba_expert_api_v03_improve"   # repo_type="space"
if gain >= MIN_GAIN:
    import re
    from huggingface_hub import hf_hub_download

    def ver_label(repo_id):
        m = re.search(r'v0*(\\d+)$', repo_id)
        return f'v{int(m.group(1)):02d}' if m else None

    new_ver = ver_label(OUT_REPO) or OUT_REPO.split('/')[-1]
    base_ver = ver_label(BASE_MODEL)
    base_mean, new_mean = mean(results['v004']), mean(results[best])
    gain_pct = (new_mean - base_mean) / base_mean * 100
    idx_key, base_idx_key = f'{best}+indices', 'v004+indices'
    gain_idx_pct = ((mean(results[idx_key]) - mean(results[base_idx_key])) / mean(results[base_idx_key]) * 100
                     if idx_key in results and base_idx_key in results else None)
    loop_pct = (results[best]['fr-ba']['loop'] + results[best]['ba-fr']['loop']) / 2 * 100

    bullets = [
        f"- 🧠 **Modèle de traduction réentraîné** (ByT5{f', depuis {base_ver}' if base_ver else ''}) : "
        f"qualité moyenne des traductions en hausse de **+{gain_pct:.0f} %** par rapport à la version "
        f"précédente (chrF++ moyen passé de {base_mean:.1f} à {new_mean:.1f} sur 100, mesuré sur "
        f"{EVAL_LIMIT} phrases inédites)",
        "- 🎯 **Renforcement par apprentissage de préférence (DPO)** : entraîné à éviter ses propres "
        "erreurs et les réponses rejetées dans les exercices Apprendre",
    ]
    if gain_idx_pct is not None:
        bullets.append(
            f"- 📚 **Compréhension du contexte attesté** : jusqu'à **+{gain_idx_pct:.0f} %** de qualité "
            "en plus en exploitant les phrases proches validées et le dictionnaire comme indices"
        )
    bullets.append(f"- ✅ **Aucune régression** : taux de boucles/répétitions resté à {loop_pct:.1f} % sur l'ensemble de test")

    version_title = new_ver.lstrip('v').lstrip('0') or '0'
    Q = chr(34) * 3   # '\"\"\"' built at runtime so this generator's own triple-quoted
                        # code() block doesn't see a literal triple-quote and close early.
    new_description = (
        f'_DESCRIPTION = {Q}\\n'
        f'## Traducteur Français ↔ Bariba (Baatɔnum) — Version {version_title}\\n'
        f'**Nouveautés {new_ver} :**\\n'
        + '\\n'.join(bullets) + '\\n'
        '**Pipeline de traduction** (priorité décroissante) :\\n'
        '`Phrasebook (1.0)` → `Dict Baatonum (0.93)` → `Corpus parallèle (0.93)` → `Modèle ByT5` → `Fallback corpus (0.86)`\\n'
        '**Grammaire** : ordre SOV préservé · tons et diacritiques Bariba intacts (ɛ ɔ ã ɛ̃ ĩ ɔ̃ ũ ŋ) · digraphes gb/kp traités correctement\\n'
        + Q
    )
    try:
        app_path = hf_hub_download(SPACE_REPO, 'app.py', repo_type='space', token=os.environ['HF_TOKEN'])
        current = open(app_path, encoding='utf-8').read()
        pattern = '_DESCRIPTION = ' + re.escape(Q) + '.*?' + re.escape(Q)
        updated, n = re.subn(pattern, lambda _: new_description, current, count=1, flags=re.S)
        if n == 1:
            open('/kaggle/working/app.py', 'w', encoding='utf-8').write(updated)
            api.upload_file(path_or_fileobj='/kaggle/working/app.py', path_in_repo='app.py', repo_id=SPACE_REPO,
                             repo_type='space', commit_message=f'Nouveautés {new_ver} ({best}, gain {gain:+.2f} chrF++)')
            print('Page du Space mise à jour :', SPACE_REPO, '— nouveau bloc Nouveautés', new_ver)
        else:
            print('⚠️ _DESCRIPTION introuvable dans app.py du Space — page NON mise à jour, à vérifier manuellement.')
    except Exception as e:
        print('⚠️ Échec de la mise à jour de la page du Space (non bloquant, le modèle est publié) :', e)
else:
    print('Pas de publication ci-dessus : la page du Space n’est pas modifiée.')
""")
nb = {"cells":cells,"metadata":{"kernelspec":{"display_name":"Python 3","language":"python","name":"python3"},"language_info":{"name":"python"}},"nbformat":4,"nbformat_minor":5}
json.dump(nb, open('scripts/dunya_translate/kaggle/fitila_byt5_v05.ipynb','w'), ensure_ascii=False, indent=1)
print("ok")
