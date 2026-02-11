import { supabase } from '@/integrations/supabase/client';
import type { ConteVivantStory, StoryGraph } from '../types/story.types';

// ===== STORIES CRUD =====

export async function fetchPublishedStories(): Promise<ConteVivantStory[]> {
  const { data, error } = await supabase
    .from('conte_vivant_stories')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ConteVivantStory[];
}

export async function fetchMyStories(userId: string): Promise<ConteVivantStory[]> {
  const { data, error } = await supabase
    .from('conte_vivant_stories')
    .select('*')
    .eq('creator_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ConteVivantStory[];
}

export async function fetchStoryById(id: string): Promise<ConteVivantStory | null> {
  const { data, error } = await supabase
    .from('conte_vivant_stories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ConteVivantStory | null;
}

export async function createStory(story: {
  creator_id: string;
  title: string;
  description?: string;
  graph: StoryGraph;
  languages?: string[];
  total_segments: number;
  total_endings: number;
  thumbnail_url?: string;
}): Promise<ConteVivantStory> {
  const insertPayload: Record<string, unknown> = {
    creator_id: story.creator_id,
    title: story.title,
    description: story.description,
    graph: story.graph as unknown as Record<string, unknown>,
    languages: story.languages,
    total_segments: story.total_segments,
    total_endings: story.total_endings,
    thumbnail_url: story.thumbnail_url,
    status: 'draft',
  };
  const { data, error } = await supabase
    .from('conte_vivant_stories')
    .insert(insertPayload as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ConteVivantStory;
}

export async function updateStory(id: string, updates: Partial<{
  title: string;
  description: string;
  graph: StoryGraph;
  status: string;
  total_segments: number;
  total_endings: number;
  thumbnail_url: string;
  published_at: string;
}>): Promise<void> {
  const payload: Record<string, unknown> = { ...updates };
  if (updates.graph) {
    payload.graph = updates.graph as unknown as Record<string, unknown>;
  }
  const { error } = await supabase
    .from('conte_vivant_stories')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function publishStory(id: string): Promise<void> {
  await updateStory(id, {
    status: 'published',
    published_at: new Date().toISOString(),
  });
}

export async function deleteStory(id: string): Promise<void> {
  const { error } = await supabase
    .from('conte_vivant_stories')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ===== PROGRESS =====

export async function fetchProgress(userId: string, storyId: string) {
  const { data, error } = await supabase
    .from('conte_vivant_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('story_id', storyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProgress(progress: {
  user_id: string;
  story_id: string;
  path_taken: string[];
  choices: Record<string, string>;
  endings_unlocked: string[];
  completed_at?: string;
  replay_count?: number;
}): Promise<void> {
  const upsertPayload: Record<string, unknown> = {
    user_id: progress.user_id,
    story_id: progress.story_id,
    path_taken: progress.path_taken,
    choices: progress.choices as unknown as Record<string, unknown>,
    endings_unlocked: progress.endings_unlocked,
    completed_at: progress.completed_at,
    replay_count: progress.replay_count,
  };
  const { error } = await supabase
    .from('conte_vivant_progress')
    .upsert(upsertPayload as any, { onConflict: 'user_id,story_id' });
  if (error) throw error;
}
