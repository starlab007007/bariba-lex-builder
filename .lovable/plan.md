

# Module "Lecture Vocale des Contenus" — Plan d'implémentation

## 1. Vue d'ensemble

Nouveau module enseignant (`/fitila/teacher/voice-reading`) permettant d'enregistrer un audio pour CHAQUE élément pédagogique des manuels N1 et N2, avec workflow complet : enregistrement → réécoute → soumission → validation admin → diffusion publique avec bouton "🔊 Écouter" sur chaque texte/phrase/question/leçon côté apprenant.

**Réutilise l'infrastructure audio existante** : pipeline WAV 16kHz mono déjà en place (`audioToWav.ts`, `audioVad.ts`, `useAudioRecorder.ts`), bucket Storage (`bariba-voice-corpus` → nouveau `classe-audio`), patterns admin (`VoiceRecordingsBrowser`).

## 2. Architecture des données

### A. Identification universelle d'un élément pédagogique

Chaque élément reçoit un **content_key** déterministe et stable :

```text
classe/{level}/{module}/{lessonId}/{section}/{index}
```

Exemples :
- `classe/N1/lang/1/text` — texte narratif de la leçon 1
- `classe/N1/lang/1/observe/0` — 1ère question observe leçon 1
- `classe/N1/lang/1/phonetics/reading/3` — 4e ligne phonétique
- `classe/N1/eval/2/q/5` — question 6 de l'évaluation 2
- `classe/N2/calcul/7/exercise/2` — exercice math 3 de la leçon calcul 7
- `classe/N1/lang/1/word/koto` — mot isolé (pour répétition)

**Avantage** : pas de migration des contenus existants (qui restent en `src/data/classeContent.ts`), juste un mapping clé → audio.

### B. Nouvelle table `classe_content_audios`

```text
id              uuid PK
content_key     text UNIQUE NOT NULL    -- voir format ci-dessus
content_type    text NOT NULL           -- 'text'|'question'|'phonetic'|'word'|'exercise'|'instruction'
content_text    text NOT NULL           -- le texte source (snapshot)
level           text NOT NULL           -- 'N1'|'N2'
module          text NOT NULL           -- 'lang'|'calcul'|'eval'|'gestion'|'grammaire'|'textprod'
lesson_id       int
section_key     text
item_index      int
storage_path    text NOT NULL
file_name       text NOT NULL
duration_seconds numeric
peak_db         numeric
rms_db          numeric
quality_score   int                     -- 0-100 calculé client (RMS/peak/durée)
teacher_id      uuid NOT NULL → auth.users
status          text NOT NULL DEFAULT 'draft'  -- draft|submitted|approved|rejected
admin_id        uuid
admin_notes     text
reviewed_at     timestamptz
version         int NOT NULL DEFAULT 1  -- auto-incrémenté à chaque ré-enregistrement
is_current      bool NOT NULL DEFAULT true  -- 1 seul current par content_key
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

**Index** : `(content_key, is_current)`, `(teacher_id, status)`, `(level, module, lesson_id)`, `(status)`.

**RLS** :
- Enseignant : SELECT/INSERT/UPDATE/DELETE sur ses propres lignes (`teacher_id = auth.uid()`) tant que `status IN ('draft','submitted')`
- Admin : ALL via `has_role(auth.uid(), 'admin')`
- Public (apprenant authentifié) : SELECT uniquement les `status='approved' AND is_current=true`

**Trigger** : à l'insertion d'une nouvelle version, marquer toutes les anciennes du même `content_key` à `is_current=false` (historique conservé pour audit).

### C. Bucket Storage

`classe-audio` (privé, accès via signed URL pour drafts/submitted, signed URL longue durée pour approved + cache CDN navigateur).

Structure : `{level}/{module}/{lessonId}/{content_key_hash}_v{version}.wav`

## 3. Côté Enseignant — `/fitila/teacher/voice-reading`

### Navigation hiérarchique (3 niveaux d'écran)

```text
ÉCRAN 1 — Sélecteur Niveau/Module
┌─────────────────────────────────────┐
│ 🎙️ Lecture Vocale des Contenus     │
│                                     │
│ Niveau 1                            │
│  📖 Langue (32 leçons)  [12/192] ━━ │
│  🔢 Calcul (24 leçons)  [3/96]   ━  │
│  📝 Évaluations (10)    [0/120]     │
│                                     │
│ Niveau 2                            │
│  📖 Langue (18 leçons)  [0/108]     │
│  🔢 Calcul (25 leçons)              │
│  📊 Gestion / Grammaire / Textes    │
└─────────────────────────────────────┘
```

Chaque ligne montre la progression `[enregistrés/total]` + barre.

### ÉCRAN 2 — Liste des leçons d'un module

```text
← Niveau 1 · Langue
┌─────────────────────────────────────┐
│ Filtres : [Tous] [À faire] [Soumis] │
│          [Approuvés] [Rejetés]      │
│                                     │
│ L1 · Tii dobonu          ✅ 6/6     │
│ L2 · Nim                  🟡 4/6     │
│ L3 · Wɔɔ bera             ⚪ 0/6    │
│ L4 · Bii mɛroru           ⚪ 0/6    │
│ ...                                  │
└─────────────────────────────────────┘
```

Statut par leçon = somme des items audio (icône verte si tous approved, jaune si en cours, gris si rien).

### ÉCRAN 3 — Lecteur/Enregistreur d'une leçon (cœur du module)

Un panneau gauche affiche tous les **items pédagogiques** de la leçon dans l'ordre exact du manuel ; un panneau droit affiche le studio d'enregistrement de l'item sélectionné.

```text
← L1 · Tii dobonu                                 [Mode auto-suite ▶]
┌───────────────────────────┬─────────────────────────────────────┐
│ ITEMS (cliquer)           │ STUDIO                              │
├───────────────────────────┤                                     │
│ ▶ 📖 Texte principal  ✅  │ Texte à lire (FR/BA toggle):        │
│   ❓ Observe Q1       🟡  │ ┌─────────────────────────────────┐ │
│   ❓ Observe Q2       ⚪  │ │ Tii dobonu                      │ │
│   👂 Écoute Q1        ⚪  │ │ Bɛɛrɛ sariru                    │ │
│   👂 Écoute Q2        ⚪  │ │ Sɔ̃ɔ sãreru ta torua. Saka...  │ │
│   👂 Écoute Q3        ⚪  │ │ [taille A+/A-] [surlignage mot] │ │
│   💬 Réagis Q1        ⚪  │ └─────────────────────────────────┘ │
│   💬 Réagis Q2        ⚪  │                                     │
│   🧠 Retiens Q1       ⚪  │     ╭─────────────────────╮         │
│   🔤 Phonétique L1    ⚪  │     │   🎙️  ENREGISTRER   │         │
│   🔤 Phonétique L2    ⚪  │     ╰─────────────────────╯         │
│   ...                     │     ▮▮▮▯▯▯▯▯ VU-meter -18dB        │
│                           │     "🎙️ Parlez maintenant"         │
│   Progression: 1/12       │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

**États du studio par item** :

| État | Affichage |
|------|-----------|
| `idle` | Texte + gros bouton 🎙️ "Enregistrer" |
| `recording` | VU-meter live, indicateur voix/silence/clipping, [⏸ Pause] [✓ Terminer] [✕ Annuler] |
| `processing` | Spinner "Conversion WAV 16kHz..." |
| `recorded` | Lecteur `<audio controls>` du WAV traité, qualité affichée (peak dB, durée, score 0-100), boutons [🔁 Refaire] [✏️ Modifier titre] [💾 Sauver brouillon] [✉️ Soumettre] |
| `submitted` | Badge "En attente validation", bouton [👁️ Voir détails] [↩️ Retirer] |
| `approved` | Badge vert "✓ Validé public", bouton [🔄 Nouvelle version] |
| `rejected` | Badge rouge + commentaire admin, bouton [🔁 Refaire] |

**Mode "Auto-suite"** (toggle en haut) : après validation d'un item, passe automatiquement au suivant non enregistré → permet d'enregistrer une leçon entière en flux continu.

**Indicateur qualité** :
- Score ≥ 80 → vert "Excellent" (auto-OK)
- 60–79 → orange "Acceptable, vous pouvez refaire"
- < 60 → rouge "À refaire" (clipping, silence trop long, RMS < -40dB)

## 4. Pipeline audio (réutilisation)

Aucun nouveau code audio à écrire :
- Capture : `useAudioRecorder` (déjà 16kHz mono + echoCancel + noiseSuppress + autoGain + highpass)
- Post-traitement : `audioToWav.ts` (highpass 80Hz + compresseur léger + noise gate -50dB + normalisation peak -3dBFS + WAV PCM 16-bit)
- VAD live : `audioVad.ts` (RMS, voice/silence/clipping)

**Ajouts mineurs** :
- Calcul `quality_score` côté client (formule : 100 - pénalités sur clipping, silence excessif, RMS faible, durée hors plage)
- Plage durée recommandée selon type : texte 5–60s, question 2–10s, mot 0.5–3s, exercice calcul 1–8s

## 5. Côté Administrateur

### Nouvel onglet `/admin/classe-audio` (ajouté à `AdminDashboard`)

Inspiré de `VoiceRecordingsBrowser` existant :

```text
┌────────────────────────────────────────────────────────┐
│ Filtres :                                              │
│ Niveau [N1▾] Module [Lang▾] Leçon [L1▾] Section [▾]   │
│ Statut [Soumis▾] Enseignant [Tous▾]    🔍 Recherche   │
├────────────────────────────────────────────────────────┤
│ ☐ N1·Lang·L1·texte    Mme Adjo   2.8s ⭐87  [▶][✓][✗]│
│ ☐ N1·Lang·L1·observe1 Mme Adjo   1.4s ⭐92  [▶][✓][✗]│
│ ☐ N1·Calcul·L3·count  M. Daouda  0.9s ⭐78  [▶][✓][✗]│
│ ...                                                    │
│                                                        │
│ [Tout sélectionner] [✓ Approuver lot] [✗ Rejeter lot] │
│ [⬇️ Export ZIP corpus complet]                         │
└────────────────────────────────────────────────────────┘
```

**Actions par ligne** :
- ▶ Lecteur audio inline + texte attendu affiché
- ✓ Approuver (passe `status='approved'`, `is_current=true`)
- ✗ Rejeter avec champ commentaire obligatoire
- 🔄 Voir historique des versions de ce content_key

**Vue "Couverture pédagogique"** : tableau croisé qui montre pour chaque leçon combien d'items sont approuvés / total, avec code couleur. Permet d'identifier les manques.

## 6. Côté Apprenant — Bouton "🔊 Écouter"

### Composant réutilisable `<ListenButton contentKey="..." />`

```tsx
<ListenButton contentKey="classe/N1/lang/1/text" />
```

Comportement :
1. Au mount : `useQuery` cherche audio approuvé pour ce `content_key` (cache React Query 30 min, IndexedDB persistent)
2. Si trouvé : icône 🔊 active, click = lecture instantanée via `<audio>` HTML natif
3. Si absent : icône 🔇 grisée + tooltip "Audio bientôt disponible"
4. Lecture : signed URL longue durée (24h, refreshée à la demande)

### Intégration dans les vues existantes

À ajouter dans :
- `ClasseLessonView.tsx` : bouton à côté du texte principal et de chaque question (observe/ecoute/reagis/retiens) et chaque ligne phonétique
- `ClasseEvaluation.tsx` : bouton à côté de chaque question
- `ClasseCalculView.tsx` : bouton à côté de chaque exercice math
- `ClasseGestionN2.tsx`, `ClasseGrammaireN2.tsx`, `ClasseTextProdN2.tsx` : bouton à côté de chaque texte/exercice

**Optimisations faible bande passante** :
- Préchargement leçon entière au survol/click sur la leçon (`<link rel="prefetch">`)
- Cache navigateur agressif (Cache-Control immutable côté Storage)
- Service Worker (PWA déjà actif) : cache audio approuvé pour offline
- WAV reste léger (~16 KB/s mono 16 kHz)
- Mode économie : option utilisateur "ne télécharger l'audio qu'au click"

## 7. Helper — génération exhaustive des content_keys

Nouveau fichier `src/lib/classeContentKeys.ts` qui parcourt `CLASSE_LESSONS`, `CLASSE_N2_LESSONS`, `CLASSE_EVALUATIONS`, `CALCUL_LESSONS`, `CALCUL_N2_LESSONS` et génère **la liste exhaustive de tous les content_keys** avec leur texte source, type et hiérarchie.

```ts
getAllContentItems() => Array<{
  content_key: string;
  content_type: 'text' | 'question' | 'phonetic' | 'exercise' | ...;
  content_text: string;
  level: 'N1' | 'N2';
  module: 'lang' | 'calcul' | 'eval' | ...;
  lessonId: number;
  section_key?: string;
  item_index?: number;
  hierarchyLabel: string;  // "N1 · Langue · L1 · Observe Q1"
}>
```

→ Source unique de vérité côté enseignant ET côté admin pour calculer la couverture.

## 8. Workflow complet (résumé)

```text
ENSEIGNANT                      ADMIN                       APPRENANT
─────────                       ─────                       ─────────
1. Choisit leçon
2. 🎙️ Enregistre item
3. ▶ Réécoute (WAV traité)
4. 💾 Brouillon OU
   ✉️ Soumet  ─────────→  📥 Reçoit dans queue
                          5. ▶ Écoute + lit texte
                          6. ✓ Approuve
                             OU ✗ Rejette + note
                                       ↓
   ←──── notification ────────────────┘
   (approuvé OU à refaire)
                                       ↓ si approved
                                       ↓ is_current=true
                                                            7. Voit 🔊 Écouter actif
                                                            8. Click → lecture instantanée
```

## 9. Bonus IA (optionnel, phase 2)

- **Transcription auto** post-enregistrement (Whisper via Lovable AI Gateway) → comparaison Levenshtein avec texte attendu → score de prononciation
- **Pré-écoute synthétique** : TTS Bariba (HF Space déjà configuré) pour aider l'enseignant à modéliser sa lecture avant d'enregistrer
- **Détection de mots manquants** : alerte si transcription < 70% de similarité

## 10. Fichiers à créer / modifier

**Migrations SQL**
- Nouvelle table `classe_content_audios` + RLS + trigger versioning
- Nouveau bucket `classe-audio` (privé) + policies

**Backend (edge function)**
- `supabase/functions/classe-audio-signed-url/index.ts` : génère signed URL longue durée pour lecture publique des audios approuvés (avec validation rôle apprenant)

**Données / helpers**
- `src/lib/classeContentKeys.ts` (nouveau) — générateur exhaustif des content_keys
- `src/hooks/useClasseAudio.ts` (nouveau) — CRUD enseignant + lookup apprenant + cache React Query
- `src/hooks/useClasseAudioCoverage.ts` (nouveau) — stats couverture par module/leçon

**Pages enseignant (nouvelles)**
- `src/pages/teacher/VoiceReadingHome.tsx` — sélecteur niveau/module
- `src/pages/teacher/VoiceReadingLessons.tsx` — liste leçons d'un module
- `src/pages/teacher/VoiceReadingStudio.tsx` — studio d'enregistrement (cœur)

**Composants enseignant (nouveaux)**
- `src/components/teacher/voice/ItemList.tsx` — panneau gauche items
- `src/components/teacher/voice/RecordingStudio.tsx` — panneau droit studio
- `src/components/teacher/voice/QualityBadge.tsx`
- `src/components/teacher/voice/AutoSuiteToggle.tsx`

**Modifications**
- `src/pages/teacher/TeacherLayout.tsx` — ajouter onglet "🎙️ Lecture Vocale"
- `src/App.tsx` — 3 nouvelles routes lazy

**Pages admin (nouvelles)**
- `src/pages/admin/ClasseAudioReview.tsx`
- `src/components/admin/ClasseAudioCoverage.tsx` — tableau couverture
- Ajout onglet dans `AdminDashboard.tsx`

**Composant apprenant (nouveau, intégré partout)**
- `src/components/classe/ListenButton.tsx`

**Modifications côté apprenant**
- `src/components/classe/ClasseLessonView.tsx` — `<ListenButton>` sur texte + sections + phonétique
- `src/components/classe/ClasseEvaluation.tsx` — sur chaque question
- `src/components/classe/ClasseCalculView.tsx` — sur chaque exercice
- `src/components/classe/ClasseGestionN2.tsx`, `ClasseGrammaireN2.tsx`, `ClasseTextProdN2.tsx` — idem

## 11. Garanties

- **1 élément = 1 audio approuvé** garanti par contrainte `(content_key, is_current=true)` unique partielle
- **Hiérarchie respectée** : `content_key` encode Niveau → Module → Leçon → Section → Index
- **Versioning complet** : ré-enregistrements conservés (audit, rollback admin possible)
- **Qualité uniforme** : pipeline WAV 16kHz pro déjà éprouvé du Voice Lab
- **Aucune duplication de contenu** : on s'appuie sur les données pédagogiques existantes (`classeContent.ts`, `classeContentN2.ts`)
- **Sécurité** : RLS strictes, signed URLs, brouillons jamais publics
- **Performance** : cache React Query + Service Worker PWA + lazy loading audio + WAV léger
- **Mobile-first** : studio responsive, touch-friendly, fonctionne en 3G

## 12. Hors scope (à faire en phase 2 si besoin)

- Reconnaissance prononciation IA (Whisper + Levenshtein)
- TTS de pré-écoute pour modèle de lecture
- Mode collaboratif (plusieurs enseignants se partagent un manuel)
- Statistiques d'écoute apprenant (qui a écouté quoi)
- Application mobile native dédiée à l'enregistrement enseignant offline-first

