// Palette ApColors (fitila_flutter/lib/apprendre/apprendre_ui.dart, branche
// feat/apprendre-v2.4-build19-20260927) — mêmes valeurs hex que le reste du
// web Apprendre (voir FitilaLearn.tsx, FitilaLearnScenes.tsx) pour rester
// visuellement identique au Flutter et aux écrans web déjà portés.
//
// Référence : apprendre_v24_spec.md §13.1.

export const AP_COLORS = {
  ivory: '#F7F5EC',
  ink: '#241F2E',
  // Ajouté pour ApReviewScreen (manquait ici) — même valeur que Dart ApColors.inkSoft.
  inkSoft: '#3A3448',
  gold: '#C99530',
  goldInk: '#2B2110',
  goldTint: '#F3E3B9',
  goldGlow: '#FFFBF0',
  goldDeep: '#9C6B1D',
  clay: '#B54E33',
  clayInk: '#8A3A24',
  clayTint: '#F4DED2',
  sage: '#3F6E52',
  sageInk: '#2F5540',
  sageTint: '#DCEAE0',
  line: '#E4DFCC',
  lineStrong: '#D5CEB3',
  muted: '#6F6955',
  // Ajoutés pour ApCompareSheet/ApContourChart (manquaient ici) — mêmes
  // valeurs que Dart ApColors.night/.nightText/.quiet (spec §13.1).
  night: '#241F2E',
  nightText: '#D9D3C1',
  quiet: '#5E5846',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EDDF',
} as const;

export type ApColorToken = keyof typeof AP_COLORS;
