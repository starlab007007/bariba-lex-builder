
# Plan : Fichier d'internationalisation complet pour la plateforme FITILA

## Contexte

La plateforme FITILA contient des centaines de textes visibles en francais, repartis dans plus de 50 fichiers de composants et pages. Actuellement, une partie utilise deja le systeme `useFitilaLanguage()` avec un dictionnaire dans `FitilaLanguageContext.tsx` (~150 entrees), mais la majorite des textes sont **codes en dur** directement dans les fichiers JSX.

## Ce que je vais creer

Un fichier JSON unique `public/i18n-platform.json` contenant **tous les textes visibles** de la plateforme, organises par page/section, avec la structure :

```text
{
  "cle_unique": {
    "fr": "Texte en francais",
    "ba": ""   <-- Vous remplirez manuellement la traduction Bariba
  }
}
```

## Inventaire exhaustif des textes trouves (par page/section)

### 1. Menu lateral (FitilaApp.tsx)
- Navigation, Accueil, Profil, ACTIF
- Outils : Dictionnaire, Traducteur, Apprendre, Fitila IA
- Descriptions : FR ↔ Bariba, Voix & Texte, Langues locales, ChatGPT Bariba
- Langue, Francais, Bariba
- Administration, Tableau de bord, Gestion globale, Gestion Assets, Telecharger & Optimiser
- Parametres

### 2. Social / Feed (TamTamSocial.tsx)
- Patrimoine, Ma Voix, Creation
- Fil, Messages, Groupes, Live
- Creer, Choisissez une option
- Voix du Village, Annonces & Messages
- Culture & Traditions, Video Photo Journal
- Glisser
- Repondre, Remix, Partager, Sauver, Sauve
- Suivre, Utilisateur
- Pas d'audio, En attente de narration, EN DIRECT
- Conte Interactif, segments, fins, Jouer le conte
- Erreur chargement du conte
- Vitesse

### 3. Profil (TamTamProfile.tsx)
- Format invalide, Veuillez selectionner une image
- Fichier trop volumineux, La taille maximale est de 5MB
- Confirmer cette photo de profil ?
- Photo mise a jour, Votre photo de profil a ete modifiee
- Bio enregistree, Votre bio audio a ete sauvegardee
- Publication modifiee, Publication supprimee
- Publication publique, Tout le monde peut voir cette publication
- Publication privee, Seul vous pouvez voir cette publication
- Profil mis a jour
- Statistiques Vocales, Enregistrements, Duree totale, Vues stories, J'aime recus
- Mes Stories

### 4. Authentification (TamTamPhoneAuth.tsx)
- Votre numero, Effacer, Continuer, Chargement...
- Numero trop court, Entrez un numero de telephone valide
- Comment vous appelez-vous ?, Votre nom ou pseudo, Dicter mon nom
- Nom requis, Entrez votre nom ou pseudo
- Presentez-vous vocalement
- Enregistrez un message audio pour vous presenter a la communaute (optionnel)
- Bio enregistree !, Passer, Terminer, Creation...
- Connexion reussie, Bienvenue sur TAM-TAM !
- Compte cree !, Bienvenue sur TAM-TAM
- Erreur, Impossible de creer le compte. Veuillez reessayer.
- Redirection vers TAM-TAM...

### 5. Fitila IA (FitilaIA.tsx)
- Assistant intelligent en Bariba
- Posez vos questions en Bariba
- Erreur de connexion, Erreur de traduction
- Traduction..., Traduire en francais, Francais
- Reponse en francais (traduction bariba indisponible)
- Transcription impossible

### 6. Apprendre (FitilaLearn.tsx + learningConfig.ts)
- Bienvenue / Sia kanu, Choisissez votre langue maternelle
- Je parle Francais, Je veux apprendre le Bariba
- Vous apprendrez : Systeme tonal, Ordre SOV, Classes nominales, Culture bariba
- Apprenant, Apprendre le Bariba
- Connectez-vous pour sauvegarder votre progression
- Votre evolution sera conservee entre vos sessions, Connexion
- A venir, Mode editeur
- Exemples, Corriger, Suggerer
- Question, Signaler une erreur
- questions
- Toutes les cles de `learningConfig.ts` (dashboard, score, xp, level, etc.)

### 7. Dictionnaire (TamTamDictionary.tsx)
- Dictionnaire, Clavier, Vocal
- mots, Chargement..., pts
- Tapez un mot bariba, Tapez un mot francais
- Tapez un mot bariba..., Tapez un mot francais...
- Recherches recentes, Chargement du dictionnaire...
- Transcription echouee, Aucun mot detecte
- Mode vocal, Mode clavier
- Bariba vers Francais, Francais vers Bariba
- Mot non trouve

### 8. Traducteur (TamTamTranslator.tsx)
- Traducteur IA
- Voix, Texte, Photo, Coller, Doc
- Detection auto, Mode conversation
- Bienvenue!, Je traduis entre Francais et Bariba
- Detection automatique, Mode conversation
- Historique, Rechercher...
- Recent, Favoris, Aucun historique, Aucun favori
- Effacer tout l'historique, Effacer
- Traduction en cours...
- Detecte: Bariba / Francais
- Tapez dans n'importe quelle langue...
- Photographier, Coller et traduire, Importer document
- Transcription echouee, Aucun texte detecte

### 9. Radio (FitilaRadio.tsx)
- RADIO FITILA, Diffuser en direct
- Voir en Bariba, Voir en Francais
- Source :
- Vitesse :
- J'aime le sujet, Commenter en vocal, Partager

### 10. Composants partages
- Tout (SearchToggle), Bariba → FR, FR → Bariba
- Textes dans les composants Kuaishou (profil, stats, actions)
- Textes des modals (commentaires, communautes, messages)

## Etapes d'implementation

### Etape 1 : Creer le fichier `public/i18n-platform.json`
Fichier JSON complet avec toutes les cles organisees par section, chaque entree ayant `fr` rempli et `ba` vide.

### Etape 2 : Creer un hook `useI18n`
Un hook simple qui charge le fichier JSON et retourne une fonction `t(key)` basee sur la langue selectionnee dans `FitilaLanguageContext`.

### Etape 3 : Remplacer les textes codes en dur
Modifier systematiquement chaque page et composant pour utiliser `t('cle')` au lieu du texte en dur.

## Livrable immediat

Pour cette premiere phase, je vais **uniquement creer le fichier JSON complet** avec toutes les cles et les textes francais. Vous pourrez ensuite :
1. Telecharger le fichier
2. Traduire chaque entree `"ba": ""` en bariba
3. Re-uploader le fichier traduit
4. Je brancherai ensuite le systeme pour que la plateforme utilise les traductions

## Estimation
- ~400+ cles de traduction couvrant toute la plateforme
- Fichier organise par sections pour faciliter la traduction manuelle
