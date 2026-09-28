// Portage fidèle d'`ApContourPainter` (fitila_flutter/lib/apprendre/apprendre_voice_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927, spec §10.4) — deux courbes
// de hauteur (demi-tons) sur le même axe de temps, en SVG inline. Même
// technique que `PercentRing` dans `ApSessionResultScreen.tsx` et
// `RetentionRing` dans `ApReviewScreen.tsx` (SVG construit à la main,
// couleurs `AP_COLORS`).
//
// Tous les calculs de géométrie viennent de `src/lib/apprendre/contour.ts`
// (pur, testable en Node) — ce fichier ne fait que les assembler en SVG.

import { AP_COLORS } from './apColors';
import { contourSegments, disagreementIndices, type ContourPoint } from '@/lib/apprendre/contour';

const CHART_WIDTH = 600;
const DEFAULT_HEIGHT = 120;
const GRID_LINES = 4; // 5 lignes horizontales équidistantes, i = 0..4 (spec §10.4).

export interface ApContourChartProps {
  /** Courbe de référence, en demi-tons (null = tranche non voisée/silence). */
  reference: (number | null)[];
  /** Courbe de l'apprenant, projetée sur le même axe temporel (DTW). */
  learner: (number | null)[];
  height?: number;
}

function pathOf(segment: ContourPoint[]): string {
  return segment.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/** Graphique de mélodie superposant la courbe de référence (or) et celle de
 *  l'apprenant (ink/night, dessinée par-dessus) — spec §10.4. */
export default function ApContourChart({ reference, learner, height = DEFAULT_HEIGHT }: ApContourChartProps) {
  const gridYs = Array.from({ length: GRID_LINES + 1 }, (_, i) => (height * i) / GRID_LINES);
  const n = reference.length;

  const grid = gridYs.map((y) => (
    <line key={y} x1={0} y1={y} x2={CHART_WIDTH} y2={y} stroke={AP_COLORS.line} strokeWidth={1} />
  ));

  if (n < 2) {
    // Dart : `if (n < 2) return;` après avoir dessiné la grille — rien
    // d'autre à tracer avec moins de deux points de référence.
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${CHART_WIDTH} ${height}`} preserveAspectRatio="none" role="img" aria-hidden="true">
        {grid}
      </svg>
    );
  }

  const warnIndices = disagreementIndices(reference, learner);
  const rectWidth = (2 * CHART_WIDTH) / n;
  const referenceSegments = contourSegments(reference, n, CHART_WIDTH, height);
  const learnerSegments = contourSegments(learner, n, CHART_WIDTH, height);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${CHART_WIDTH} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Comparaison de la mélodie : référence en or, ma voix en noir"
    >
      {grid}
      {warnIndices.map((i) => {
        const cx = (CHART_WIDTH * i) / (n - 1);
        return <rect key={i} x={cx - CHART_WIDTH / n} y={0} width={rectWidth} height={height} fill={AP_COLORS.clayTint} />;
      })}
      {referenceSegments.map((segment, i) => (
        <path key={`ref-${i}`} d={pathOf(segment)} fill="none" stroke={AP_COLORS.gold} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {learnerSegments.map((segment, i) => (
        <path key={`learner-${i}`} d={pathOf(segment)} fill="none" stroke={AP_COLORS.night} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
