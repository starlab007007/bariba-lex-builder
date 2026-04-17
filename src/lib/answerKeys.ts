import { supabase } from '@/integrations/supabase/client';

export interface AnswerKey {
  id: string;
  level: 'N1' | 'N2';
  module: string;
  lesson_id: string;
  section_key: string;
  question_idx: number;
  question_text: string | null;
  accepted_answers: string[];
  explanation: string | null;
  audio_url: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnswerKeyLookup {
  level: string;
  module: string;
  lesson_id: string;
  section_key?: string;
  question_idx?: number;
}

export async function fetchAnswerKey(lookup: AnswerKeyLookup): Promise<AnswerKey | null> {
  const { data } = await supabase
    .from('classe_answer_keys')
    .select('*')
    .eq('level', lookup.level)
    .eq('module', lookup.module)
    .eq('lesson_id', lookup.lesson_id)
    .eq('section_key', lookup.section_key ?? '')
    .eq('question_idx', lookup.question_idx ?? 0)
    .maybeSingle();
  return (data as AnswerKey | null) ?? null;
}

export async function fetchAnswerKeysForLesson(level: string, module: string, lesson_id: string): Promise<AnswerKey[]> {
  const { data } = await supabase
    .from('classe_answer_keys')
    .select('*')
    .eq('level', level)
    .eq('module', module)
    .eq('lesson_id', lesson_id)
    .order('section_key')
    .order('question_idx');
  return (data ?? []) as AnswerKey[];
}

export async function upsertAnswerKey(input: Omit<AnswerKey, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> & { id?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  const payload = {
    ...input,
    updated_by: user?.id,
    ...(input.id ? {} : { created_by: user?.id }),
  };
  const { data, error } = await supabase
    .from('classe_answer_keys')
    .upsert(payload, { onConflict: 'level,module,lesson_id,section_key,question_idx' })
    .select()
    .single();
  if (error) throw error;
  return data as AnswerKey;
}

export async function deleteAnswerKey(id: string) {
  const { error } = await supabase.from('classe_answer_keys').delete().eq('id', id);
  if (error) throw error;
}

/** Vérifie si la réponse de l'élève correspond à l'une des réponses acceptées (insensible casse/accents/ponctuation). */
export function matchAnswer(studentAnswer: string, accepted: string[]): boolean {
  if (!studentAnswer || !accepted?.length) return false;
  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9ɔɛŋɲɓɗƴ\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  const studentNorm = normalize(studentAnswer);
  return accepted.some(a => normalize(a) === studentNorm);
}
