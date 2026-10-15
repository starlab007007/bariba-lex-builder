# Écoute de chaque contenu Baatɔnum dans Apprendre

## Règle distincte du module Classe

Classe utilise uniquement les enregistrements humains du circuit enseignant :
brouillon, soumission, validation puis publication. Son lecteur ne dépend pas
du lecteur synthétique d’Apprendre et ne possède aucun repli MMS ou Web Speech.
Il exige un statut `approved`, une version `is_current` et un fichier
`storage_available`, contrôlés dans la requête et dans la réponse. Sans voix
validée ou lors d’un fichier absent, l’écoute est indisponible ; aucun audio
n’est inventé. Les préécoutes privées du studio et de la validation restent
accessibles aux personnes habilitées avant publication.

Le contrôle du Supabase canonique le 15 octobre relève 766 prises approuvées,
courantes et disponibles dans Classe. Les tests navigateur couvrent les
statuts non publiables, l’écoute humaine et la panne sans repli synthétique.

## Diagnostic du 15 octobre 2026

Le Supabase canonique contient 6 540 entrées du catalogue et zéro prise humaine
publiée. Plusieurs boutons étaient conditionnés par un ancien réglage Meta et
pouvaient disparaître. Les tableaux, titres de leçon, choix, mots à ordonner,
corrections et résultats ne disposaient pas tous d'une écoute. Les thèmes
n'affichaient que les 120 premiers mots sans commande pour charger la suite.

Le contenu embarqué comporte 1 847 fiches, 10 fondations, 44 scènes et trois
proverbes. L'audit récursif relève 6 551 chaînes distinctes dans les champs
Baatɔnum explicites, dont des variantes et des titres absents du catalogue.
Ce nombre n'est pas un nombre d'enregistrements audio validés.

## Mise en œuvre

- Bouton avant chaque contenu Baatɔnum, avec arrêt et annulation de génération.
- Lecture humaine publiée prioritaire, y compris au premier clic pendant le
  chargement du manifeste ; échec de manifeste ou de fichier : repli MMS.
- Synthèse sur le service public `dunya-voice-turn`, en mode `speech_only`,
  exclusivement Baatɔnum. Aucun ancien réglage local Meta ni connexion à un
  compte n'est requis. Les quotas existants du service restent appliqués.
- Aucun audio généré à l'ouverture, ni génération de masse du catalogue.
- Cache mémoire borné des clips MMS et humains ; URL temporaires révoquées,
  arrêt à la navigation et coordination avec l'audio du traducteur/de l'IA.
- Les textes longs sont lus en fragments de 380 caractères au maximum.
- Fiches dépliables pour les exemples, pluriels, formes et conjugaisons ;
  commande pour afficher tous les mots d'un thème.

Les champs Baatɔnum explicites sont lus comme tels. Les paragraphes mixtes et
les tableaux sont segmentés sans changer le texte affiché : lexique issu du
contenu chargé, colonnes linguistiques, citations et morphèmes. Les traductions
françaises, numéros de page et annotations sont séparés de l'écoute Baatɔnum.
Les choix audio des exercices sont indépendants des boutons de réponse :
écouter ne sélectionne rien et ne modifie pas le score.

## Couverture vérifiée

Accueil/salutations et proverbes ; révision ; mots par thème et leurs détails ;
dix fondations avec exemples, paires, tableaux et ordre ; vocabulaire et lignes
successives des 44 scènes ; consignes comportant du Baatɔnum ; options,
construction, correction et bilan d'une séance. Le comparateur vocal conserve
son exigence de référence humaine : une synthèse n'y devient pas une référence
humaine de notation.

Tests : index de tous les champs structurés, conservation Unicode et du texte,
séparation des langues, morphèmes, options en alphabet latin ; Chromium mobile
et bureau, visiteur sans ancien réglage, priorité humaine, repli, erreur/quota,
annulation, changement de mot, navigation et accès aux mots après le 120e.

## Qualité des sources

L'écoute synthétique ne valide ni les tons ni la qualité d'une entrée. Les
statuts « à confirmer » sont conservés. L'audit a notamment repéré la fiche
BA-07155, déjà `a_valider`, dont un exemple mélange un préfixe français et du
Baatɔnum ; cette anomalie d'import doit être arbitrée sur la source linguistique.
Le présent changement ne réécrit pas automatiquement les données pédagogiques.
Les voix humaines nécessitent enregistrement, validation et publication par le
workflow existant. Aucun secret ni nouveau droit public sur les tables privées
n'est ajouté, et aucun enregistrement utilisateur n'est créé par cette écoute.
