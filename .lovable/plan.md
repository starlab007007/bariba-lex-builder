

# Plan : UX claire de l'enregistrement + Thèmes mieux détaillés

## A. Parcours utilisateur du micro — états explicites

Aujourd'hui le bouton micro a 3 états (idle / recording / hasRecording) mais l'UX manque de clarté visuelle et de contrôles intermédiaires. Refonte en **5 états visibles** avec panneau de contrôle dédié :

```text
┌──────────────────────────────────────────────────────────────┐
│ État 1 : IDLE (avant l'enregistrement)                       │
│   Gros bouton 🎙️ rouge "Commencer l'enregistrement"         │
│                                                              │
│ État 2 : RECORDING (en cours)                                │
│   • Bandeau rouge pulsant en haut de la carte               │
│     "🔴 Enregistrement en cours · 00:07"                    │
│   • Visualiseur d'onde audio (barres animées)               │
│   • 3 boutons :                                              │
│     [⏸ Pause]  [⏹ Terminer]  [✖ Annuler]                  │
│                                                              │
│ État 3 : PAUSED                                              │
│   • Bandeau orange "⏸ En pause · 00:07"                     │
│   • [▶ Reprendre]  [⏹ Terminer]  [✖ Annuler]               │
│                                                              │
│ État 4 : RECORDED (audio prêt à écouter)                     │
│   • Bandeau vert "✓ Enregistré · 00:07"                     │
│   • Lecteur audio natif visible (pas caché)                 │
│   • 4 boutons :                                              │
│     [▶ Écouter]  [🔁 Reprendre/Refaire]  [✓ Valider & suivante]  [⏭ Passer] │
│                                                              │
│ État 5 : SUBMITTING                                          │
│   Spinner + "Envoi de votre voix…"                          │
└──────────────────────────────────────────────────────────────┘
```

**Implémentation technique** :
- Utiliser `pauseRecording`/`resumeRecording` déjà exposés par `useAudioRecorder`
- Ajouter un état local `phase: 'idle' | 'recording' | 'paused' | 'recorded' | 'submitting'`
- Lecteur audio rendu **visible** avec `<audio controls>` natif quand `phase === 'recorded'`
- Visualiseur simple : 5 barres CSS animées (pas de Web Audio API requise, on garde léger)
- Tous les boutons portent un **label texte** en plus de l'icône (plus clair pour utilisateurs non-techs)
- Tooltip sur chaque action

## B. Thèmes détaillés

**Constat** : 1959 phrases dans "Autres" + catégories trop génériques. À ajouter / re-mapper :

| Nouveau thème | Mots-clés détecteurs (FR + BA) |
|---|---|
| 🛒 **Marché & Achat** | marché, vendre, acheter, prix, payer, dwa, dɔra, gobi |
| 🌾 **Agriculture** | champ, gberɔ, igname, mil, sorgho, banane, mangue, planter, semer, récolter, gɔɔ |
| ⚽ **Sport & Jeux** | football, courir, jouer, match, balle, sãa |
| ✈️ **Voyage & Déplacement** | voyage, route, voiture, vélo, partir, arriver, turi, swĩi |
| 🕌 **Religion & Tradition** | dieu, prier, mosquée, église, musulman, chrétien, fête, arufaaru |
| 🏛️ **Loi & Administration** | (déjà existant Foncier) + élargir aux articles civils |
| 🐄 **Animaux & Nature** | vache, chèvre, mouton, oiseau, arbre, forêt, naa, gum |
| 🌧️ **Météo & Saisons** | pluie, soleil, vent, chaud, froid, saison |
| 🏠 **Maison & Vie quotidienne** | maison, cuisiner, dormir, eau, feu, lampe, kpuna |
| 💼 **Travail** | (déjà existant, conserver) |
| 👶 **Enfance & Éducation** | (existant) |

**Total cible** : ~20 catégories bien équilibrées au lieu de 15 dont une fourre-tout.

**Implémentation** :
1. **Migration SQL** : script de re-classification qui parcourt `bariba_corpus_phrases` où `category='Autres'`, applique des règles `LIKE` / `ILIKE` sur `text_french` ET `text_bariba`, et met à jour la catégorie.
2. **Ordre des règles** : du plus spécifique au plus général ; chaque phrase n'est re-mappée qu'une fois.
3. Garder "Autres" pour les vrais résiduels (<300 phrases attendues).

## C. UI sélecteur de thème

- Remplacer la liste plate de pills par un **sélecteur en 2 niveaux** :
  - Ligne du haut : **5 macro-thèmes** (📅 Quotidien · 🎓 Apprendre · ⚖️ Société · 🌍 Nature · 🎭 Culture)
  - En dessous : sous-thèmes filtrés selon le macro-thème choisi
- Affiche le **nombre de phrases restantes** sur chaque pill : `Marché (147)`
- Icône emoji devant chaque catégorie pour reconnaissance visuelle rapide

## Fichiers modifiés

- **`src/pages/fitila/FitilaVoiceLab.tsx`** : refonte UI micro (5 phases) + sélecteur 2 niveaux + lecteur audio visible
- **`src/hooks/useVoiceCorpus.ts`** : ajout du `count` par catégorie + groupement macro/sous-thème
- **Migration SQL** : `reclassify_autres_into_themes.sql` qui ré-attribue les ~1700 phrases d'« Autres » dans les nouvelles catégories par mots-clés FR/BA
- **`CATEGORY_COLORS`** étendu avec les nouvelles entrées + mapping macro-thème

## Garanties

- **Aucune perte de données** : la re-classification est une simple `UPDATE category` (réversible)
- **Compatibilité ascendante** : les enregistrements existants pointent toujours vers les mêmes `phrase_id`
- **Pause/reprise audio** réellement fonctionnels (méthodes natives MediaRecorder déjà câblées dans le hook)
- **Visualisation claire** à chaque état : impossible de se demander "est-ce que ça enregistre ?"

