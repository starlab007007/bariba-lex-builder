
# Refonte UX du Bouton Vocal — Dictionnaire & Traducteur

## Diagnostic UX Actuel : les 5 problèmes

### Problème 1 — L'utilisateur ne sait pas en quelle langue parler AVANT d'appuyer
Actuellement, la langue source (bariba/français) est déterminée par un toggle invisible dans le header du Traducteur (`translator.sourceLanguage`), ou par `searchDirection` dans le Dictionnaire. L'utilisateur doit naviguer ailleurs pour changer la langue, puis revenir au bouton. Il n'y a aucun indicateur visuel clair sur le bouton lui-même montrant "je vais parler en BARIBA" ou "je vais parler en FRANÇAIS".

### Problème 2 — Le bouton Envoyer n'existe pas encore au bon moment
Dans le Dictionnaire, le bouton mic est "appuyer pour démarrer → appuyer pour arrêter → envoi automatique". L'utilisateur doit deviner que le deuxième appui = envoi. Il n'y a pas de bouton ENVOYER distinct qui apparaît PENDANT l'enregistrement pour signaler que l'audio sera soumis à la fin. Dans le Traducteur, même problème.

### Problème 3 — Pas d'invitation à reparler après un résultat
Après qu'un mot soit trouvé dans le Dictionnaire ou une traduction complétée dans le Traducteur, l'interface ne propose pas clairement de "parler encore". L'utilisateur doit relire l'état de l'interface pour savoir s'il peut recommencer. Il n'y a pas de bouton "🎤 Parler à nouveau".

### Problème 4 — Sélection de langue fragmentée et peu visible
La sélection de la langue à parler est séparée de l'action vocale (toggle en haut, bouton mic en bas). Pour les utilisateurs à faible littératie (cible FITILA), cette séparation crée de la confusion. La règle "voice-first inclusive" exige que tout soit au même endroit.

### Problème 5 — Aucun état "prêt à recevoir" après envoi
Une fois l'audio envoyé et la réponse reçue, le bouton revient silencieusement à son état initial sans signaler "tu peux parler à nouveau". Sur mobile, cela ressemble à une application gelée.

---

## Nouvelle Architecture UX : le "Panneau Vocal Unifié"

### Concept central
Regrouper sur une seule carte : **la sélection de langue + le bouton micro + le bouton envoyer + l'invitation à reparler**, dans une séquence visuelle claire à 3 étapes :

```text
ÉTAPE 1 (repos) :      [🇧🇯 Bariba] [🇫🇷 Français]   ← choisir la langue
                              ↓
                         [🎤 Appuyer pour parler]
                         
ÉTAPE 2 (recording) :  [●●● en cours...] [⏹ ENVOYER]  ← pendant l'enregistrement
                              ↓
ÉTAPE 3 (résultat) :   [✅ Transcrit] [🎤 Parler encore] ← après succès
```

---

## Fichiers à Modifier

### 1. Nouveau composant `VoiceLangPanel.tsx`

Créer `src/components/tamtam/VoiceLangPanel.tsx` — un panneau vocal autonome avec :

**État REPOS :**
- Deux gros boutons de sélection de langue : `🇧🇯 Bariba` / `🇫🇷 Français` (pill buttons, 48px min, avec highlight sur la langue active)
- En dessous : un grand bouton micro coloré avec label en clair ("Appuyer pour parler" / "Tẹ̀ bọ́tìn...")
- Indicateur discret de la langue qui sera parlée ("Vous parlerez en Bariba")

**État ENREGISTREMENT (après premier appui) :**
- Visualiseur de niveau audio animé (barres verticales colorées en vert/rouge)
- Timer visible (0:01, 0:02...) en rouge
- Le bouton micro change de couleur (rouge pulsant)
- Un bouton "⏹ ENVOYER" apparaît à droite du micro — gros, vert, avec label "Envoyer"
- Message d'instruction : "Parlez... appuyez ENVOYER quand vous avez fini"

**État TRAITEMENT (après envoi) :**
- Spinner + message contextuel : "🎤 Transcription Bariba en cours..." ou "Réveil du service (~30s)..."
- Barre de progression indéterminée pour signaler l'activité

**État SUCCÈS (résultat reçu) :**
- Badge vert avec le texte transcrit entre guillemets : ✅ "yaari"
- Un bouton "🎤 Parler encore" centré, en couleur secondaire
- Animation d'entrée (bounce léger) pour attirer l'attention

**État ERREUR :**
- Badge rouge avec le message d'erreur court
- Bouton "🔄 Réessayer" en premier plan

### 2. `TamTamDictionary.tsx` — Intégration du panneau

**Changements :**
- Remplacer les toggles "Clavier / Vocal" actuels dans le header par un seul bouton "Mode Vocal 🎤" / "Mode Clavier ⌨️" dans la zone d'entrée
- En mode vocal : afficher `<VoiceLangPanel>` avec `onResult={handleVoiceCommand}`
- Le `VoiceLangPanel` gère lui-même le changement de `sourceLang` (bariba/français), plus besoin du `searchDirection` séparé pour le mode vocal

### 3. `TamTamTranslator.tsx` — Intégration dans le mode audio

**Changements :**
- En mode `audio`, remplacer le `TamTamMicButton` isolé par `<VoiceLangPanel>`
- Synchroniser la langue sélectionnée dans le panneau avec `translator.sourceLanguage` (bidirectionnel)
- Quand l'utilisateur change la langue dans le panneau → appeler `translator.swapLanguages()` si besoin
- Afficher la transcription bariba (`baribaTranscribedText`) directement dans le panneau en état SUCCÈS avant que la traduction n'apparaisse dans le chat

---

## Design détaillé du `VoiceLangPanel`

### Props
```typescript
interface VoiceLangPanelProps {
  defaultLang?: 'ba' | 'fr';
  onResult: (result: { audioBase64: string; transcription?: string; sourceLang: 'ba' | 'fr' }) => void;
  onLangChange?: (lang: 'ba' | 'fr') => void;
  isProcessingExternal?: boolean;       // le parent traite le résultat
  isWakingUp?: boolean;                 // pour afficher "réveil du service"
  lastTranscription?: string;           // texte transcrit à afficher en succès
  disabled?: boolean;
  uiLang?: 'ba' | 'fr';               // langue de l'interface elle-même (bariba ou français)
}
```

### Machine d'états interne
```text
idle → recording (premier appui sur micro)
recording → sending (appui sur ENVOYER ou dépassement 30s auto)
sending → success (transcription reçue)
sending → error (erreur STT)
success → idle (appui sur "Parler encore")
error → idle (appui sur "Réessayer")
```

### Comportement clé
- La sélection de langue n'est possible QU'en état `idle` (désactivée pendant enregistrement)
- Le bouton ENVOYER n'apparaît QU'en état `recording` (pour éviter les envois accidentels)
- En état `success`, le bouton "Parler encore" est le seul élément actionnable → focus naturel
- Durée minimum 2s toujours enforced, avec message d'erreur inline (pas seulement un toast)

---

## Comportement attendu end-to-end

**Dictionnaire (mode vocal Bariba → Français) :**
1. Utilisateur voit le panneau avec [🇧🇯 Bariba] sélectionné par défaut
2. Appuie sur le micro → enregistrement démarre, bouton ENVOYER apparaît
3. Parle "yaari" → le niveau audio s'anime
4. Appuie ENVOYER → spinner "Transcription Bariba..."
5. Succès : ✅ "yaari" + définition trouvée s'affiche dessous
6. Bouton "🎤 Parler encore" → retour à l'état idle, prêt pour un nouveau mot

**Traducteur (mode vocal Français → Bariba) :**
1. Utilisateur sélectionne [🇫🇷 Français] dans le panneau
2. Appuie micro → parle "comment vas-tu"
3. Appuie ENVOYER → STT français (Web Speech / Mistral)
4. Succès : ✅ "comment vas-tu" + traduction bariba dans le chat
5. Bouton "🎤 Parler encore" → prêt pour le prochain énoncé

---

## Fichiers à créer / modifier

| Action | Fichier | Description |
|---|---|---|
| Créer | `src/components/tamtam/VoiceLangPanel.tsx` | Panneau vocal unifié avec machine d'états |
| Modifier | `src/pages/tamtam/TamTamDictionary.tsx` | Intégrer VoiceLangPanel en mode vocal |
| Modifier | `src/pages/tamtam/TamTamTranslator.tsx` | Remplacer TamTamMicButton par VoiceLangPanel en mode audio |
