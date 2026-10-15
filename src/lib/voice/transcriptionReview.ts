export type { TranscriptRepair } from '../../../supabase/functions/_shared/transcription-repair.ts';
/** Do not overwrite edits or an ambiguous duplicate span in the user's current draft. */
export function replaceTranscriptDraft(draft: string, previous: string, next: string): { text: string; replaced: boolean } {
  if (!previous || !next.trim()) return { text: draft, replaced: false };
  const position = draft.indexOf(previous);
  if (position < 0 || draft.indexOf(previous, position + previous.length) >= 0) return { text: draft, replaced: false };
  return { text: draft.slice(0, position) + next + draft.slice(position + previous.length), replaced: true };
}
