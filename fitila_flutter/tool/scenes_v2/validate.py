"""Valide un fichier de scènes : chaque réplique bariba doit exister telle quelle
dans le dictionnaire (exemple ou expression-entrée). Complète src, ref, status.
Usage : python3 validate.py fichier.json [--fix]
"""
import json, sys
from corpus import load, key, nfc
ex, heads = load()
by_ba = {}
for x in ex + heads:
    by_ba.setdefault(key(x['ba']), []).append(x)
path = sys.argv[1]; fix = '--fix' in sys.argv
data = json.load(open(path))
errors, notes, total = [], [], 0
for sc in data.get('scenes', []):
    if not 8 <= len([l for l in sc['lines'] if l.get('ba')]) <= 16:
        notes.append(f"{sc['id']}: {len([l for l in sc['lines'] if l.get('ba')])} répliques bariba (attendu 8-16)")
    for i, l in enumerate(sc['lines']):
        if not l.get('ba'):
            if l.get('who') != 'narrator':
                errors.append(f"{sc['id']}#{i}: ligne sans bariba qui n'est pas une narration")
            continue
        total += 1
        cands = by_ba.get(key(l['ba']))
        if not cands:
            errors.append(f"{sc['id']}#{i}: NON ATTESTÉ « {l['ba']} »")
            continue
        c = next((c for c in cands if c['ref'] == l.get('ref')), cands[0])
        if fix:
            l['ba'] = c['ba']; l['src'] = f"p. {c['page']}"; l['ref'] = c['ref']; l['status'] = c['status']
            l.setdefault('fr', c['fr'])
            if nfc(l['fr']) != c['fr']:
                l['fr_source'] = c['fr']
        if nfc(l.get('fr', '')) != c['fr']:
            notes.append(f"{sc['id']}#{i}: FR adapté « {l.get('fr')} » ← « {c['fr']} »")
    for v in sc.get('vocab', []):
        pass
if fix:
    json.dump(data, open(path, 'w'), ensure_ascii=False, indent=1)
print(f"{len(data.get('scenes', []))} scènes, {total} répliques bariba, {len(errors)} erreur(s)")
for e in errors: print('ERREUR', e)
for n in notes: print('NOTE  ', n)
sys.exit(1 if errors else 0)
