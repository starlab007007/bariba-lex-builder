// Portage fidèle de `ApContourPainter` (fitila_flutter/lib/apprendre/apprendre_voice_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927) — calculs purs (testables en
// Node, sans DOM/Canvas) pour le graphique de mélodie affiché par
// `src/components/apprendre/ApContourChart.tsx`.
//
// Référence : apprendre_v24_spec.md §10.4. Tout ce fichier est de la
// géométrie pure (aucune dépendance navigateur) afin de pouvoir vérifier au
// moins le calcul le plus facile à décaler d'un cran — les indices de
// désaccord surlignés — par un test Node, comme demandé par la tâche.

/** Échelle verticale fixe du graphique : ±7 demi-tons (spec §10.4, identique
 *  au clamp de `_foldOctave` dans voiceAnalysis.ts). */
export const CONTOUR_RANGE_SEMITONES = 7;

/** Seuil de désaccord entre les deux courbes, en demi-tons (spec §10.4). */
export const CONTOUR_DISAGREEMENT_THRESHOLD = 2.5;

/** Abscisse du point `index` sur `n` points répartis uniformément sur
 *  `width` (spec §10.4 : `x = largeur * i / (n-1)`). */
export function contourX(index: number, n: number, width: number): number {
  if (n <= 1) return 0;
  return (width * index) / (n - 1);
}

/** Ordonnée d'une valeur en demi-tons (axe Y inversé, 0 au centre — spec
 *  §10.4 : `y = hauteur/2 - (demiTons/range) * (hauteur/2)`). */
export function contourY(semitones: number, height: number): number {
  const clamped = Math.min(CONTOUR_RANGE_SEMITONES, Math.max(-CONTOUR_RANGE_SEMITONES, semitones));
  return height / 2 - (clamped / CONTOUR_RANGE_SEMITONES) * (height / 2);
}

/**
 * Indices où les deux courbes ont une valeur non-null ET diffèrent de plus
 * de `threshold` demi-tons (spec §10.4) — ce sont les indices à surligner
 * en `clayTint` dans le graphique (rectangle centré sur `x(i)`, de largeur
 * `2 * largeur/n`).
 */
export function disagreementIndices(
  reference: readonly (number | null)[],
  learner: readonly (number | null)[],
  threshold: number = CONTOUR_DISAGREEMENT_THRESHOLD,
): number[] {
  const n = reference.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = reference[i];
    const b = i < learner.length ? learner[i] : null;
    if (a != null && b != null && Math.abs(a - b) > threshold) out.push(i);
  }
  return out;
}

export interface ContourPoint {
  x: number;
  y: number;
}

/**
 * Découpe une courbe en segments de droite contigus, coupés à chaque valeur
 * `null` — pas d'interpolation à travers un trou/silence (spec §10.4 : « une
 * valeur `null` interrompt le tracé, nouveau sous-chemin après le trou »).
 * Chaque segment est directement utilisable pour construire un `<path d="M…L…">` SVG.
 */
export function contourSegments(
  values: readonly (number | null)[],
  n: number,
  width: number,
  height: number,
): ContourPoint[][] {
  const segments: ContourPoint[][] = [];
  let current: ContourPoint[] = [];
  for (let i = 0; i < n && i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }
    current.push({ x: contourX(i, n, width), y: contourY(v, height) });
  }
  if (current.length > 0) segments.push(current);
  return segments;
}
