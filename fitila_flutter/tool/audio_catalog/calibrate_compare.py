"""Calibrage des seuils de comparaison de voix à partir de voix validées.

Entrée : un CSV « fichier_a,fichier_b,meme_texte » (meme_texte = 1 ou 0) listant
des paires de prises WAV approuvées (téléchargées depuis le bucket apprendre-audio) :
  * meme_texte = 1 : deux locuteurs différents disent le même texte ;
  * meme_texte = 0 : deux textes différents (même longueur approximative).

Sortie : valeurs proposées pour compare_mfcc_good et compare_mfcc_bad, à saisir
dans l'administration (Voix Apprendre › Paramètres).
Règle : « identique » = 75e centile des distances entre deux natifs du même texte ;
« très différent » = 25e centile des distances entre textes différents.

Usage : python3 calibrate_compare.py paires.csv
"""
import csv, sys

from voice_compare_reference import dtw, mfcc, read_wav, trim


def distance(a, b):
    fa, fb = mfcc(trim(read_wav(a))), mfcc(trim(read_wav(b)))
    if len(fa) < 5 or len(fb) < 5:
        return None
    return dtw(fa, fb)[0]


def percentile(values, p):
    values = sorted(values)
    k = (len(values) - 1) * p / 100
    lo, hi = int(k), min(int(k) + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (k - lo)


def main(path):
    same, diff = [], []
    with open(path) as fh:
        for row in csv.reader(fh):
            if not row or row[0].startswith('#'):
                continue
            d = distance(row[0], row[1])
            if d is None:
                continue
            (same if row[2].strip() == '1' else diff).append(d)
            print(f'{d:6.2f}  {row[2].strip()}  {row[0]} ~ {row[1]}')
    if len(same) < 10 or len(diff) < 10:
        raise SystemExit('Il faut au moins 10 paires de chaque sorte.')
    good, bad = percentile(same, 75), percentile(diff, 25)
    print(f'\nMême texte : médiane {percentile(same, 50):.2f} · 75e centile {good:.2f} ({len(same)} paires)')
    print(f'Textes différents : médiane {percentile(diff, 50):.2f} · 25e centile {bad:.2f} ({len(diff)} paires)')
    if bad <= good:
        print('Attention : les deux groupes se chevauchent ; vérifier la qualité des prises.')
    print(f'\ncompare_mfcc_good = {good:.1f}\ncompare_mfcc_bad  = {max(bad, good + 1):.1f}')


if __name__ == '__main__':
    main(sys.argv[1])
