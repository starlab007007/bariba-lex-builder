

# Plan : Conversion du PDF "Traduction en Bariba" au format HTML

## Analyse du document source

Le PDF (~50 pages) est la **traduction en Bariba du Code Foncier et Domanial du Bénin** (loi n° 2013-01). Structure hiérarchique détectée :
- **GARI WIRU** (Titres / Livres) → ex: "GARI WIRU 2se : GARIN GOBERU"
- **BÆÆRU** (Parties) → ex: "BÆÆRU 4SE : MÈ BA RA KOOSINÆ MA SIKIRINØ GA DUURA"
- **BØNU** (Chapitres) → ex: "BØNU 3se : DAARIBU"
- **Saria Nse** (Articles numérotés 1 → 207)

Le texte contient les caractères masqués (ø, æ, ó, á, ä, å, ö, ±, ‹) qui doivent être remplacés selon le `bariba_mapping` fourni pour produire l'orthographe authentique (ɔ, ɛ, ɔ̃, ã, ĩ, ɛ̃, ɔ̀, ǹ, ').

Le fichier de référence `Manuel_Bariba_N1_Corrige.html` n'existe plus dans le repo (seul son dérivé `src/data/classeContent.ts` subsiste). Je vais reproduire le **même style/format pédagogique** : HTML autonome, navigable, avec sommaire, sections cliquables, et caractères Bariba normalisés.

## Ce qu'on va construire

### 1. Pipeline de conversion (script Python)

Script `/tmp/convert_bariba_pdf.py` qui :
1. **Parse le markdown** déjà extrait du PDF (1450 lignes)
2. **Applique le mapping de correction** des caractères :
   ```python
   bariba_mapping = {
     'ø':'ɔ', 'Ø':'Ɔ', 'æ':'ɛ', 'Æ':'Ɛ',
     'ó':'ɔ̃', 'á':'ã', 'í':'ĩ', 'ä':'ã', 'å':'ɛ̃',
     'ö':'ɔ̀', '±':'ǹ', '‹':'\u2019'
   }
   ```
3. **Détecte la structure** via regex :
   - `GARI WIRU \d+se` → `<section class="gari-wiru">`
   - `BÆÆRU \d+SE` ou `BÆRU` → `<section class="baeru">`
   - `BØNU \d+se` ou `BØNU BAKA` → `<section class="bonu">`
   - `Saria \d+se` → `<article class="saria" id="saria-N">`
4. **Nettoie les artefacts** (numéros de page isolés, headers répétés)
5. **Génère un HTML autonome** au même format pédagogique

### 2. Format HTML produit (`public/classe/Traduction_Bariba_Foncier.html`)

```text
<!DOCTYPE html>
<html lang="bba">
<head>
  <meta charset="UTF-8" />
  <title>Tem bausu ka yɛnusun saria — Wooda 2013-01</title>
  <style>
    body { font-family: 'Noto Sans', system-ui; max-width: 860px; margin: auto; }
    .gari-wiru { /* titre principal — bandeau orange */ }
    .baeru     { /* partie — bordure verte */ }
    .bonu      { /* chapitre — fond beige */ }
    .saria     { /* article numéroté avec ancre */ }
    nav.toc    { position: sticky; top: 0; }
  </style>
</head>
<body>
  <header><h1>WOODA 2013-01 — Tem bausu ka yɛnusun saria</h1></header>
  <nav class="toc"><!-- sommaire auto-généré --></nav>
  <main>
    <section class="gari-wiru" id="gari-1">
      <h2>GARI WIRU GBIIKIRU — Sɔɔru bakanu</h2>
      <section class="bonu" id="bonu-1-1">
        <h3>BƆNU GBIIKA</h3>
        <article class="saria" id="saria-1">
          <h4>Saria gbiika</h4>
          <p>Yè tire teni ta naa gire, yera bù sariaba yì yè ba koo ka sɔ̀ma ko…</p>
        </article>
        ...
      </section>
    </section>
    ...
  </main>
</body>
</html>
```

### 3. Données structurées parallèles (TypeScript)

Pour usage dans l'app (similaire à `classeContent.ts`), génération de `src/data/foncierBaribaContent.ts` :

```ts
export interface FoncierArticle {
  id: number;          // 1..207
  number: string;      // "Saria 1se"
  title?: string;      // "Saria gbiika" si présent
  content: string;     // texte normalisé Bariba
  bonu: string;        // chapitre parent
  baeru?: string;      // partie parente (optionnel)
  gariWiru: string;    // livre parent
  page: number;        // numéro de page d'origine
}
export const FONCIER_BARIBA: FoncierArticle[] = [...];
export const FONCIER_STRUCTURE = { gariWirus: [...], bonus: [...], ... };
```

### 4. QA visuelle obligatoire

Après génération :
1. Convertir HTML → PDF via `pandoc` ou `wkhtmltopdf`
2. `pdftoppm -jpeg -r 100 output.pdf qa-page`
3. **Inspecter visuellement** chaque page-image pour vérifier :
   - Caractères Bariba bien rendus (ɔ, ɛ, nasales, tons)
   - Hiérarchie visuelle claire
   - Aucun ø/æ/± résiduel (signe d'oubli de mapping)
4. Recompter : les 207 articles `Saria` détectés et structurés

## Fichiers livrés

- `public/classe/Traduction_Bariba_Foncier.html` — document HTML autonome final
- `src/data/foncierBaribaContent.ts` — données structurées TS (consommables par React)
- `/mnt/documents/Traduction_Bariba_Foncier.html` — copie téléchargeable
- `/mnt/documents/Traduction_Bariba_Foncier_QA.pdf` — preuve QA visuelle

## Garanties

- **Mapping complet appliqué** sur tout le texte avant écriture HTML
- **Idempotent** : le script peut être relancé si le PDF source change
- **Aucune dépendance UI** : le HTML est lisible directement dans un navigateur OU intégrable via iframe dans l'app
- **Données prêtes** : `foncierBaribaContent.ts` permet d'utiliser le contenu dans une future page Classe N3 (Foncier) si souhaité

