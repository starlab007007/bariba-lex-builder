

# Plan : Outil "Bariba Voice Lab" — Collecte audio pour entraînement modèle ASR/TTS

## Vision

Un nouvel outil dans la sidebar "Tools" qui transforme chaque utilisateur en contributeur vocal : il lit des phrases bariba à voix haute, l'audio est enregistré et stocké côté backend, formant progressivement un **corpus parallèle texte ↔ audio** téléchargeable par l'admin pour entraîner un modèle ASR Bariba.

## Architecture cible

```text
┌─────────────────────────────────────────────────┐
│  USER : page "🎙️ Voice Lab"                     │
│  ┌─────────────────────────────────────────┐   │
│  │ Thème: [Salutations ▾]   [Aléatoire ⇄] │   │
│  │ ─────────────────────────────────────── │   │
│  │  Phrase #1 (sur 3 affichées) :          │   │
│  │  « A kpuna n do ? »                     │   │
│  │  ─ Trad : Tu as bien dormi ?            │   │
│  │                                         │   │
│  │  [▶ Écouter] [● Enregistrer] [✓ Valider]│   │
│  │  [⏭ Suivante]                            │   │
│  └─────────────────────────────────────────┘   │
│  Progression contributeur : 47 phrases lues    │
└─────────────────────────────────────────────────┘
                     │
                     ▼ upload
┌─────────────────────────────────────────────────┐
│  Storage: bucket "bariba-voice-corpus"          │
│  /<user_id>/<phrase_id>_<timestamp>.wav         │
└─────────────────────────────────────────────────┘
                     │
                     ▼ row
┌─────────────────────────────────────────────────┐
│  Tables                                         │
│  ─────────────────────────────────────────────  │
│  bariba_corpus_phrases (texte source)           │
│  bariba_voice_recordings (audio + lien phrase)  │
│  bariba_user_phrase_history (anti-doublon user) │
└─────────────────────────────────────────────────┘
                     │
                     ▼ admin
┌─────────────────────────────────────────────────┐
│  Page Admin "Voice Corpus" :                    │
│  - Statistiques (par thème, par contributeur)   │
│  - Téléchargement ZIP : pairs .txt + .wav       │
└─────────────────────────────────────────────────┘
```

## 1. Préparation du corpus de phrases (one-shot)

### Script d'agrégation (`/tmp/build_voice_corpus.py`)
Lit les 5 sources fournies et produit `voice_corpus_phrases.json` à insérer en DB :

| Source | Champ utilisé | Catégorie attribuée |
|---|---|---|
| `phrase_fr_bariba_short_simple.json` | `bariba` (col. unique) | `category` du JSON (Salutations, Commerce, Santé, Transport, Nourriture, Temps…) |
| `corpus_initial_2600-3.json` | `bariba` | `category` du JSON (nettoyer mélanges FR/BA dans le champ) |
| `idiomes-4.json` | `bariba_expression` | `category` (Salutations, Émotions…) |
| `Manuel_Bariba_N1_Corrige` (HTML) | extraction phrases bariba (regex sur paragraphes contenant `ɔ ɛ ã`) | "Éducation/Manuel" |
| `Manuel_Bariba_N2_Corrige` (HTML) | idem | "Éducation/Manuel N2" |
| `Traduction_Bariba_Foncier` (déjà parsé) | chaque article `Saria` → 1-2 phrases | "Loi/Foncier" |

**Filtres de qualité appliqués** :
- Longueur : 1 mot ≤ phrase ≤ 25 mots (1-2 phrases max)
- Application du `bariba_mapping` (ø→ɔ, æ→ɛ, ó→ɔ̃, á→ã, í→ĩ, ä→ã, å→ɛ̃, ö→ɔ̀, ±→ǹ, ‹→')
- Déduplication (hash NFC normalisé)
- Détection langue : exclure phrases majoritairement françaises
- Découpe les longues phrases sur `.`/`!`/`?` pour ne garder que les fragments courts

**Catégories finales** : Salutations, Famille, Nourriture, Santé, Commerce, Transport, Temps, Émotions, Éducation, Loi (Foncier), Agriculture, Religion/Tradition, Vie quotidienne, Idiomes.

Cible : **~5 000 à 8 000 phrases uniques** prêtes à être lues.

## 2. Schéma base de données (migration)

```sql
-- Phrases sources à enregistrer
CREATE TABLE bariba_corpus_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_bariba text NOT NULL,
  text_french text,
  category text NOT NULL,
  source text,                      -- 'manuel_n1', 'idiomes', 'foncier'…
  word_count int NOT NULL,
  difficulty text DEFAULT 'easy',   -- easy | medium | hard
  is_active boolean DEFAULT true,
  recordings_count int DEFAULT 0,   -- mis à jour par trigger
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_phrases_category ON bariba_corpus_phrases(category) WHERE is_active;

-- Enregistrements audio (1 utilisateur peut enregistrer 1 phrase = 1 row)
CREATE TABLE bariba_voice_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phrase_id uuid NOT NULL REFERENCES bariba_corpus_phrases(id) ON DELETE CASCADE,
  storage_path text NOT NULL,       -- 'voice-corpus/<user>/<file>.webm'
  file_name text NOT NULL,          -- 'salutations_001_a_kpuna.webm'
  duration_seconds numeric,
  mime_type text,
  file_size_bytes int,
  validated boolean DEFAULT false,  -- admin peut marquer rejet
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, phrase_id)        -- 1 user = 1 enregistrement par phrase
);

-- Historique anti-répétition par utilisateur (vue rapide)
-- Pas besoin de table séparée : le UNIQUE ci-dessus + une simple requête NOT IN suffit.
```

**RLS** :
- `phrases` : SELECT public (authentifié), INSERT/UPDATE admin only
- `recordings` : SELECT propre rangée OR admin, INSERT user authentifié, UPDATE admin only
- Trigger : `recordings_count++` sur INSERT recording

**Storage bucket** : `bariba-voice-corpus` (privé), policies RLS :
- INSERT : utilisateur authentifié dans son dossier `<user_id>/...`
- SELECT : admin uniquement (téléchargement)

## 3. UI utilisateur — `src/pages/fitila/FitilaVoiceLab.tsx`

**Layout** (cohérent avec le thème pastel des modules outils) :
- **Header** : titre "🎙️ Bariba Voice Lab", sous-titre "Aide à construire la voix de demain"
- **Sélecteur de thème** : dropdown (toutes catégories + "Tous mélangés")
- **Zone phrase** (carte centrale) :
  - Texte bariba en grand (police lisible, 24px+)
  - Traduction française en gris (toggleable)
  - Catégorie (pill colorée)
- **Contrôles** : 3 boutons principaux
  - 🎙️ **Enregistrer / Stop** (gros bouton central animé pendant rec)
  - ▶️ **Écouter ma lecture** (apparaît après stop)
  - ✅ **Valider & Suivante** (envoie sur Storage + DB)
  - ⏭️ **Passer** (skip sans enregistrer)
- **Compteur** : "Vous avez enregistré 47 / 5 230 phrases"
- **3 phrases affichées en file d'attente** (preview de ce qui vient)

**Logique de tirage** :
- Au mount, charger 30 phrases via :
  ```sql
  SELECT * FROM bariba_corpus_phrases
  WHERE is_active AND category = $1
    AND id NOT IN (SELECT phrase_id FROM bariba_voice_recordings WHERE user_id = $current_user)
  ORDER BY recordings_count ASC, random()  -- privilégie phrases peu enregistrées
  LIMIT 30
  ```
- Cache local : queue FIFO, recharge quand <5 restantes

**Enregistrement** :
- Réutilise `useAudioRecorder` (déjà résilient cross-browser)
- MIME : webm/opus desktop, mp4 iOS Safari (déjà géré)
- Échantillonnage 24 kHz mono (déjà configuré)
- Upload vers `bariba-voice-corpus/<user_id>/<phrase_id>_<timestamp>.<ext>`
- Insert row en DB avec metadata
- Animation de succès, passe à la phrase suivante automatiquement

## 4. UI admin — `src/pages/admin/VoiceCorpusAdmin.tsx`

Accessible uniquement si `isAdmin`. Tableau de bord :
- **KPI** : nombre de phrases, nombre d'enregistrements, durée totale audio (heures), nombre de contributeurs uniques
- **Graphique** : enregistrements par catégorie + par jour
- **Top contributeurs** : leaderboard
- **Bouton "Télécharger corpus complet"** :
  - Edge function `voice-corpus-export` qui génère un ZIP côté serveur :
    - `metadata.csv` (phrase_id, text_bariba, text_french, category, audio_filename, user_id, duration)
    - Dossier `audio/` avec tous les .wav (ou .webm convertis)
    - `README.txt` expliquant la structure
  - Format final attendu pour entraînement HF/Whisper-style :
    ```
    corpus_bariba_<date>.zip
      ├─ metadata.csv      (text + audio_filename)
      ├─ audio/
      │   ├─ salutations_001_<hash>.wav
      │   ├─ commerce_002_<hash>.wav
      │   └─ ...
      └─ README.txt
    ```
- **Bouton "Télécharger filtré"** : par catégorie / par utilisateur / par période

**Edge function `voice-corpus-export`** :
- Auth admin obligatoire (`has_role(uid, 'admin')`)
- Stream le ZIP (utilise `JSZip` Deno) pour ne pas bouffer la mémoire
- Génère un lien signé temporaire (1h) vers le résultat dans Storage

## 5. Intégration sidebar

Dans `FitilaApp.tsx` ajouter dans `toolsItems` (juste après Fitila Tem IA) :
```ts
{ emoji: '🎙️', labelKey: 'sidebar_voice_lab', descKey: 'sidebar_voice_lab_desc',
  path: '/fitila/voice-lab', gradient: 'from-pink-500 to-rose-400' }
```
Route dans `App.tsx` : `<Route path="voice-lab" element={<FitilaVoiceLab />} />`

Clés i18n FR/BA dans `public/i18n-platform.json` :
- `sidebar_voice_lab` : "Voice Lab" / "Wo nuku tem bausu"
- `sidebar_voice_lab_desc` : "Prête ta voix au Bariba" / "Wo nuku Bariba"

## Garanties

- **Anti-doublon par utilisateur** : contrainte `UNIQUE(user_id, phrase_id)` + filtre client `NOT IN`
- **Multi-contributeurs sur même phrase** : le UNIQUE est par couple, donc Alice et Bob peuvent enregistrer la même phrase → essentiel pour la diversité vocale du corpus
- **Sélection intelligente** : `ORDER BY recordings_count ASC, random()` pousse les phrases sous-représentées en premier → équilibre le corpus
- **Caractères Bariba** : mapping appliqué à l'import, jamais altérés ensuite
- **Permissions strictes** : RLS pour qu'un user ne lise pas les enregistrements des autres
- **Format corpus standard** : metadata.csv + dossier audio/ → directement compatible pipelines Whisper/Wav2Vec2
- **Pas d'API payante** : tout en local + Lovable Cloud (Storage + DB), aucun traitement IA payant

## Fichiers à créer / modifier

**Créés** :
- `src/pages/fitila/FitilaVoiceLab.tsx` (UI contributeur)
- `src/pages/admin/VoiceCorpusAdmin.tsx` (UI admin + export)
- `src/hooks/useVoiceCorpus.ts` (logique tirage phrases + upload)
- `supabase/functions/voice-corpus-export/index.ts` (génération ZIP admin)
- Migration SQL : tables `bariba_corpus_phrases`, `bariba_voice_recordings`, bucket Storage, RLS, trigger

**Modifiés** :
- `src/App.tsx` (route `/fitila/voice-lab` et `/admin/voice-corpus`)
- `src/pages/fitila/FitilaApp.tsx` (tuile "Voice Lab")
- `public/i18n-platform.json` (2 clés)
- (Admin dashboard existant) lien vers `/admin/voice-corpus`

**Données** :
- Une grosse insertion initiale (~5-8K rows) dans `bariba_corpus_phrases` via script Python + insert tool

