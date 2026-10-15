# Formulations sourcées du traducteur

Le traducteur dispose d’une comparaison sur demande avant traduction et sur
chaque réponse. Les boutons « Comparer aux ressources », « Appliquer la
proposition » et « Rétablir » permettent un choix explicite. Le texte initial,
la provenance et les références restent consultables. La copie et la lecture
vocale utilisent la formulation choisie de la réponse concernée.

## Recherche

- Réutilisation serveur des références en direct du dictionnaire, des phrases
  actives et des contenus Apprendre, sans ajouter de droit public sur les tables.
- Comparaison de graphie, distance d’édition, rapprochement approximatif des
  lettres et recouvrement des mots ; reprise des graphies de la référence.
- Proposition d’une inversion adjacente uniquement si une phrase existante
  contient les mêmes mots. Cette proximité ne prouve pas le maintien du sens.
- Recherche lexicale des mots isolés dans les entrées/formes. Lettres manquantes
  ou variantes proches : une modification au maximum pour les mots de quatre
  à sept caractères, deux pour les mots plus longs, avec un seuil de proximité.
  Les mots courts et les mots capitalisés ne sont pas corrigés isolément.
- Contrôle des nombres, négations et pronoms recensés, identifiants et mots
  capitalisés. Le premier mot capitalisé est également protégé, à l’exception
  d’une graphie à clé phonétique équivalente. Ce repérage reste heuristique.
- Pour une proposition sur le résultat traduit, la référence cible doit disposer
  d’une référence source de même origine et identifiant, elle-même proche du
  texte demandé. Sans cette preuve bilingue, la proposition est retirée.

La recherche ne remplace pas le moteur ByT5 et ne requiert ni Mistral ni Gemini.
Elle ne fabrique pas une grammaire Baatɔnum à partir de mots isolés. Les phrases
non couvertes restent inchangées ; les alternatives restent à confirmer par
l’utilisateur. Les erreurs initiales d’une référence peuvent subsister : le
catalogue n’est pas une certification linguistique.

## Limites et exploitation

Entrée de 4 000 caractères au maximum ; douze passages et un total de vingt-quatre
recherches par requête. Les passages et mots non examinés sont conservés, et les
comptages ne portent que sur les mots effectivement recherchés. Recherche sur
clic pour éviter de solliciter la base à chaque frappe. Quotas persistants
indépendants : 60 comparaisons/minute et 1 500/jour globalement. Délai global de
huit secondes, dont cinq pour la recherche initiale.

Un brouillon modifié pendant/après la recherche ne reçoit pas une ancienne
proposition. Un changement de langue ou un démontage du composant annule la
requête. Les choix ne deviennent pas automatiquement des données d’entraînement.
Aucun nouvel enregistrement d’audio, de texte utilisateur ou de retour n’est
créé par cette couche. L’historique existant conserve la traduction initiale ;
le choix de reformulation concerne la réponse visible de la session.

Les tests synthétiques vérifient les protections, les mots incomplets,
l’inversion adjacente, la provenance bilingue, l’annulation et les contrôles
vocaux du résultat affiché. Le gain réel de naturalité et de fidélité
nécessite encore un jeu de références indépendant et une évaluation par des
locuteurs Baatɔnum. Aucun score de similarité n’est affiché comme une probabilité.
