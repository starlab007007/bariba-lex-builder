"""Recherche de phrases attestées.
Usage : python3 search.py --fr "regex" [--ba "regex"] [--max 40] [--expr]
  --fr   regex (insensible à la casse) sur la traduction française
  --ba   regex sur la phrase bariba
  --expr cherche aussi les expressions-entrées (salutations, locutions)
Sortie : REF | p.PAGE | statut | BA || FR
"""
import argparse, re
from corpus import load
ap = argparse.ArgumentParser()
ap.add_argument('--fr'); ap.add_argument('--ba'); ap.add_argument('--max', type=int, default=40)
ap.add_argument('--expr', action='store_true')
a = ap.parse_args()
ex, heads = load()
pool = ex + (heads if a.expr else [])
n = 0
for x in pool:
    if a.fr and not re.search(a.fr, x['fr'], re.I):
        continue
    if a.ba and not re.search(a.ba, x['ba'], re.I):
        continue
    tag = 'EXPR' if x in heads else 'EX'
    print(f"{x['ref']} | p.{x['page']} | {x['status']} | {tag} | {x['ba']} || {x['fr']}")
    n += 1
    if n >= a.max:
        break
print(f'-- {n} résultat(s)')
