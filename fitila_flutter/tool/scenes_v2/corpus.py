"""Corpus des phrases attestées du dictionnaire bariba-français."""
import json, os, re, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
DICO = os.environ.get('FITILA_DICO', os.path.join(HERE, 'dictionnaire_bariba_fr.json'))

def nfc(s):
    return unicodedata.normalize('NFC', s or '').strip()

def key(s):
    s = nfc(s).lower()
    s = re.sub(r'[\s ]+', ' ', s)
    return s.strip(' .!?;,…')

def load():
    ents = json.load(open(DICO))
    examples, heads = [], []
    for e in ents:
        st = 'atteste' if e.get('statut_validation') == 'EXTRAIT' else 'a_valider'
        for x in e.get('exemples_usage') or []:
            ba, fr = nfc(x.get('phrase_bariba')), nfc(x.get('phrase_francais'))
            if ba and fr:
                examples.append({'ref': e['id'], 'page': e['page_source'], 'ba': ba, 'fr': fr,
                                 'status': st, 'head': e.get('mot_bariba')})
        mb = nfc(e.get('mot_bariba') or e.get('entree_principale'))
        defs = e.get('definitions_francais') or []
        if mb and ' ' in mb and defs:
            heads.append({'ref': e['id'], 'page': e['page_source'], 'ba': mb, 'fr': '; '.join(defs),
                          'status': st, 'head': mb})
    return examples, heads
