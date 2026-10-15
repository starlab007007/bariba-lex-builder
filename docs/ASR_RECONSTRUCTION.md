# Reconstruction linguistique après reconnaissance vocale

La reconnaissance Omnilingual (ou le moteur Bariba de secours) reste la source
du texte brut. La nouvelle couche `reference-v1` recherche des formulations
existantes plutôt que de demander à un modèle généraliste d’inventer une
phrase naturelle.

## Méthode

1. Normalisation Unicode NFC et espaces uniquement. Aucun mot reconnu n’est
   remplacé automatiquement.
2. Recherche par trigrammes dans les phrases actives, le dictionnaire, ses
   formes/exemples, le catalogue Apprendre et le JSON des contenus Apprendre.
   Les références sont lues en direct ; aucune copie périmée à synchroniser.
3. Classement par distance d’édition, rapprochement approximatif des graphies
   (tons et ɔ/o, ɛ/e, ʋ/u, ŋ/ng, ɲ/ny), et recouvrement des mots. La nasalisation
   n’est pas effacée de la clé de recherche. Le texte proposé garde les graphies
   originales de la ressource.
4. Rejet des changements de nombres, identifiants, négations, pronoms recensés
   et noms capitalisés à l’intérieur de la phrase. Limitation des ajouts/retraits
   et rejet des références visiblement étrangères à la langue ou invalides.
   Ces gardes ne prouvent pas l’équivalence sémantique de toutes les phrases.
5. Proposition de trois formulations au maximum. Les fragments très proches et
   non ambigus peuvent former un brouillon complet. Plusieurs candidats proches
   restent présentés comme ambigus. Une phrase déjà présente n’est pas réécrite.
6. Confirmation dans le frontend avant substitution. Le texte brut reste
   consultable, le choix peut être annulé et une modification manuelle n’est
   jamais écrasée.

Le classement est heuristique : son score n’est pas une probabilité de justesse.
Il ne dispose ni des logits ni d’une liste d’hypothèses acoustiques Omnilingual.
Il ne constitue ni un nouvel entraînement du modèle ni une certification de la
grammaire Baatɔnum. Aucun appel Mistral/Gemini n’est requis pour cette couche.

## Ressources réellement observées le 15 octobre 2026

- Dictionnaire : 7 525 entrées ; zéro `is_verified=true`, zéro phonétique,
  exemple ou paradigme de conjugaison renseigné dans cette table.
- Corpus : 8 708 phrases actives. `is_active` n’est pas une validation native.
- Catalogue Apprendre : 6 540 éléments présents dans les contenus, dont des
  formes, des mots, des exemples, des leçons et des scènes.
- Contenus Apprendre : modules `core` et `scenes`, également interrogés.
- Aucune prise humaine publiée dans `apprendre_audio_published` à cet audit.

Les propositions indiquent leur provenance et restent à confirmer. Les statuts
en attente/rejetés du contenu et les éléments faisant l’objet d’un signalement
non résolu sont écartés lorsqu’ils sont identifiables. La mémoire de traduction
sans validation explicite et les retours utilisateurs non validés ne servent
pas de références de correction.

## Intégration

- `dunya-voice-turn` émet `analyzing_transcript`, puis un événement `transcript`
  contenant `text` normalisé, `raw_text` et `repair`. Le modèle conversationnel
  ne reçoit jamais automatiquement une proposition lexicale.
- `bariba-stt` et `refine-bariba` en mode transcription réutilisent le même
  mécanisme. Le vieux score 84–97 % calculé à partir des diacritiques est retiré :
  le champ numérique historique vaut zéro, marqué `not-measured`, sans portée
  probabiliste. Les traductions conservent leur pipeline distinct.
- Traducteur, FITILA IA et ancien assistant : comparaison source/proposition,
  choix explicite, retour au texte reconnu et protection du brouillon.
- DUNYA : même comparaison quand la vérification avant envoi est activée.

Le RPC et la vue de références sont réservés à `service_role`, avec exécution
en droits de l’appelant et `security_invoker` sur la vue. Aucun nouvel accès
aux tables n’est accordé aux visiteurs ou aux comptes ordinaires. Aucun audio,
texte utilisateur ou retour de validation n’est enregistré par cette couche.

Les recherches sont limitées à 24 passages de 220 caractères et 24 références
par passage. La comparaison dispose d’un délai total de cinq secondes et de
quotas serveur propres. Un échec de ressources, une limite ou une annulation
conserve le texte reconnu. La lecture MMS seule n’appelle pas cette recherche.

## Évaluation

Les tests couvrent des variantes synthétiques de phrases réelles, les nombres,
les noms, les négations, les pronoms, l’ambiguïté, les ressources indisponibles,
les brouillons édités et le parcours navigateur de confirmation/annulation.
Exemples : `Agede ye ya do` → proposition `Agɛdɛ ye ya do.` ;
`Nim mu bo yiba` → proposition `Nim mu boo yiba.`.

Ces tests ne mesurent pas la précision sur des enregistrements humains. Pour
la certifier, constituer un jeu audio indépendant avec transcription de
locuteurs Baatɔnum, dialecte/bruit/situation documentés, puis comparer WER/CER
bruts et proposés ainsi que le taux de changements de sens, avec arbitrage
humain. Les corrections acceptées dans un brouillon ne deviennent pas
automatiquement des références d’entraînement.
