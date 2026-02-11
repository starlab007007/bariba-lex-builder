/**
 * Conte Vivant - Types pour le storytelling interactif à embranchements
 */

export interface StoryChoice {
  id: string;
  label: string;
  icon: string;
  next_segment: string;
  is_default: boolean;
}

export interface StorySegment {
  id: string;
  title: string;
  audio_url?: string;
  video_url?: string;
  image_urls?: string[];
  duration: number; // seconds
  is_choice_point: boolean;
  choices: StoryChoice[];
  is_ending: boolean;
  ending_badge?: string;
  ending_title?: string;
  text_content?: string;
  narrator_style?: string;
}

export interface StoryGraph {
  entry_segment: string;
  segments: Record<string, StorySegment>;
}

export interface ConteVivantStory {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  languages: string[];
  graph: StoryGraph;
  status: 'draft' | 'published';
  total_segments: number;
  total_endings: number;
  thumbnail_url?: string;
  created_at: string;
  published_at?: string;
  updated_at: string;
}

export interface ConteVivantProgress {
  id: string;
  user_id: string;
  story_id: string;
  path_taken: string[];
  choices: Record<string, string>;
  endings_unlocked: string[];
  completed_at?: string;
  replay_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConteVivantVote {
  id: string;
  session_id: string;
  story_id: string;
  segment_id: string;
  results: Record<string, number>;
  winner?: string;
  voter_count: number;
  resolved_at?: string;
  created_at: string;
}

// Builder step types
export type BuilderStep = 
  | 'intro' 
  | 'choices' 
  | 'branches' 
  | 'endings' 
  | 'preview' 
  | 'publish';

export interface SegmentDraft {
  id: string;
  title: string;
  text_content: string;
  audio_blob?: Blob;
  audio_url?: string;
  image_urls: string[];
  duration: number;
  is_ending: boolean;
  ending_badge?: string;
  ending_title?: string;
}

export interface ChoiceDraft {
  id: string;
  label: string;
  icon: string;
  is_default: boolean;
}

export interface BranchDraft {
  choice: ChoiceDraft;
  segment: SegmentDraft;
  sub_choices?: ChoiceDraft[];
  sub_branches?: { choice: ChoiceDraft; segment: SegmentDraft }[];
}
