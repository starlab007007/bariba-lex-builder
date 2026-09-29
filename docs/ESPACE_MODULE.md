# Module « Espace » — coffre-fort numérique / GED Bàátɔ̀nú

Route web : `/espace` (entrée « Espace » du groupe *Explorer* de la barre latérale).
Code : `src/pages/fitila/espace/`, `src/lib/espace/`, migration `supabase/migrations/20260929120000_espace_ged.sql`,
edge function `supabase/functions/espace-ocr/`, dictionnaire `public/data/bariba_dictionary.json`
(même fichier que les claviers Flutter/Android/iOS).

## 1. Base de données (PostgreSQL / Supabase)

```
auth.users ─┬─< espace_folders (id, owner_id, parent_id→folders, name, color)
            ├─< espace_documents (id, owner_id, folder_id→folders, title, category, tags[],
            │       content_html, content_text, search_text*, source, file_path, file_mime, file_size,
            │       metadata jsonb, version, archived, favorite, created_at, updated_at)
            │      ├─< espace_document_versions (document_id, version, title, content_html, content_text, author_id)
            │      ├─< espace_permissions (document_id, grantee_id | share_token, role viewer|editor, expires_at)
            │      └─< espace_ocr_jobs.document_id
            └─< espace_ocr_jobs (owner_id, file_*, page_count, status, engine, confidence, extracted_text,
                                 pages jsonb, error, finished_at)
Storage : bucket privé `espace-files`, chemin `{user_id}/{document_id}/{horodatage_nom}` (25 Mo max)
```

| Table demandée | Implémentation |
|---|---|
| `documents` | `espace_documents` |
| `folders` | `espace_folders` (arborescence via `parent_id`) |
| `metadata` | colonne `espace_documents.metadata jsonb` (+ `category`, `tags[]`) — extensible sans migration (métadonnées OCR : moteur, confiance, mode…) |
| `ocr_jobs` | `espace_ocr_jobs` |
| `permissions` | `espace_permissions` (partage nominatif ou lien à jeton) |

**Recherche sans diacritiques.** `espace_fold(text)` (SQL, immuable) : minuscules → NFD → suppression des marques
U+0300–U+036F → `ɛ→e, ɔ→o, ŋ→n`. Un trigger remplit `search_text` (titre + texte + étiquettes + catégorie),
indexé par `pg_trgm` (GIN). `Bàátɔ̀nú` et `Baatonu` produisent la même clé `baatonu`. Le client applique le même pliage
(`foldText`) et interroge `search_text ILIKE %clé%`.

**Versions.** Trigger `espace_documents_versioning` : chaque changement de `content_html` incrémente `version` et archive
la révision (100 dernières conservées). La restauration recopie une révision dans le document (nouvelle version).

**Sécurité (RLS).** Chaque table est protégée : propriétaire = accès total ; bénéficiaire nominatif = lecture (ou
modification si `editor`, non expiré) via `espace_can_access()` ; le stockage est limité au dossier `{auth.uid()}/`.
Les liens temporaires ne donnent accès qu'au document visé, via RPC `SECURITY DEFINER` (jeton 192 bits, expiration 1 h – 90 j).

## 2. API

Tout passe par PostgREST/RPC Supabase (JWT utilisateur) + une edge function.

| Besoin | Route | Notes |
|---|---|---|
| Lister / rechercher | `GET /rest/v1/espace_documents?archived=eq.false&search_text=ilike.*clé*&tags=cs.{tag}&folder_id=eq.…&order=updated_at.desc` | `clé` = `foldText(requête)` |
| Lire | `GET /rest/v1/espace_documents?id=eq.{id}` | |
| Créer | `POST /rest/v1/espace_documents` | `owner_id` = `auth.uid()` par défaut |
| Modifier / archiver / favori | `PATCH /rest/v1/espace_documents?id=eq.{id}` | `content_text`/`search_text`/`version` gérés côté serveur |
| Supprimer | `DELETE /rest/v1/espace_documents?id=eq.{id}` | + suppression du fichier stocké |
| Dossiers | `GET/POST/PATCH/DELETE /rest/v1/espace_folders` | supprimer un dossier laisse les documents à la racine |
| Historique | `GET /rest/v1/espace_document_versions?document_id=eq.{id}&order=version.desc` | |
| Fichiers | `POST /storage/v1/object/espace-files/{uid}/{doc}/{nom}` · `POST /storage/v1/object/sign/espace-files/…` | URL signées 5 min |
| OCR | `POST /functions/v1/espace-ocr` `{pages:[dataUrl…≤12], mode:'printed'|'handwritten'}` → `{engine,text,confidence,pages:[{page,text,confidence,notes[]}]}` | `503 OCR_NOT_CONFIGURED` si le secret manque |
| Suivi OCR | `GET/POST/PATCH /rest/v1/espace_ocr_jobs` | statuts `pending → processing → done|failed` |
| Partage nominatif | `POST /rest/v1/rpc/espace_share_with_email` `{_doc,_email,_role,_expires}` | |
| Lien temporaire | `POST /rest/v1/rpc/espace_create_share_link` `{_doc,_role,_hours}` → jeton | URL : `/espace/partage/{jeton}` |
| Ouvrir un lien | `POST /rest/v1/rpc/espace_get_shared` `{_token}` (anonyme) | |
| Enregistrer via lien éditeur | `POST /rest/v1/rpc/espace_save_shared` `{_token,_html,_text}` | refusé si lecture seule / expiré |
| Révoquer | `DELETE /rest/v1/espace_permissions?id=eq.{id}` | |

## 3. Pipeline OCR Bàátɔ̀nú

```
 Fichier (PDF · PNG · JPEG · WebP · photo)                                   ┌──────────────────────────┐
        │                                                                     │ espace_ocr_jobs          │
        ▼                                                                     │ (suivi + résultat par    │
 ① CHARGEMENT ── PDF ? ── oui ──► pdf.js : texte natif ≥ 40 car. ?            │  page, confiance, erreur)│
        │                              │ oui → page acceptée sans IA (0,99)   └────────────▲─────────────┘
        │ non / image                  └ non → rendu raster de la page                     │
        ▼                                                                                  │
 ② PRÉTRAITEMENT (navigateur, canvas)                                                      │
    gris → étirement de contraste (percentiles 1–99 %) → estimation d'inclinaison          │
    (projection −6…+6°) → redressement → redimensionnement ≤ 2000 px → JPEG 0,9            │
        │                                                                                  │
        ▼                                                                                  │
 ③ SEGMENTATION + INFÉRENCE IA (edge function `espace-ocr`, lots de 3 pages)               │
    modèle vision (pixtral-large) guidé par un prompt à alphabet fermé : ɛ ɔ ŋ, nasales      │
    ã ĩ ũ õ ẽ ɛ̃ ɔ̃, tons ◌̀ ◌́ ◌̃ ◌̄ ; la mise en page (paragraphes, titres, lignes)         │
    est reconstruite par le modèle ; sortie JSON {text, confidence, notes}                  │
        │  post-traitement serveur : NFC, η→ŋ, caractères invisibles, sauts de ligne        │
        ▼                                                                                  │
 ④ CORRECTION PAR LE DICTIONNAIRE (navigateur)                                             │
    mot inconnu dont la forme repliée (nee) correspond à un mot connu (nɛɛ) → rétabli        │
    avec ses caractères spéciaux ; compteur de corrections affiché                          │
        ▼                                                                                  │
 ⑤ TEXTE ÉDITABLE ── vérification humaine (palette ɛ ɔ ŋ + tons) ── « Enregistrer » ───────┘
    → document `source='ocr'` + fichier d'origine dans `espace-files` + métadonnées OCR
```

**Ce que fait réellement l'« IA entraînée Bariba ».** Aucun modèle n'a été entraîné dans ce dépôt : l'inférence
utilise le modèle vision Pixtral via la même clé `MISTRAL_API_KEY` que `ocr-translate` / `recognize-handwriting`,
contraint par un prompt Bàátɔ̀nú, puis corrigé par le dictionnaire. Pour brancher un modèle ajusté, il suffit de
remplacer `ocrPage()` dans `supabase/functions/espace-ocr/index.ts` (contrat d'entrée/sortie inchangé).
Le secret `MISTRAL_API_KEY` doit être défini dans Supabase pour que l'OCR fonctionne ; sans lui, l'interface affiche
un message clair et propose de créer le document pour saisir le texte à la main.

## 4. Éditeur

* Édition riche WYSIWYG (`contentEditable`) : titres, gras/italique/souligné, listes, citations, alignements.
* Palette ɔ ɛ ŋ ã ĩ ũ õ ẽ ɛ̃ ɔ̃ et tons (grave, aigu, tilde, macron) ; les claviers système FITILA fonctionnent nativement (le texte est en Unicode NFC).
* Prédiction / autocomplétion du dictionnaire (bigrammes + fréquence, comme le clavier mobile), `Tab` accepte la 1ʳᵉ suggestion.
* Vérification orthographique : mots absents du dictionnaire, suggestions (tons/caractères rétablis, distance ≤ 1), remplacement global, « Ignorer ».
* Enregistrement automatique (1,4 s) ; avertissement en cas de fermeture pendant l'enregistrement.

## 5. Import / export

| Format | Export | Import |
|---|---|---|
| TXT | UTF-8 avec BOM | oui |
| DOCX | Généré (styles, titres, listes, gras/italique/souligné, police *Charis SIL* avec repli Unicode) | oui (paragraphes, titres, listes, mise en forme de base) |
| PDF | Impression navigateur « Enregistrer en PDF » (polices système à repli Unicode → ɛ ɔ ŋ et diacritiques combinants corrects) | via *Scanner* (texte natif ou OCR) |

Installer *Charis SIL* / *Gentium Plus* donne le meilleur rendu des tons empilés dans le PDF et le DOCX.

## 6. Maquettes (vues principales)

```
┌ Tableau de bord ───────────────────────────────────────────────────────────────┐
│ ┌ COFFRE-FORT NUMÉRIQUE ────────────────────────────────────────────────────┐ │
│ │ Espace                                                                     │ │
│ │ [ + Nouveau document ] [ ⌗ Scanner (OCR) ] [ ⭱ Importer ]                  │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ [📄 12 Documents] [📁 3 Dossiers] [⌗ 5 Numérisations] [🗄 2 Archivés]          │
│ ( 🔍 Rechercher — « baatonu » trouve « Bàátɔ̀nú »  ) [Catégorie ▾] [Archives] ▦ ☰ │
│ DOSSIERS      ┌ Conte ──────┐ ┌ Lettre ────┐ ┌ Manuscrit ─┐                   │
│ ▸ Tous        │ Nɛɛ nɔ̀ …    │ │ …          │ │ ⌗ OCR 83 % │                   │
│ ▸ Contes      │ #conte v2   │ │            │ │            │                   │
│ ▸ École       └─────────────┘ └────────────┘ └────────────┘                   │
│ Numérisations récentes : manuscrit.png · 1 page · 83 % · [Ouvrir]              │
└────────────────────────────────────────────────────────────────────────────────┘
┌ Éditeur ─────────────────────────────────────────────────────────────┬─ Panneau ─┐
│ ← Conte de Bàátɔ̀nú          ✓ Enregistré · v4   ★  [Exporter ▾]  ▥    │ Infos │Versions│Partage │
│ ↶ ↷ [Paragraphe▾] B I U • 1. ❝ ⇤ ⇔ ⇥ ⌫ ⌨  [Orthographe 2]              │ Dossier   [▾]    │
│ ɔ ɛ ŋ ã ĩ ũ õ ẽ ɛ̃ ɔ̃ │ ◌̀ ◌́ ◌̃ ◌̄                                      │ Catégorie [▾]    │
│ (nɔɔ entendre) (nɔma) (nɔnu) …   ← suggestions, Tab = 1ʳᵉ               │ #étiquettes      │
│ ─────────────────────────────────────────────                         │ Fichier d'origine│
│   Nɛɛ nɔ̀ …                                                            │ Archiver/Suppr.  │
│ 2 mots · 7 caractères                       Dictionnaire : 6 000 entrées└──────────────────┘
└───────────────────────────────────────────────────────────────────────────────┘
┌ Numériser & extraire ─────────────────────────────────────────────────────────┐
│ ①Prétraitement ─ ②Reconnaissance IA ─ ③Correction ─ ④Texte éditable            │
│ ┌ manuscrit.png ─────────┐  ┌ Titre ─────────────────────────────┐             │
│ │  aperçu prétraité       │  │ Confiance 83 % · moteur · 1 corr.  │             │
│ │  (vignettes de pages)   │  │ ɔ ɛ ŋ … ◌̀ ◌́ ◌̃ ◌̄                    │             │
│ │ (Imprimé)(Manuscrit)    │  │ [ texte extrait modifiable ]       │             │
│ │ [ Extraire le texte ]   │  │ [ Enregistrer dans l'Espace ]      │             │
│ └─────────────────────────┘  └────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────────────────────────┘
```

Responsive : < 768 px tiroir de navigation + dossiers en puces horizontales, panneau du document en volet latéral ;
768–1023 px rail d'icônes ; ≥ 1024 px menu complet, dossiers en colonne et panneau du document fixe.

## 7. Limites connues

* OCR : dépend du secret `MISTRAL_API_KEY` (non vérifiable ici) ; 12 pages / 25 Mo par numérisation ; la reconnaissance
  des tons empilés sur manuscrits reste probabiliste — la relecture humaine est prévue dans le parcours.
* Édition simultanée par plusieurs personnes : dernier enregistrement gagne (chaque version est archivée, donc récupérable).
* Les types TypeScript générés de Supabase ne contiennent pas encore les tables `espace_*` (accès non typé isolé dans `src/lib/espace/api.ts`).
* Mobile Flutter : module non porté dans ce lot (web uniquement).
