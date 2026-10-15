import { speechChunks } from '../../../supabase/functions/_shared/dunya-voice-core.ts';
export function readableSpeech(text: string): string {
  return text.normalize('NFC').replace(/```[\w-]*\n?/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(^|\n)\s{0,3}#{1,6}\s+/g, '$1').replace(/[*_`]+/g, '').replace(/\s+/g, ' ').trim();
}
export const replySpeechChunks = (text: string) => speechChunks(readableSpeech(text), 380);
