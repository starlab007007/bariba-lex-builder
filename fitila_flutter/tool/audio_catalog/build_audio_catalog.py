"""Catalogue des textes bariba du module Apprendre à doter d'une voix de référence.

Clé audio = « ap: » + empreinte FNV-1a 64 bits (hexadécimal) du texte normalisé.
Un texte identique (mot, exemple, réplique…) partage donc la même voix partout,
et un texte corrigé reçoit automatiquement une nouvelle clé.
La même fonction existe côté Flutter : lib/apprendre/apprendre_audio.dart (apAudioKey).

Usage : python3 tool/audio_catalog/build_audio_catalog.py [--out chemin.json]
Sortie par défaut : tool/audio_catalog/apprendre_audio_catalog.json, à importer
depuis l'administration web (onglet Voix Apprendre › Catalogue).
"""
import argparse, collections, json, os, re, unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FNV_OFFSET, FNV_PRIME, MASK = 0xcbf29ce484222325, 0x100000001b3, (1 << 64) - 1


def normalize(text):
    return re.sub(r'\s+', ' ', text or '').strip()


def fnv1a64(text):
    h = FNV_OFFSET
    for byte in text.encode('utf-8'):
        h ^= byte
        h = (h * FNV_PRIME) & MASK
    return f'{h:016x}'


def audio_key(text):
    return 'ap:' + fnv1a64(normalize(text))


# Plus le rang est petit, plus le texte est prioritaire à enregistrer.
KIND_RANK = {'lecon': 1, 'proverbe': 1, 'scene': 2, 'mot': 3, 'exemple': 5, 'forme': 6}


def build():
    a = json.load(open(os.path.join(ROOT, 'assets/data/apprendre_v2.json')))
    s = json.load(open(os.path.join(ROOT, 'assets/data/scenes_v2.json')))
    items = {}

    def add(text, kind, fr, page, ref, pack, priority):
        text = normalize(text)
        if not text:
            return
        if unicodedata.normalize('NFC', text) != text:
            raise SystemExit(f'Texte non NFC : {text!r} — normaliser le contenu avant.')
        key = audio_key(text)
        cur = items.get(key)
        entry = {'key': key, 'hash': key[3:], 'ba': text, 'fr': fr or '', 'kind': kind,
                 'page': str(page or ''), 'ref': ref or '', 'pack': pack, 'priority': priority, 'uses': 1}
        if cur is None:
            items[key] = entry
            return
        cur['uses'] += 1
        if (priority, KIND_RANK[kind]) < (cur['priority'], KIND_RANK[cur['kind']]):
            entry['uses'] = cur['uses']
            items[key] = entry

    def page_of(src):
        m = re.search(r'(\d+)', src or '')
        return m.group(1) if m else ''

    # Mots : les 600 plus fréquents d'abord.
    cards = sorted(a['cards'], key=lambda c: -c.get('f', 0))
    top = {c['id'] for c in cards[:600]}
    for c in a['cards']:
        pack = 'theme:' + (c['th'][0] if c.get('th') else 'divers')
        add(c['ba'], 'mot', c['fr'], c.get('p'), c['id'], pack, 2 if c['id'] in top else 4)
        for form in [c.get('pl'), c.get('foc')] + list((c.get('conj') or {}).values()):
            if form:
                add(form, 'forme', c['fr'], c.get('p'), c['id'], pack, 6)
        if c.get('ex_ba'):
            add(c['ex_ba'], 'exemple', c.get('ex_fr'), c.get('p'), c['id'], pack, 5)
    # Leçons (fondations).
    for f in a['foundations']:
        pack = 'lecon:' + f['id']
        for sec in f['sections']:
            if sec['type'] in ('examples', 'culture'):
                for it in sec.get('items', []):
                    add(it.get('ba'), 'lecon', it.get('fr'), page_of(it.get('src')), it.get('ref'), pack, 1)
            elif sec['type'] == 'pairs':
                for it in sec.get('items', []):
                    for side in ('a', 'b'):
                        x = it[side]
                        add(x['ba'], 'lecon', x['fr'], page_of(x.get('src')), x.get('ref'), pack, 1)
            elif sec['type'] == 'order':
                add(' '.join(sec['ba']), 'lecon', sec.get('fr'), page_of(sec.get('src')), '', pack, 1)
    # Proverbes.
    for p in a.get('proverbs', []):
        add(p['ba'], 'proverbe', p['fr'], page_of(p.get('src')), '', 'sagesse', 1)
    # Scènes de vie.
    for sc in s['scenes']:
        pack = 'scenes:' + sc['category']
        prio = 2 if sc.get('level', 1) == 1 else 3
        for line in sc['lines']:
            if line.get('ba'):
                add(line['ba'], 'scene', line.get('fr'), page_of(line.get('src')), line.get('ref'), pack, prio)
        for v in sc.get('vocab', []):
            add(v['ba'], 'mot', v.get('fr'), '', v.get('ref'), pack, 3)
    return a, s, sorted(items.values(), key=lambda x: (x['priority'], KIND_RANK[x['kind']], x['pack'], x['ba']))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'apprendre_audio_catalog.json'))
    args = ap.parse_args()
    a, s, items = build()
    version = f"apprendre-{a.get('version', '0')}+scenes-{s.get('version', '0')}"
    out = {'content_version': version, 'count': len(items), 'items': items}
    with open(args.out, 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
    kinds = collections.Counter(i['kind'] for i in items)
    prios = collections.Counter(i['priority'] for i in items)
    words = sum(len(i['ba'].split()) for i in items)
    print(f'{len(items)} textes · {words} mots · version {version}')
    print('par type :', dict(kinds))
    print('par priorité :', dict(sorted(prios.items())))
    print('premier lot (priorités 1-2) :', sum(v for k, v in prios.items() if k <= 2))


if __name__ == '__main__':
    main()