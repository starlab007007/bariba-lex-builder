# Mission : écrire des scènes de vie bariba (Bàátɔ̀nú) à partir de phrases ATTESTÉES

Dossier de travail : ce dossier (`scenes/`). Outils :
- `python3 search.py --fr "regex" [--ba "regex"] [--expr] [--max 60]` : cherche dans les 7 530 phrases d'exemple du
  dictionnaire bariba-français (et, avec --expr, les expressions-entrées comme les salutations). Sortie :
  `REF | p.PAGE | statut | EX/EXPR | BARIBA || FRANÇAIS`.
- `python3 validate.py out_XX.json --fix` : vérifie que chaque réplique bariba existe telle quelle dans le dictionnaire,
  complète `src`, `ref`, `status`, et signale les adaptations de français. Il doit finir avec 0 erreur.

## Règle absolue
Chaque réplique bariba (`ba`) est une phrase du dictionnaire recopiée À L'IDENTIQUE (copier-coller depuis la sortie de search.py).
Aucune phrase bariba inventée, modifiée, raccourcie ou assemblée. Le français (`fr`) reprend la traduction du dictionnaire ;
seules des corrections de typo/espaces sont permises (ex. « L’hommelà » → « L’homme-là »), jamais un changement de sens.
Pour relier les répliques et rendre la scène cohérente, utilise des lignes de narration en FRANÇAIS seulement :
`{"who": "narrator", "fr": "Le vendeur pèse les ignames."}` (pas de champ ba).

## Qualité attendue
- Chaque scène raconte une situation de vie réelle au Borgou/Alibori, de bout en bout (arrivée, échange, conclusion).
- 8 à 14 répliques bariba par scène, réparties entre deux personnages (`a` et `b`) de façon plausible ; 2 à 5 narrations.
- Choisis des phrases dont le sens colle vraiment à la situation et au personnage qui parle. Mieux vaut une narration
  de liaison qu'une réplique hors sujet.
- Préfère le statut `atteste` ; au plus 1 réplique sur 4 en `a_valider`.
- N'utilise pas deux fois la même phrase (dans tes scènes). Évite les phrases violentes, obscènes, insultantes,
  ou dont la traduction est tronquée, vide ou incompréhensible.
- Varie les niveaux : level 1 (phrases courtes, quotidien), 2, 3 (phrases longues, proverbes, registre soutenu).
- `vocab` : 4 à 6 mots-clés de la scène, pris dans le dictionnaire (cherche l'entrée : `--expr` ou le mot seul),
  au format {"ba","fr","ref"} ; `ba` = la forme de l'entrée, `fr` = sa définition courte.
- `culture` : 1 à 3 phrases en français sur l'usage culturel (salutations, respect des aînés, hospitalité, Gaani…),
  sans affirmation douteuse ; si tu n'es pas sûr, reste général.

## Format de sortie (fichier `out_XX.json`, XX = ton identifiant)
{
 "categories": [{"id": "marche", "title": "Marché & commerce", "summary": "Acheter, marchander, vendre sa récolte.", "icon": "storefront"}],
 "scenes": [{
   "id": "marche_ignames", "category": "marche", "title": "Acheter des ignames", "place": "Au marché de Parakou",
   "icon": "storefront", "level": 1,
   "intro": "Bio va au marché acheter des ignames pour la fête. Il salue la vendeuse avant de parler prix.",
   "roles": {"a": "Bio, le client", "b": "Gnon, la vendeuse"},
   "learner": "a",
   "lines": [
     {"who": "narrator", "fr": "Bio arrive devant l’étal de Gnon."},
     {"who": "a", "ba": "…", "fr": "…", "ref": "BA-01234"},
     {"who": "b", "ba": "…", "fr": "…", "ref": "BA-05678"}
   ],
   "culture": "…",
   "vocab": [{"ba": "tasu", "fr": "igname", "ref": "BA-06924"}]
 }]
}
Icônes permises (catégories et scènes) : wb_twilight, home, storefront, agriculture, favorite, directions_walk,
celebration, groups, water_drop, restaurant, school, forest, pets, handshake, local_hospital, child_care,
music_note, construction, nights_stay, payments, family_restroom, forum.
Prénoms bariba courants pour les rôles : Bio, Sabi, Gounou, Worou, Yérima, Gnon, Baké, Yon, Sika, Bona, Sanni, Guéra, Tamou, Yarou.

Termine par `python3 validate.py out_XX.json --fix` sans erreur, puis renvoie un court bilan : scènes produites,
nombre de répliques, nombre en a_valider, et les faiblesses éventuelles.
