// Portage fidèle d'`ApCompareButton` (fitila_flutter/lib/apprendre/apprendre_voice_ui.dart,
// branche feat/apprendre-v2.4-build19-20260927, spec §10.3 dernier
// paragraphe) — bouton d'entrée du module « Compare ta voix », affiché à
// côté de tout texte ayant une voix de référence publiée.
//
// Auto-suffisant : gère lui-même l'ouverture/fermeture de la feuille
// `ApCompareSheet` (comme `showApVoiceCompare` appelé directement depuis le
// `onTap` du bouton côté Dart) — il suffit de le déposer n'importe où avec
// `text`/`fr`, sans état à faire remonter à l'appelant. N'affiche RIEN
// (`return null`, équivalent de `SizedBox.shrink()`) tant qu'aucune voix de
// référence n'existe pour `text` — pas seulement désactivé.

import { useMemo, useState } from 'react';
import { Mic, AudioWaveform } from 'lucide-react';
import { apprendreAudioKey, useApprendrePublishedAudio } from '@/components/fitila/BaribaAudioText';
import { AP_COLORS } from './apColors';
import ApCompareSheet from './ApCompareSheet';

export interface ApCompareButtonProps {
  /** Texte bariba cible (clé de recherche de la voix de référence). */
  text: string;
  /** Traduction française, transmise telle quelle à la feuille de comparaison. */
  fr?: string;
  /** Variante compacte : icône micro seule dans un cercle sombre (spec §10.3). */
  compact?: boolean;
}

export default function ApCompareButton({ text, fr, compact = false }: ApCompareButtonProps) {
  const { data: manifest } = useApprendrePublishedAudio();
  const hasReference = useMemo(() => (manifest?.get(apprendreAudioKey(text))?.length ?? 0) > 0, [manifest, text]);
  const [open, setOpen] = useState(false);

  if (!hasReference) return null;

  return (
    <>
      {compact ? (
        <button
          type="button"
          title="Comparer ma voix"
          aria-label="Comparer ma voix"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: AP_COLORS.night }}
        >
          <Mic className="h-[18px] w-[18px]" style={{ color: '#FFFFFF' }} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border text-sm font-bold"
          style={{ borderColor: AP_COLORS.lineStrong, backgroundColor: AP_COLORS.surface, color: AP_COLORS.ink }}
        >
          <AudioWaveform className="h-[18px] w-[18px]" style={{ color: AP_COLORS.goldDeep }} />
          <span>Comparer ma voix</span>
        </button>
      )}
      {open && <ApCompareSheet text={text} fr={fr} onClose={() => setOpen(false)} />}
    </>
  );
}
