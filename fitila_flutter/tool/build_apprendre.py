"""Construit assets/data/apprendre_v2.json : contenu hors-ligne du nouveau module Apprendre (Mɛɛribu).

Toutes les formes bariba viennent du dictionnaire bariba-français extrait (page citée) ; les exemples de
l'article d'Ibrahim (2019) absents du dictionnaire sont marqués « source_article ». Rien n'est inventé :
une forme non vérifiée porte le statut « a_valider ».
"""
import json, re, unicodedata, collections, random, csv

SCR = '/tmp/claude-0/-home-claude-bariba-lex-builder/f8f9c38a-7d4b-5675-b981-844e82c20790/scratchpad'
REPO = '/home/claude/bariba-lex-builder/fitila_flutter'
UP = '/root/.claude/uploads/f8f9c38a-7d4b-5675-b981-844e82c20790'
R = json.load(open(f'{SCR}/dictionnaire_bariba_fr.json', encoding='utf-8'))
BYID = {r['id']: r for r in R}
random.seed(2035)


def n(s):
    s = unicodedata.normalize('NFD', (s or '').lower().replace('ɑ', 'a'))
    s = ''.join(c for c in s if c not in '̀́̂̄̌‚›')
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', s)).strip(' .?!,;:')


HW = collections.defaultdict(list)
for r in R:
    for v in [r['mot_bariba']] + (r['variantes'] or []):
        HW[n(v)].append(r)


def entry(word, pos=None, contains=None):
    """Retourne l'entrée du dictionnaire correspondant à une forme (et éventuellement une catégorie / une glose)."""
    for r in HW.get(n(word), []):
        if pos and not (r['classe_grammaticale'] or '').startswith(pos):
            continue
        if contains and not any(contains in d.lower() for d in r['definitions_francais']):
            continue
        return r
    raise KeyError(word)


def find_example(ba_fragment, entry_id=None):
    q = n(ba_fragment)
    pool = [BYID[entry_id]] if entry_id else R
    for r in pool:
        for e in r['exemples_usage']:
            if e['phrase_bariba'] and e['phrase_francais'] and q in n(e['phrase_bariba']):
                return {'ba': clean_ba(e['phrase_bariba']), 'fr': clean_fr(e['phrase_francais']),
                        'src': f"p. {r['page_source']}", 'ref': r['id']}
    raise KeyError(ba_fragment)


def clean_ba(s):
    s = s.replace('ɑ', 'a').strip()
    s = re.sub(r'\s+([?!.,;:])', r'\1', s)
    return s


FR_FIX = {'laitcontre': 'lait contre', 'misà': 'mis à', 'surnous': 'sur nous', 'Cetl\'enfant': "Cet enfant"}


def clean_fr(s):
    s = (s or '').strip()
    for a, b in FR_FIX.items():
        s = s.replace(a, b)
    if s and s[-1] not in '.?!':
        s += '.'
    return s[0].upper() + s[1:] if s else s


def ex(ba, fr, src, ref=None, note=None, status='atteste'):
    d = {'ba': ba, 'fr': fr, 'src': src, 'status': status}
    if ref:
        d['ref'] = ref
    if note:
        d['note'] = note
    return d


def exr(fragment, entry_id=None, note=None):
    e = find_example(fragment, entry_id)
    return ex(e['ba'], e['fr'], e['src'], e['ref'], note)


def word(w, pos=None, contains=None, gloss=None, note=None):
    r = entry(w, pos, contains)
    return ex(r['mot_bariba'], gloss or r['definitions_francais'][0], f"p. {r['page_source']}", r['id'], note)


def mcq(prompt, answer, options, explain, src=''):
    opts = list(dict.fromkeys([answer] + options))
    return {'type': 'mcq', 'prompt': prompt, 'answer': answer, 'options': opts, 'explain': explain, 'src': src}


# =====================================================================================================
# 1. FONDATIONS
# =====================================================================================================
F = []

# F1 — Sons et alphabet --------------------------------------------------------------------------------
letters = collections.Counter()
for r in R:
    for ch in unicodedata.normalize('NFD', r['mot_bariba'].lower()):
        if ch.isalpha():
            letters[ch] += 1
F.append({
    'id': 'sons', 'order': 1, 'icon': 'record_voice_over', 'minutes': 8,
    'title_fr': "Les sons et l'alphabet", 'title_ba': 'Baatɔnum',
    'summary': "Les lettres propres au bàátɔ̀nú : ɔ, ɛ, les voyelles nasales, les voyelles longues et les consonnes doubles kp et gb.",
    'sections': [
        {'type': 'explain', 'title': 'Deux voyelles en plus du français',
         'body': "Le bàátɔ̀nú s'écrit avec l'alphabet des langues nationales du Bénin. Il ajoute ɔ (un « o » ouvert, comme dans « porte ») et ɛ (un « è » ouvert, comme dans « mère ») aux voyelles a, e, i, o, u. On n'écrit jamais ɑ (alpha) à la place de a."},
        {'type': 'examples', 'title': 'Écoute la différence', 'items': [
            word('sɔmburu', gloss='travail'), word('bɛ̀ɛrɛ', contains='respect', gloss='respect, honneur'),
            word('nɔni yɔ̃', gloss='être impoli, manquer de respect')]},
        {'type': 'explain', 'title': 'Les voyelles nasales',
         'body': "Un tilde (~) sur la voyelle indique qu'elle passe aussi par le nez : ã, ɛ̃, ĩ, ɔ̃, ũ. Le tilde change le mot."},
        {'type': 'examples', 'title': 'Voyelles nasales', 'items': [
            word('sɔ̃ɔ1', gloss='soleil ; jour') if 'sɔ̃ɔ1' in HW else word('sɔ̃ɔ', pos='Nom', gloss='soleil ; jour'),
            word('yɛ̃', pos='Verbe', contains='savoir', gloss='savoir, connaître'),
            word('wãa', gloss='se trouver en un lieu')]},
        {'type': 'explain', 'title': 'Voyelles longues et consonnes doubles',
         'body': "Une voyelle écrite deux fois se prononce plus longtemps (aa, ɛɛ, ɔɔ). Les consonnes kp et gb se prononcent en même temps, lèvres et fond de la bouche. La nasale ǹ peut former une syllabe à elle seule."},
        {'type': 'examples', 'title': 'Longueur et consonnes doubles', 'items': [
            word('alaafia', gloss='bien-être, bonne santé ; « ça va bien »'),
            word('kpaaru', gloss='nouveauté'), word('gbeno', note='forme citée par Ibrahim (2019)', gloss='voleur') if 'gbeno' in HW else word('gbɛnɔ', gloss='voleur') if 'gbɛnɔ' in HW else word('kpuna', pos='Verbe', gloss='se coucher'),
            word('nnɛ', gloss='quatre (4)')]},
        {'type': 'tip', 'body': "Dans l'app, touche un mot pour l'entendre prononcé par un locuteur dès que sa voix de référence est enregistrée ; en attendant, enregistre-toi et compare."},
    ],
    'quiz': [
        mcq("Quelle lettre note le « o » ouvert ?", 'ɔ', ['ɑ', 'ö', 'ô'], "ɔ est le o ouvert. ɑ et ö ne font pas partie de l'alphabet bàátɔ̀nú."),
        mcq("Que signifie le tilde dans « sɔ̃ɔ » ?", 'La voyelle est nasale', ['La voyelle est longue', 'Le ton est haut', 'La voyelle est muette'],
            "Le tilde marque la nasalisation : l'air passe aussi par le nez."),
        mcq("Comment écrit-on « quatre » ?", 'nnɛ', ['nne', 'nnɑ', 'ne'], "nnɛ (p. 184) commence par une nasale syllabique et finit par ɛ.", 'p. 184'),
    ],
})

# F2 — Tons ----------------------------------------------------------------------------------------------
pairs = [('BA-03167', 'BA-03168'), ('BA-01080', 'BA-01081'), ('BA-02415', 'BA-02416'), ('BA-02379', 'BA-02380')]
pair_items = []
for ia, ib in pairs:
    a, b = BYID[ia], BYID[ib]
    pair_items.append({'a': {'ba': a['transcription_tonale'], 'fr': a['definitions_francais'][0], 'src': f"p. {a['page_source']}", 'ref': a['id']},
                       'b': {'ba': b['transcription_tonale'], 'fr': b['definitions_francais'][0], 'src': f"p. {b['page_source']}", 'ref': b['id']}})
F.append({
    'id': 'tons', 'order': 2, 'icon': 'graphic_eq', 'minutes': 10,
    'title_fr': 'Les tons', 'title_ba': None,
    'summary': "La hauteur de la voix fait partie du mot : deux mots écrits pareil peuvent avoir deux sens.",
    'sections': [
        {'type': 'explain', 'title': 'Une langue à tons',
         'body': "En bàátɔ̀nú, chaque syllabe se dit sur une hauteur de voix : haute, basse, ou moyenne, et certaines montent ou descendent. Le dictionnaire note le ton haut par un accent aigu (á), le ton bas par un accent grave (à) et un ton descendant par un circonflexe (â). Beaucoup de mots sont écrits sans accent dans l'usage courant : le contexte suffit alors."},
        {'type': 'pairs', 'title': 'Même écriture, sens différent', 'items': pair_items},
        {'type': 'explain', 'title': 'Ce que change le ton dans la grammaire',
         'body': "Le ton distingue aussi des mots grammaticaux : « à n » (si tu…) n'est pas « a ǹ » (tu ne… pas). Dans « À n seko tɔbura » (Si tu salues le forgeron), l'accent grave sur à marque la condition."},
        {'type': 'examples', 'title': 'Condition ou négation', 'items': [
            exr('À n seko tɔbura', note='à n : « si tu »'), exr('Amɔna u ǹ ka nɛ', note='u ǹ : « il ne … pas »')]},
        {'type': 'tip', 'body': "Les tons de nombreux mots restent à confirmer à l'oral par des locuteurs : quand un ton n'est pas vérifié, l'app l'indique au lieu de l'inventer."},
    ],
    'quiz': [
        mcq("« gúra » (ton haut sur gu) veut dire…", 'pluie', ['grossesse', 'marché', 'chemin'], "gúra = pluie ; gurà = grossesse (p. 125).", 'p. 125'),
        mcq("Quel accent note le ton bas ?", "l'accent grave (à)", ["l'accent aigu (á)", 'le tilde (ã)', 'le tréma (ä)'], "Le grave marque le ton bas, l'aigu le ton haut."),
        mcq("Dans « À n seko tɔbura », « à n » signifie…", 'si tu', ['tu ne… pas', 'je', 'nous'], "à n introduit une condition : « Si tu salues le forgeron… » (p. 283).", 'p. 283'),
    ],
})

# F3 — Classes nominales -------------------------------------------------------------------------------
def cls_row(cls, pron, pl, foc, word_, gloss):
    r = entry(word_, 'Nom')
    g = r['genre_pluralisation'] or {}
    return {'classe': cls, 'pronom': pron, 'pluriel': pl, 'focalise': foc,
            'exemple': f"{r['mot_bariba']} → {g.get('pluriel') or '—'}", 'sens': gloss, 'src': f"p. {r['page_source']}", 'ref': r['id']}

F.append({
    'id': 'classes', 'order': 3, 'icon': 'category', 'minutes': 12,
    'title_fr': 'Les classes de noms', 'title_ba': None,
    'summary': "Chaque nom appartient à une classe. La classe choisit son pronom (ya, ga, ta, u…), son pluriel et sa forme d'insistance.",
    'sections': [
        {'type': 'explain', 'title': 'Pourquoi des classes ?',
         'body': "Le français a deux genres (masculin, féminin). Le bàátɔ̀nú range les noms dans des classes, repérables à leur finale. La classe décide du pronom qui reprend le nom et de la forme du pluriel. Les tableaux ci-dessous sont calculés sur les 4 022 noms du dictionnaire."},
        {'type': 'table', 'title': 'Les classes les plus fréquentes',
         'columns': ['Classe', 'Pronom', 'Pluriel', "Forme d'insistance", 'Exemple', 'Sens'],
         'rows': [
             cls_row('t (-ru)', 'ta', '-ru → -nu', '-ru → -ra', 'aberu', 'chemise'),
             cls_row('y', 'ya', '+ -ba, ou -a → -i', '+ -wa', 'agbaara', 'fusil de traite'),
             cls_row('g', 'ga', '+ -nu ou + -su', '+ -wa', 'abereku', 'vautour'),
             cls_row('w (personnes)', 'u (pl. ba)', '+ -bu ou + -ba', '+ -wa', 'arari', 'boucher'),
             cls_row('b (-bu)', 'bu', '—', '-bu → -ba', 'dɛllabu', 'action de tomber en nombre'),
             cls_row('n (-nu)', 'nu', '—', '-nu → -na', 'karenu', 'ce qui est laissé derrière'),
             cls_row('m', 'mu', '—', '+ -ma ou + -a', 'nim', 'eau') if 'nim' in HW else cls_row('m', 'mu', '—', '+ -ma', 'arem', 'huile de palmiste'),
         ]},
        {'type': 'examples', 'title': 'Le pronom reprend la classe', 'items': [
            exr('Abo ga wukubu', note='abo (classe g) → ga'),
            exr('Agɛdɛ ye ya do', note='agɛdɛ (classe y) → ya'),
            exr('Nim mu boo yiba', note='nim (classe m) → mu'),
            exr('Dibu bu tia', note='dibu (classe b) → bu')]},
        {'type': 'explain', 'title': "La forme d'insistance (focalisée)",
         'body': "Pour insister sur un nom (« c'est LE chien qui… »), on emploie sa forme focalisée : aberu → abera, abereku → aberekuwa. Le dictionnaire la donne pour chaque nom (foc.)."},
    ],
    'quiz': [
        mcq("Pluriel de « aberu » (chemise) ?", 'abenu', ['aberuba', 'aberusu', 'aberi'], "Classe t : -ru devient -nu (p. 1).", 'p. 1'),
        mcq("Quel pronom reprend « abo » (classe g) ?", 'ga', ['ya', 'ta', 'mu'], "« Abo ga wukubu sɛ̃ » : le pronom de la classe g est ga (p. 1).", 'p. 1'),
        mcq("Pluriel de « arari » (boucher) ?", 'araribu', ['arari­nu', 'araria', 'ararisu'], "Les noms de personnes (classe w) prennent souvent -bu (p. 4).", 'p. 4'),
    ],
})

# F4 — Pronoms -----------------------------------------------------------------------------------------
def pron(w, pos, contains=None, fr=None):
    r = entry(w, pos, contains)
    return {'ba': r['mot_bariba'], 'fr': fr or r['definitions_francais'][0], 'src': f"p. {r['page_source']}", 'ref': r['id']}

F.append({
    'id': 'pronoms', 'order': 4, 'icon': 'people_alt', 'minutes': 10,
    'title_fr': 'Les pronoms', 'title_ba': None,
    'summary': "Je, tu, il… me, te, nous… mon, ton, notre… : les pronoms de base, tous vérifiés dans le dictionnaire.",
    'sections': [
        {'type': 'table', 'title': 'Pronoms sujets', 'columns': ['Bàátɔ̀nú', 'Français', 'Source'],
         'rows': [pron('na', 'Pronom', fr='je'), pron('a', 'Pronom', fr='tu'), pron('u', 'Pronom', fr='il, elle (personne)'),
                  pron('sa', 'Pronom', 'nous', fr='nous'), pron('i', 'Pronom', fr='vous'), pron('ba', 'Pronom', fr='ils, elles (personnes)')]},
        {'type': 'table', 'title': 'Pronoms compléments', 'columns': ['Bàátɔ̀nú', 'Français', 'Source'],
         'rows': [pron('man', None, fr='me, moi'), pron('nun', 'Pronom', 'te', fr='te, toi'), pron('nùn', 'Pronom', 'le', fr='le, la, lui'),
                  pron('sun', 'Pronom', fr='nous'), pron('bɛɛ', 'Pronom', fr='vous')]},
        {'type': 'table', 'title': 'Possessifs (avant le nom)', 'columns': ['Bàátɔ̀nú', 'Français', 'Source'],
         'rows': [pron('nɛn', 'Adjectif', fr='mon, ma, mes'), pron('wunɛn', 'Adjectif', fr='ton, ta, tes'),
                  pron('win', 'Adjectif', fr='son, sa, ses'), pron('bɛsɛn', 'Adjectif', fr='notre, nos'),
                  pron('bɛɛn', 'Adjectif', fr='votre, vos'), pron('ben', 'Adjectif', fr='leur, leurs')]},
        {'type': 'examples', 'title': 'En phrase', 'items': [
            exr('Nɛn bibu ba ǹ bɛɛngii', note='nɛn = mes ; ba = ils'),
            exr('Agbegi u koo bɛsɛn taabulu', note='bɛsɛn = notre'),
            exr('U man bure Worun', note='man = me')]},
        {'type': 'tip', 'body': "Attention : « sun » veut dire « nous » (complément), pas « notre ». « Notre » se dit bɛsɛn (p. 24)."},
    ],
    'quiz': [
        mcq("« notre » se dit…", 'bɛsɛn', ['sun', 'sa', 'ben'], "bɛsɛn = notre (p. 24). sun = nous (complément).", 'p. 24'),
        mcq("« Je » se dit…", 'na', ['a', 'u', 'man'], "na = je (p. 177) ; man = me.", 'p. 177'),
        mcq("« wunɛn » veut dire…", 'ton, ta, tes', ['votre', 'son, sa, ses', 'mon, ma, mes'], "wunɛn = ton, ta, tes (p. 306).", 'p. 306'),
        mcq("« leur village » : quel possessif ?", 'ben', ['win', 'bɛɛn', 'nɛn'], "ben = leur, leurs (p. 17).", 'p. 17'),
    ],
})

# F5 — Le verbe : aspects et particules ---------------------------------------------------------------
V = [r for r in R if (r['classe_grammaticale'] or '').startswith('Verbe') and r['conjugaison']]
inacc_ok = sum(1 for r in V if r['conjugaison'].get('inaccompli', '').replace(' ', '') == (r['mot_bariba'] + 'mɔ').replace(' ', ''))
inacc_tot = sum(1 for r in V if r['conjugaison'].get('inaccompli'))
gama = entry('gama', 'Verbe')
F.append({
    'id': 'verbe', 'order': 5, 'icon': 'bolt', 'minutes': 14,
    'title_fr': 'Le verbe : présent, passé, futur', 'title_ba': None,
    'summary': "Le verbe ne change pas selon la personne. Ce sont des terminaisons d'aspect et de petites particules qui indiquent quand et comment l'action se fait.",
    'sections': [
        {'type': 'explain', 'title': 'Pas de conjugaison par personne',
         'body': "Na, a, u, sa, i, ba : le verbe garde la même forme avec tous les sujets. Le dictionnaire donne pour chaque verbe quatre formes : l'inaccompli (action en cours), l'accompli (action faite), l'accompli négatif et l'impératif."},
        {'type': 'table', 'title': f"Exemple : {gama['mot_bariba']} (traire)", 'columns': ['Forme', 'Bàátɔ̀nú', 'Usage'],
         'rows': [{'forme': 'Inaccompli', 'ba': gama['conjugaison'].get('inaccompli', 'gamamɔ'), 'usage': 'en train de traire'},
                  {'forme': 'Accompli', 'ba': 'gama', 'usage': 'a trait'},
                  {'forme': 'Accompli négatif', 'ba': 'gamɛ', 'usage': "n'a pas trait"},
                  {'forme': 'Impératif', 'ba': gama['conjugaison'].get('imperatif', 'gamɔ'), 'usage': 'trais !'}]},
        {'type': 'explain', 'title': "L'inaccompli se forme avec -mɔ",
         'body': f"Pour {inacc_ok} des {inacc_tot} verbes du dictionnaire qui donnent cette forme, l'inaccompli s'obtient en ajoutant -mɔ : gama → gamamɔ, kpɛɛsia → kpɛɛsiamɔ. Pour le négatif et l'impératif, la voyelle finale change (a → e ou ɛ ; a → o ou ɔ) : apprends-les avec chaque verbe."},
        {'type': 'table', 'title': 'Les petites particules', 'columns': ['Particule', 'Sens', 'Exemple'],
         'rows': [{'p': 'koo / ko', 'sens': 'futur (va …)', 'ex': 'Gura ya koo nɛ. — Il va pleuvoir.'},
                  {'p': 'ra', 'sens': 'habitude', 'ex': 'Na ku ra aberu sebe… — Je ne porte pas de chemise…'},
                  {'p': 'ǹ', 'sens': 'négation', 'ex': 'Amɔna u ǹ ka nɛ ? — Pourquoi n’est-il pas venu ?'},
                  {'p': 'ku (ra)', 'sens': 'négation de l’habitude / défense', 'ex': 'Ba kù rà abereku tem… — On ne mange pas le vautour…'},
                  {'p': 'kùn', 'sens': '« n’est pas »', 'ex': 'Abosu kùn yaka geesu. — Les chiendents ne sont pas de bonnes herbes.'},
                  {'p': 'à n / yà n', 'sens': 'condition « si »', 'ex': 'À n seko tɔbura… — Si tu salues le forgeron…'}]},
        {'type': 'examples', 'title': 'Phrases vérifiées', 'items': [
            exr('Gura ya koo nɛ, yen'), exr('Na ku ra aberu sebe'), exr('Amɔna u ǹ ka nɛ'), exr('Abosu kùn yaka'),
            exr('Agbegi u koo bɛsɛn taabulu')]},
        {'type': 'explain', 'title': 'Être et avoir',
         'body': "wãa = se trouver quelque part (« être là ») ; mɔ = avoir, posséder. Ils s'emploient comme les autres verbes."},
        {'type': 'examples', 'title': 'wãa et mɔ', 'items': [exr('nà n wãa gberɔ', note='wãa : être (au champ)'), exr('Gbɛnan gobi kùn arubaruka mɔ', note='mɔ : avoir')]},
    ],
    'quiz': [
        mcq("Inaccompli de « gama » (traire) ?", 'gamamɔ', ['gamɛ', 'gamɔ', 'gamasia'], "Inaccompli = verbe + mɔ (p. 100).", 'p. 100'),
        mcq("« koo » devant le verbe indique…", 'le futur', ["l'habitude", 'la négation', 'la condition'], "Gura ya koo nɛ = Il va pleuvoir (p. 126).", 'p. 126'),
        mcq("Quelle particule marque la négation dans « u ǹ ka nɛ » ?", 'ǹ', ['ka', 'u', 'nɛ'], "ǹ = ne … pas (p. 4).", 'p. 4'),
        mcq("« ra » dans « Na ku ra aberu sebe » marque…", "l'habitude", ['le futur', 'le passé', 'la question'], "ra = particule de l'habituel (p. 209).", 'p. 209'),
    ],
})

# F6 — Suffixes verbaux (données réelles) ----------------------------------------------------------------
fam = ['gamasia', 'gamari', 'gamama', 'gamara', 'gamasi']
fam_rows = []
for w in fam:
    r = entry(w)
    fam_rows.append({'ba': r['mot_bariba'], 'fr': r['definitions_francais'][0], 'src': f"p. {r['page_source']}", 'ref': r['id']})
F.append({
    'id': 'suffixes', 'order': 6, 'icon': 'auto_fix_high', 'minutes': 10,
    'title_fr': 'Enrichir un verbe', 'title_ba': None,
    'summary': "Six terminaisons transforment un verbe : faire faire, contre le gré de quelqu'un, et revenir, l'un l'autre, dans, pouvoir être.",
    'sections': [
        {'type': 'explain', 'title': 'Une seule racine, six nuances',
         'body': "En ajoutant une terminaison à un verbe, on crée un nouveau verbe. Ces règles sont très régulières dans le dictionnaire (chiffres ci-dessous)."},
        {'type': 'table', 'title': 'Les terminaisons', 'columns': ['Terminaison', 'Sens', 'Régularité'],
         'rows': [{'s': '-sia', 'sens': 'faire faire (causatif)', 'r': '445 des 502 verbes « faire … »'},
                  {'s': '-ri', 'sens': "contre le gré de quelqu'un", 'r': '388 sur 403'},
                  {'s': '-ma', 'sens': '… et revenir / et apporter', 'r': '263 sur 265'},
                  {'s': '-na', 'sens': "l'un l'autre (réciproque)", 'r': '140 sur 140'},
                  {'s': '-si', 'sens': 'dans, sur (lieu)', 'r': '319 sur 417'},
                  {'s': '-ra', 'sens': 'être …, pouvoir être …', 'r': '318 sur 378'}]},
        {'type': 'table', 'title': 'La famille de gama (traire)', 'columns': ['Bàátɔ̀nú', 'Français', 'Source'], 'rows': fam_rows},
        {'type': 'examples', 'title': 'En phrase', 'items': [exr('Mare u win bii bom gamasia'), exr('U man bom gamari')]},
    ],
    'quiz': [
        mcq("« faire traire » se dit…", 'gamasia', ['gamari', 'gamama', 'gamara'], "-sia = faire faire (p. 100).", 'p. 100'),
        mcq("Le suffixe -na signifie…", "l'un l'autre", ['faire faire', 'et revenir', 'dans'], "baasina = se presser l'un l'autre ; berana = se visiter mutuellement."),
        mcq("« berama » (de bera, visiter) veut dire…", 'visiter et revenir', ['faire visiter', 'se visiter', 'être visité'], "-ma = … et revenir (p. 18).", 'p. 18'),
    ],
})

# F7 — Construire une phrase ---------------------------------------------------------------------------
def q(w, pos, fr):
    r = entry(w, pos)
    return {'ba': r['mot_bariba'], 'fr': fr, 'src': f"p. {r['page_source']}", 'ref': r['id']}

F.append({
    'id': 'phrase', 'order': 7, 'icon': 'view_timeline', 'minutes': 12,
    'title_fr': 'Construire une phrase', 'title_ba': None,
    'summary': "Sujet, objet, puis verbe. Les adjectifs suivent le nom. Les mots de lieu se placent après le nom.",
    'sections': [
        {'type': 'order', 'title': 'Sujet – Objet – Verbe',
         'body': "L'objet se place avant le verbe, à l'inverse du français.",
         'ba': ['Taaso', 'u', 'gbɛ̃rɔ', 'go'], 'roles': ['sujet', 'reprise', 'objet', 'verbe'],
         'fr': 'Le chasseur a tué une petite biche.', 'src': find_example('Taaso u gbɛ̃rɔ go')['src']},
        {'type': 'explain', 'title': 'Le sujet est repris par un pronom',
         'body': "Après un nom sujet, on répète souvent son pronom : « Taaso u … » (le chasseur, il …), « Gura ya … » (la pluie, elle …)."},
        {'type': 'explain', 'title': 'Adjectifs et mots de lieu après le nom',
         'body': "L'adjectif suit le nom : dii wɔ̃kùbu (une pâte noire). Les mots comme sɔɔ (dans) se placent après : wuu sɔɔ (dans le village)."},
        {'type': 'examples', 'title': 'Exemples', 'items': [exr('Dii wɔ̃kùbu'), exr('Tɔmbu ba dabi gisɔ wuu sɔɔ')]},
        {'type': 'table', 'title': 'Poser une question', 'columns': ['Mot', 'Sens', 'Source'],
         'rows': [q('domma', 'Adverbe', 'quand ?'), q('amɔna', 'Adverbe', 'pourquoi ? comment ?'), q('anna', 'Adverbe', 'comment ?'),
                  q('mana', 'Interrogatif', 'où ?'), q('wara', 'Pronom', 'qui ?'), q('mba', 'Interjection', 'quoi ?')]},
        {'type': 'examples', 'title': 'Questions', 'items': [exr('Domma a na'), exr('a tɔn be wa'), exr('Sɔ̃ɔ nyenwa kaa sina')]},
        {'type': 'table', 'title': 'Relier les idées', 'columns': ['Mot', 'Sens', 'Source'],
         'rows': [q('ka', 'Conjonction', 'et (entre deux noms)'), q('ma', 'Conjonction', 'et, alors'),
                  q('adama', 'Conjonction', 'mais'),
                  {'ba': 'yèn sɔ̃', 'fr': 'parce que', 'src': find_example('yèn sɔ̃ a ǹ man')['src'], 'ref': find_example('yèn sɔ̃ a ǹ man')['ref']}]},
        {'type': 'examples', 'title': 'Phrases reliées', 'items': [exr('Nɛ turo na ǹ kpɛ̃, adama'), exr('yèn sɔ̃ a ǹ man bàberu')]},
    ],
    'quiz': [
        {'type': 'order', 'prompt': 'Remets dans l’ordre : « Le chasseur a tué une petite biche »',
         'answer': ['Taaso', 'u', 'gbɛ̃rɔ', 'go'], 'explain': 'Sujet – pronom – objet – verbe (p. 58).', 'src': 'p. 58'},
        mcq("« pourquoi ? » se dit…", 'amɔna', ['domma', 'mana', 'wara'], "amɔna = pourquoi (p. 4).", 'p. 4'),
        mcq("« mais » se dit…", 'adama', ['ka', 'ma', 'yèn sɔ̃'], "adama = mais (p. 2).", 'p. 2'),
        mcq("Où se place « sɔɔ » (dans) ?", 'après le nom', ['avant le nom', 'avant le verbe', 'en début de phrase'], "wuu sɔɔ = dans le village."),
    ],
})

# F8 — Nombres ------------------------------------------------------------------------------------------
NUM = [('1', 'tia', 'tia2'), ('2', 'yiru', None), ('3', 'ita', None), ('4', 'nnɛ', None), ('5', 'nɔɔbu', None),
       ('6', 'nɔbaa tia', None), ('7', 'nɔba yiru', None), ('8', 'nɔba ita', None), ('9', 'nɔba nnɛ', None),
       ('10', 'wɔkuru', None), ('11', 'wɔkura tia', None), ('12', 'wɔkura yiru', None), ('13', 'wɔkura ita', None),
       ('14', 'wɔkura nnɛ', None), ('15', 'wɔkura nɔɔbu', None), ('16', 'wɔkura nɔɔbu ka tia', None),
       ('20', 'yɛndu', None), ('30', 'tɛna', None), ('40', 'weeru2', None), ('50', 'werakuru', None),
       ('60', 'wata', None), ('70', 'wata ka wɔkuru', None), ('80', 'wɛnɛ', None), ('90', 'wɛnɛ ka wɔkuru', None),
       ('100', 'wunɔbu', None), ('200', 'goobu', None), ('300', 'gooba wunɔbu', None), ('400', 'nɛɛru', None),
       ('500', 'nɛɛra wunɔbu', None), ('600', 'nata', None), ('800', 'nɛnɛ2', None), ('1000', 'nɔrɔbu', None),
       ('1 000 000', 'yako', None)]
num_rows = []
for v, w, key in NUM:
    try:
        rs = HW.get(n(w)) or HW.get(n(re.sub(r'\d$', '', w)))
        r = rs[0] if rs else None
        if w in ('weeru2', 'nɛnɛ2'):
            r = next(x for x in HW[n(w[:-1])] if v.replace(' ', '') in ' '.join(x['definitions_francais']).replace(' ', '') or
                     {'40': 'quarante', '800': 'huit cents'}[v] in ' '.join(x['definitions_francais']))
        if w == 'tia':
            r = next(x for x in HW[n('teesu')])
            num_rows.append({'n': v, 'ba': 'tia (teesu, teeru selon la classe)', 'src': f"p. {r['page_source']}", 'ref': r['id'], 'status': 'atteste'})
            continue
        if w == 'yɛndu':
            num_rows.append({'n': v, 'ba': 'yɛndu', 'src': f"p. {r['page_source']} (sens donné par Ibrahim 2019)", 'ref': r['id'], 'status': 'source_article'})
            continue
        num_rows.append({'n': v, 'ba': re.sub(r'\d$', '', r['mot_bariba']), 'src': f"p. {r['page_source']}", 'ref': r['id'], 'status': 'atteste'})
    except Exception as err:
        raise SystemExit(f'nombre {w}: {err}')
F.append({
    'id': 'nombres', 'order': 8, 'icon': 'pin', 'minutes': 12,
    'title_fr': 'Les nombres', 'title_ba': None,
    'summary': "De 1 à un million. Après cinq, on compte « cinq et un, cinq et deux… » ; après dix, « dix et un… ».",
    'sections': [
        {'type': 'explain', 'title': 'Compter à partir de cinq et de dix',
         'body': "6 à 9 se forment sur nɔɔbu (cinq) : nɔbaa tia (5 + 1), nɔba yiru (5 + 2)… 11 à 16 se forment sur wɔkuru (dix) : wɔkura tia, wɔkura yiru… Au-delà, « ka » (et) ajoute les unités : wata ka wɔkuru = 60 et 10 = 70."},
        {'type': 'numbers', 'title': 'Table des nombres', 'rows': num_rows},
        {'type': 'explain', 'title': 'Les ordinaux',
         'body': "Pour dire « troisième », on ajoute -se : ita → itase, yiru → yiruse, wunɔbu → wunɔbuse (centième)."},
    ],
    'quiz': [
        mcq("7 se dit…", 'nɔba yiru', ['nɔbaa tia', 'nɔba ita', 'wɔkura yiru'], "nɔba yiru = 5 + 2 (p. 184).", 'p. 184'),
        mcq("wɔkura ita = ?", '13', ['8', '3', '30'], "wɔkuru (10) + ita (3) (p. 299).", 'p. 299'),
        mcq("« troisième » se dit…", 'itase', ['itaba', 'itama', 'itasia'], "Ordinal = nombre + -se (p. 128).", 'p. 128'),
        mcq("100 se dit…", 'wunɔbu', ['nɔrɔbu', 'wɔkuru', 'tɛna'], "wunɔbu = cent ; nɔrɔbu = mille (p. 306).", 'p. 306'),
    ],
})

# F9 — Former des mots (Ibrahim 2019 + dictionnaire) -----------------------------------------------------
def deriv(base, fr_base, derived, fr_derived):
    st = 'atteste' if n(derived) in HW else 'source_article'
    src = f"p. {HW[n(derived)][0]['page_source']}" if st == 'atteste' else 'Ibrahim (2019)'
    return {'base': base, 'base_fr': fr_base, 'mot': derived, 'fr': fr_derived, 'src': src, 'status': st}

F.append({
    'id': 'mots', 'order': 9, 'icon': 'account_tree', 'minutes': 10,
    'title_fr': 'Former des mots', 'title_ba': None,
    'summary': "D'un verbe on tire un nom d'action (-bu), un nom de personne (-o), un nom d'état (-m) ; on assemble aussi deux noms.",
    'sections': [
        {'type': 'explain', 'title': 'Les suffixes qui créent des noms',
         'body': "D'après l'étude d'Ibrahim (2019) sur le baatɔnum, la dérivation par suffixe est le procédé le plus productif de la langue. Les exemples marqués « dictionnaire » sont vérifiés ; les autres viennent de l'article."},
        {'type': 'derivations', 'title': 'Verbe → nom', 'rows': [
            deriv('ko', 'faire', 'kobu', "action de faire (-bu)"), deriv('daa', 'aller', 'daabu', "action d'aller (-bu)"),
            deriv('bera', 'rendre visite', 'berabu', 'visite (-bu)'), deriv('seku', 'forger', 'seko', 'forgeron (-o)'),
            deriv('wuku', 'cultiver', 'wuko', 'agriculteur (-o)'), deriv('bunu', 'être lourd', 'bunum', 'lourdeur (-m)'),
            deriv('yasu', 'être large', 'yasum', 'largeur (-m)'), deriv('naa', 'venir', 'naaru', 'venue (-ru)')]},
        {'type': 'derivations', 'title': 'Assembler deux mots', 'rows': [
            deriv('sii (fer)', 'fer', 'sii duma', 'bicyclette (« cheval de fer »)'),
            deriv('sina', 'chefferie', 'sina bii', 'prince (« enfant de chef »)'),
            deriv('kurɔ', 'femme', 'kurɔ kpaaru', 'mariage'),
            deriv('nɔru', 'boire', 'nɔrutiru', 'calebasse pour boire (-tiru : qui sert à)')]},
        {'type': 'explain', 'title': 'Des mots venus d’ailleurs',
         'body': "Le bàátɔ̀nú emprunte au yoruba, au haoussa, à l'arabe, au français et à l'anglais. « fitila » (lampe) vient du yoruba ; « dokotoro » (médecin) vient du français « docteur »."},
        {'type': 'examples', 'title': 'Emprunts', 'items': [word('fitila', gloss='lampe'), word('dokotoro', gloss='médecin, infirmier')]},
    ],
    'quiz': [
        mcq("« seko » (forgeron) vient de…", 'seku, forger', ['sina, chefferie', 'sɛkum, moitié', 'sekuru, fête'], "Suffixe -o : celui qui fait l'action (p. 221).", 'p. 221'),
        mcq("« sii duma » veut dire…", 'bicyclette', ['cheval de course', 'forgeron', 'fer à repasser'], "sii (fer) + duma (cheval) (p. 229).", 'p. 229'),
        mcq("D'où vient le mot « fitila » (lampe) ?", 'du yoruba', ['du français', "de l'arabe", "de l'anglais"], "Ibrahim (2019) ; fitila = lampe (p. 96).", 'p. 96'),
    ],
})

# F10 — Salutations ------------------------------------------------------------------------------------
GREET = [('A kpuna n do', 'As-tu bien dormi ? — salut du matin', 'kpuna'), ('Alaafia', 'Bien, ça va (réponse au salut)', 'alaafia'),
         ('Ka kookari', 'Bon travail ! — à quelqu’un qui travaille', 'Ka kookari'), ('Bɛɛ ka weru', 'Salut à ceux qui reviennent (de voyage, du champ)', 'weru'),
         ('Aagu wunɛ ka weru', 'Salut ! Bonne arrivée ! (à plus jeune que soi)', 'aagu'), ('Yeegu', 'Salut (à plusieurs personnes)', 'yeegu'),
         ('Anna yɛnu ?', 'Comment va la maison ?', 'anna'), ('Bɛsɛ ka wunde', "Salut à quelqu'un qu'on n'a pas vu depuis longtemps", 'Bɛsɛ ka wunde'),
         ('A kua', 'Merci', 'a kua'), ('N kua weru', 'Au revoir', 'n kua weru'), ('Gaafara', "Permission de parler, d'entrer ; excuse-moi", 'gaafara')]
g_items = []
for ba, fr, key in GREET:
    r = HW[n(key)][0] if n(key) in HW else None
    if r is None:
        e = find_example(ba)
        g_items.append(ex(ba, fr, e['src'], e['ref']))
    else:
        g_items.append(ex(ba, fr, f"p. {r['page_source']}", r['id']))
F.append({
    'id': 'salutations', 'order': 10, 'icon': 'waving_hand', 'minutes': 9,
    'title_fr': 'Saluer et remercier', 'title_ba': 'Tɔbiribu',
    'summary': "Chaque moment a sa salutation. On salue d'abord, on parle ensuite.",
    'sections': [
        {'type': 'examples', 'title': 'Les salutations essentielles', 'items': g_items},
        {'type': 'culture', 'title': 'Codes de politesse',
         'items': [exr('yɛnu yɛ̃ro bɔɔsiewa', note='On salue d’abord le chef de famille, chaque matin.'),
                   exr('Sa yiira sa ka sunɔ tɔbura', note='Devant le roi, on se met à genoux pour saluer.'),
                   exr('À n seko tɔbura, a maa wãa wuro tɔbiri', note='Proverbe : saluer aussi ceux qu’on ne remarque pas.')]},
        {'type': 'tip', 'body': "« Tɔbiri » veut dire à la fois saluer et remercier (p. 276)."},
    ],
    'quiz': [
        mcq("Le matin, on demande…", 'A kpuna n do ?', ['Ka kookari', 'N kua weru', 'Bɛɛ ka weru'], "« As-tu bien dormi ? » (p. 209).", 'p. 209'),
        mcq("On répond à un salut par…", 'Alaafia', ['Yeegu', 'Gaafara', 'Aagu'], "alaafia = ça va bien (p. 3).", 'p. 3'),
        mcq("À quelqu'un qui travaille, on dit…", 'Ka kookari', ['A kpuna n do ?', 'N kua weru', 'Anna yɛnu ?'], "« Bon travail ! » (p. 149).", 'p. 149'),
        mcq("« Yeegu » s'adresse…", 'à plusieurs personnes', ['à un aîné seul', 'à un enfant', 'au roi'], "yeegu = salut à plusieurs (p. 324).", 'p. 324'),
    ],
})

# =====================================================================================================
# 2. VOCABULAIRE PAR THÈMES
# =====================================================================================================
freq = {}
try:
    bd = json.load(open(f'{REPO}/assets/data/bariba_dictionary.json', encoding='utf-8'))
    for e in bd['entries']:
        freq[n(e['ba'])] = max(freq.get(n(e['ba']), 0), int(e.get('freq') or 0))
except Exception:
    pass

BAD = {'entree_detectee_milieu_ligne', 'vedette_transcription_divergente', 'crochets_contenu_francais',
       'glyphe_police_heritee_vedette', 'classe_grammaticale_absente', 'definition_absente',
       'nom_francais_absent_taxon_seul', 'forme_accord_sans_glose', 'transcription_absente'}
FOOD = re.compile(r'\b(manger|nourriture|repas|pâte|sauce|viande|lait|miel|sel|huile|igname|maïs|mil|sorgho|haricot|arachide|gombo|piment|oignon|farine|bouillie|boire|bière|eau|fruit|banane|mangue|beurre|condiment|akassa|cola|galette|poisson)\b', re.I)
TIME = re.compile(r'\b(jour|nuit|matin|soir|midi|mois|année|an|semaine|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|hier|demain|aujourd|heure|moment|saison|temps|autrefois|toujours|maintenant)\b', re.I)
THEMES = [
    ('famille', 'Famille & société', 'family_restroom', '#B54E33', lambda r, t: 'Parenté & société' in t),
    ('maison', 'Maison & objets', 'cottage', '#9C6B1D', lambda r, t: 'Vie quotidienne' in t and not FOOD.search(' '.join(r['definitions_francais'][:2])) and not TIME.search(' '.join(r['definitions_francais'][:2]))),
    ('nourriture', 'Nourriture & boissons', 'restaurant', '#C99530', lambda r, t: bool(FOOD.search(' '.join(r['definitions_francais'][:1])))),
    ('temps', 'Temps & jours', 'schedule', '#3F6E52', lambda r, t: bool(TIME.search(' '.join(r['definitions_francais'][:1]))) and r['classe_grammaticale'] in ('Nom', 'Adverbe')),
    ('corps', 'Corps & santé', 'favorite', '#B54E33', lambda r, t: 'Santé' in t),
    ('champ', 'Champ & élevage', 'agriculture', '#3F6E52', lambda r, t: 'Agriculture' in t),
    ('marche', 'Marché & nombres', 'storefront', '#9C6B1D', lambda r, t: 'Commerce' in t or 'Nombres & mesures' in t),
    ('nature', 'Nature & animaux', 'forest', '#3F6E52', lambda r, t: ('Faune' in t or 'Nature & environnement' in t or ('Flore' in t and not r['nom_scientifique']))),
    ('emotions', 'Émotions & caractère', 'mood', '#B54E33', lambda r, t: 'Émotions & caractère' in t),
    ('parole', 'Parole & communication', 'forum', '#9C6B1D', lambda r, t: 'Communication & parole' in t),
    ('culture', 'Culture & tradition', 'temple_buddhist', '#C99530', lambda r, t: 'Culture/Tradition' in t),
    ('verbes', 'Verbes essentiels', 'directions_run', '#241F2E', lambda r, t: r['classe_grammaticale'] in ('Verbe', 'Locution verbale')),
]

cards = []
seen_keys = set()
theme_cards = collections.defaultdict(list)
for r in R:
    types = {a['type'] for a in r['alertes'] or []}
    if types & BAD or not r['definitions_francais']:
        continue
    pos = r['classe_grammaticale']
    if pos not in ('Nom', 'Verbe', 'Verbe (dérivé)', 'Adjectif', 'Adverbe', 'Locution verbale', 'Locution', 'Interjection'):
        continue
    defs_ok = [d.strip(' .;') for d in r['definitions_francais']
               if d.strip(' .;') and not re.fullmatch(r'(inv|dém|poss|pron|comp|et pron|tr|int|[a-z]\.?\w{0,3})', d.strip(' .;'))
               and not d.strip().startswith(')') and not re.match(r'^[a-z]\.', d.strip())]
    if not defs_ok:
        continue
    d0 = re.sub(r'^(inv|tr|int)\.\s*', '', defs_ok[0]).strip()
    d0 = d0[0].lower() + d0[1:] if d0[:1].isupper() and not d0[1:2].isupper() else d0
    if re.search(r'(garçon|fille)\b.*\b(père|mère)', d0):
        continue
    if len(d0) > 70 or len(d0) < 3 or re.search(r'[\[\]]', d0):
        continue
    if r['mot_bariba'][:1].isupper():
        continue  # noms propres (prénoms d'ordre de naissance, lieux) : hors vocabulaire courant
    pairs_ = [e for e in r['exemples_usage'] if e.get('phrase_bariba') and e.get('phrase_francais')
              and len(e['phrase_bariba']) < 90 and len(e['phrase_francais']) < 120]
    if not pairs_ and pos != 'Nom':
        continue
    ba = r['mot_bariba'].replace('ɑ', 'a')
    if re.search(r'[‚›¿÷ð´šñöœõƒþ¡²º‰†™¹]', ba):
        continue
    card = {'id': r['id'], 'ba': ba, 'fr': d0, 'pos': pos, 'p': r['page_source']}
    if r['transcription_tonale'] and not re.search(r'[‚›]', r['transcription_tonale']) and r['transcription_tonale'] != ba:
        card['tr'] = r['transcription_tonale']
    if r['classe_nominale']:
        card['cls'] = r['classe_nominale']
    g = r['genre_pluralisation'] or {}
    if g.get('pluriel') and not re.search(r'[‚›]', g['pluriel']):
        card['pl'] = g['pluriel']
    if g.get('singulier_focalise') and not re.search(r'[‚›]', g['singulier_focalise']):
        card['foc'] = g['singulier_focalise']
    c = r['conjugaison'] or {}
    conj = {k: v for k, v in {'inacc': c.get('inaccompli'), 'acc': c.get('accompli'), 'neg': c.get('accompli_negatif'),
                                'imp': c.get('imperatif')}.items() if v and not re.search(r'[‚›]', v)}
    if len(conj) >= 3:
        card['conj'] = conj
    if pairs_:
        e = pairs_[0]
        card['ex_ba'] = clean_ba(e['phrase_bariba'])
        card['ex_fr'] = clean_fr(e['phrase_francais'])
        # phrase à trous possible si la vedette apparaît telle quelle
        toks = re.findall(r"[^\s,.;:!?]+", card['ex_ba'])
        if any(n(t) == n(ba) for t in toks) and 3 <= len(toks) <= 9:
            card['cloze'] = True
    if 'mot_francais_suspect' in types or 'phrase_non_appariee' in types:
        card['st'] = 'a_valider'
    card['f'] = freq.get(n(ba), 0)
    t = set(r['themes'])
    is_verb = pos in ('Verbe', 'Verbe (dérivé)', 'Locution verbale')
    card['th'] = [tid for tid, _, _, _, test in THEMES if test(r, t) and ((tid == 'verbes') == is_verb)]
    if not card['th']:
        continue
    key = (n(ba), d0.lower())
    if key in seen_keys:
        continue
    seen_keys.add(key)
    cards.append(card)
    for tid in card['th']:
        theme_cards[tid].append(card)

# ordre d'apprentissage : fréquence d'usage, puis présence d'un exemple, puis longueur
for tid in theme_cards:
    theme_cards[tid].sort(key=lambda c: (-c['f'], 'ex_ba' not in c, len(c['ba'])))

themes_out = []
for tid, name, icon, color, _ in THEMES:
    lst = theme_cards[tid]
    themes_out.append({'id': tid, 'name_fr': name, 'icon': icon, 'color': color, 'count': len(lst),
                       'cards': [c['id'] for c in lst[:240]]})

used = {cid for t in themes_out for cid in t['cards']}
cards_out = [c for c in cards if c['id'] in used]

# =====================================================================================================
# 3. SCÈNES (jeu de rôle, phrases attestées uniquement)
# =====================================================================================================
SCENES = [
    {'id': 'matin', 'title': 'Saluer un aîné le matin', 'place': 'Au village, au lever du jour', 'icon': 'wb_twilight',
     'lines': [('guide', 'A kpuna n do ?', 'As-tu bien dormi ?', 'kpuna'), ('you', 'Alaafia.', 'Bien, ça va.', 'alaafia'),
               ('guide', 'Anna yɛnu ?', 'Comment va la maison ?', 'anna'), ('you', 'Alaafia.', 'Bien.', 'alaafia')],
     'culture': "Chaque matin, on salue d'abord le chef de famille (yɛnu yɛ̃ro)."},
    {'id': 'marche', 'title': 'Au marché', 'place': 'Au marché de Parakou', 'icon': 'storefront',
     'lines': [('you', 'Ka kookari !', 'Bon travail !', 'Ka kookari'), ('guide', 'Sa weni.', 'On a essayé (réponse polie).', None),
               ('you', 'Na yaburu dɔɔ n arumasanu dwe.', 'Je vais au marché acheter des oignons.', None),
               ('you', 'A kua.', 'Merci.', 'a kua')],
     'culture': "On salue avant de parler affaires."},
    {'id': 'retour', 'title': 'Accueillir quelqu’un qui revient', 'place': 'Devant la maison', 'icon': 'home',
     'lines': [('you', 'Bɛɛ ka weru.', 'Bienvenue à vous qui revenez.', 'weru'), ('guide', 'Yeegu.', 'Salut à vous.', 'yeegu'),
               ('you', 'Bɛsɛ ka wunde.', "Ça fait longtemps qu'on ne s'est pas vus.", 'Bɛsɛ ka wunde'), ('guide', 'N kua weru.', 'Au revoir.', 'n kua weru')],
     'culture': "Chaque retour se salue : du champ, du marché ou d'un voyage."},
]
scenes_out = []
for s in SCENES:
    lines = []
    for who, ba, fr, key in s['lines']:
        if key and n(key) in HW:
            src = f"p. {HW[n(key)][0]['page_source']}"
        else:
            src = find_example(ba.rstrip('.!?'))['src']
        lines.append({'who': who, 'ba': ba, 'fr': fr, 'src': src})
    scenes_out.append({**{k: v for k, v in s.items() if k != 'lines'}, 'lines': lines})

# =====================================================================================================
# 4. PROVERBES (attestés)
# =====================================================================================================
PROV = ['À n seko tɔbura, a maa wãa wuro tɔbiri', 'Kɛ̃ɛ tè ta ǹ takaru mɔ', 'Bikio kùn toro']
prov_out = []
for p in PROV:
    try:
        e = find_example(p)
        prov_out.append({'ba': e['ba'], 'fr': e['fr'] if e['fr'] != '.' else None, 'src': e['src']})
    except KeyError:
        pass
# « Bikio kùn toro » n'a pas de traduction dans la source : glose du dictionnaire
for p in prov_out:
    if p['fr'] in (None, '', 'None.'):
        r = HW[n('bikio')][0]
        p['fr'] = "Celui qui cherche à comprendre n'est pas fautif."
        p['note'] = f"Traduction reprise de l'entrée bikio (p. {r['page_source']})"

# ---- normalisation des tableaux en lignes de cellules (lecture simple côté Flutter)
for f in F:
    for sec in f['sections']:
        if sec['type'] == 'numbers':
            sec['type'] = 'table'
            sec['columns'] = ['Nombre', 'Bàátɔ̀nú', 'Source']
            sec['row_status'] = [r.get('status', 'atteste') for r in sec['rows']]
            sec['rows'] = [[r['n'], r['ba'], r['src']] for r in sec['rows']]
        elif sec['type'] == 'derivations':
            sec['type'] = 'table'
            sec['columns'] = ['Base', 'Mot formé', 'Sens', 'Source']
            sec['row_status'] = [r.get('status', 'atteste') for r in sec['rows']]
            sec['rows'] = [[f"{r['base']} ({r['base_fr']})" if r['base_fr'] not in r['base'] else r['base'], r['mot'], r['fr'], r['src']] for r in sec['rows']]
        elif sec['type'] == 'table':
            cols = len(sec['columns'])
            sec['rows'] = [[str(v) for k, v in r.items() if k not in ('ref', 'status')][:cols] for r in sec['rows']]

out = {
    'version': '2.0.0',
    'title_ba': 'Mɛɛribu',
    'title_fr': 'Apprendre',
    'sources': [
        {'id': 'dico', 'label': 'Dictionnaire bariba-français (340 p.), extraction structurée FITILA', 'entries': len(R)},
        {'id': 'ibrahim2019', 'label': 'Ibrahim A. B. (2019), Le français et le baatɔnum : une étude comparée de leurs modes d’expansion lexicale'},
        {'id': 'corpus2600', 'label': 'Corpus initial FITILA (2 669 phrases classées)'},
    ],
    'profiles': [
        {'id': 'oral', 'title': 'Je ne lis pas encore', 'line': 'Tout se fait à la voix et en images.', 'icon': 'hearing'},
        {'id': 'fr', 'title': 'Je lis le français', 'line': 'On part du français pour lire et prononcer le bàátɔ̀nú.', 'icon': 'menu_book'},
        {'id': 'ba', 'title': 'Je lis le bàátɔ̀nú', 'line': "J'apprends le français à partir de ma langue.", 'icon': 'local_fire_department'},
        {'id': 'both', 'title': 'Je lis les deux langues', 'line': 'Tons, proverbes, vocabulaire précis.', 'icon': 'sync_alt'},
    ],
    'foundations': F,
    'themes': themes_out,
    'cards': cards_out,
    'scenes': scenes_out,
    'proverbs': prov_out,
}
json.dump(out, open(f'{REPO}/assets/data/apprendre_v2.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('fondations', len(F), 'thèmes', [(t['id'], t['count'], len(t['cards'])) for t in themes_out])
print('cartes', len(cards_out), 'scènes', len(scenes_out), 'proverbes', len(prov_out))
import os
print(os.path.getsize(f'{REPO}/assets/data/apprendre_v2.json') / 1e6, 'Mo')
