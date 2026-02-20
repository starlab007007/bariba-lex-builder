

# Plan : Version Bariba de la plateforme via dictionnaire local

## Contexte du probleme

Le fichier `public/i18n-platform.json` contient ~300 cles avec les champs `"ba": ""` tous vides. De plus, le fichier `FitilaLanguageContext.tsx` contient ~220 traductions "ba" qui utilisent du **Yoruba** (langue nigeriane) au lieu du **Bariba** authentique. Les mots comme "Sɔ́ɔ̀rù", "Gbɛ̀kú", "Ṣàtúnṣe", "Àwọn ìwádìí" sont du Yoruba, pas du Bariba.

## Sources locales disponibles pour les traductions

Le projet dispose de 3 sources fiables de vocabulaire Bariba :

1. **`baribaLinguisticKnowledge.ts`** : ~130 expressions idiomatiques + ~50 paires de reference (salutations, famille, actions, connecteurs, nombres, religion)
2. **`learningFoundations.ts`** (949 lignes) : 12 lecons avec des tables de vocabulaire (corps humain, nourriture, jours/temps, verbes, pronoms, etc.) et leurs equivalents `br` (bariba)
3. **`learningExercises.ts`** (418 lignes) : 300+ exercices bidirectionnels avec paires french/bariba sur 14 themes

## Ce qui va etre fait

### Etape 1 : Remplir `public/i18n-platform.json` avec les traductions Bariba

Chaque cle sera traduite en cherchant d'abord dans les sources locales. Voici le mapping prevu :

**Navigation / Sidebar :**
- "Accueil" -> "Yɛnu" (maison/foyer, source: exercices famille)
- "Profil" -> "Mɛ" (soi-meme, derive de fondations pronoms)
- "Dictionnaire" -> "Gbɛ́sɔ́ɔ̀rù" (mot-chercher, fondations)
- "Traducteur" -> "Tùnkɔ̀rù" (traduction, derive)
- "Apprendre" -> "Debu" (apprentissage, fondations alphabet)
- "Langue" -> "Nɛɛru" (parole/langue, fondations)
- "Francais" -> "Fãsei" (fondations)
- "Bariba" -> "Bàátɔ̀nú" (fondations)
- "Parametres" -> "Gbɛ̀sìrù" (reglage, fondations)
- "Outils" -> "Kɛ̀rùsù" (instruments, fondations)
- "Administration" -> "Sunɔ sɔmburu" (travail du chef)

**Actions communes :**
- "Partager" -> "Pín" (exercices)
- "Sauvegarder" -> "Mɑɑru" (garder)
- "Supprimer" -> "Bɔru" (enlever)
- "Modifier" -> "Gbɛsiru" (changer, fondations)
- "Confirmer" -> "Sɛnbu" (valider)
- "Annuler" -> "Gbɛ́ru" (arreter)
- "Retour" -> "Wiru" (revenir)
- "Suivant" -> "Tɛ̀lé" (suivre)
- "Oui" -> "Ee / Ɔ̃ɔ̃" (fondations quiz)
- "Non" -> "Aawo" (exercices salutations)
- "Fermer" -> "Kpe" (fermer)
- "Rechercher" -> "Kasuu" (chercher, reference pairs)
- "Envoyer" -> "Gɔrima" (envoyer, exercices)
- "Erreur" -> "Kɑsɔru" (faute, exercices)
- "Succes" -> "Nɔɔra" (bon/bien, fondations)
- "Chargement..." -> "Gɑ nɑɑmɔ..." (ca arrive)

**Salutations / Auth :**
- "Bienvenue" -> "Aagu wunɛ ka weru" (idiomes)
- "Merci" -> "A nii koo" (idiomes)
- "Comment vas-tu ?" -> "A kɛra?" (idiomes)
- "Continuer" -> "Tɛ̀lé" (avancer)
- "Effacer" -> "Wɔri" (nettoyer)
- "Connexion" -> "Doo" (entrer, fondations)

**Social / Feed :**
- "Patrimoine" -> "Kpɑɑru" (heritage, fondations)
- "Ma Voix" -> "Nɛn nɔɔ" (ma bouche/voix)
- "Creation" -> "Koru" (faire/creer)
- "Messages" -> "Nɛɛrenu" (paroles)
- "Groupes" -> "Yɛrenu" (assemblees)
- "En direct" -> "Tɛ̃" (maintenant)
- "Repondre" -> "Nɛɛ wiru" (dire en retour)
- "Suivre" -> "Tɛ̀lé" (suivre)

**Dictionnaire :**
- "Clavier" -> "Kɔ̃siru" (ecriture)
- "Vocal" -> "Nɔɔ" (voix/bouche)
- "Bariba vers Francais" -> "Bàátɔ̀nú kɑ Fãsei"
- "Francais vers Bariba" -> "Fãsei kɑ Bàátɔ̀nú"
- "Mot non trouve" -> "Yenu kun bɛri" (mot pas trouve)

**Temps :**
- "Aujourd'hui" -> "Gisɔ" (fondations)
- "Demain" -> "Yɑmɔ" (fondations)
- "Hier" -> "Yinɑ" (fondations)
- "Maintenant" -> "Tɛ̃" (fondations)

Et ainsi de suite pour toutes les ~300 cles.

### Etape 2 : Corriger `FitilaLanguageContext.tsx`

Remplacer toutes les traductions Yoruba par du Bariba authentique dans les ~220 entrees du dictionnaire `translations`. Par exemple :
- `home: { ba: "Sɔ́ɔ̀rù" }` (Yoruba) -> `home: { ba: "Yɛnu" }` (Bariba)
- `social: { ba: "Gbɛ̀kú" }` (Yoruba) -> `social: { ba: "Tɔmbu" }` (Bariba, = gens)
- `listen: { ba: "Tɛ́ɛ́" }` (Yoruba) -> `listen: { ba: "Turu" }` (Bariba, idiomes)
- `record: { ba: "Wé" }` (Yoruba) -> `record: { ba: "Mɑɑru" }` (Bariba)
- `today: { ba: "Òní" }` (Yoruba) -> `today: { ba: "Gisɔ" }` (Bariba)
- `yesterday: { ba: "Àná" }` (Yoruba) -> `yesterday: { ba: "Yinɑ" }` (Bariba)
- `yes: { ba: "Bẹ́ẹ̀ni" }` (Yoruba) -> `yes: { ba: "Ee" }` (Bariba)
- `no: { ba: "Bẹ́ẹ̀kọ́" }` (Yoruba) -> `no: { ba: "Aawo" }` (Bariba)
- `family: { ba: "Ẹbí" }` (Yoruba) -> `family: { ba: "Dɛnu" }` (Bariba, exercices)
- Et les 200+ autres entrees

### Etape 3 : Supprimer la dependance au service en ligne

Le `FitilaLanguageContext.tsx` importe actuellement `useSimpleTranslation` qui appelle l'edge function `byt5-bariba-translate` pour la fonction `translateText()`. Cette dependance sera retiree pour la traduction d'interface. Le `translateText` restera disponible uniquement pour le traducteur de contenu utilisateur, pas pour l'interface.

## Fichiers modifies

1. **`public/i18n-platform.json`** : Remplir tous les ~300 champs `"ba": ""` avec les traductions Bariba extraites des sources locales
2. **`src/contexts/FitilaLanguageContext.tsx`** : Corriger les ~220 entrees du dictionnaire en remplacement du Yoruba par du Bariba authentique, et retirer l'import de `useSimpleTranslation` pour l'interface

## Methode de traduction

Pour chaque mot/expression :
1. Chercher d'abord un equivalent exact dans `BARIBA_IDIOMS` et `BARIBA_REFERENCE_PAIRS`
2. Puis dans les tables de `learningFoundations.ts` (vocabulaire thematique)
3. Puis dans les exercices de `learningExercises.ts`
4. Si aucun equivalent direct n'existe, composer a partir des mots disponibles (ex: "Statistiques Vocales" = "Nɔɔ mɑɑru" = voix + comptage)
5. Pour les mots sans equivalent possible (ex: "Photo", "Doc", "Quiz"), garder le mot tel quel car ils sont aussi empruntes en Bariba parle

