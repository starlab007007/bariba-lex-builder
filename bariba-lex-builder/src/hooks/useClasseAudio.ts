import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';
import type { ContentItem } from '@/lib/classeContentKeys';

export type AudioStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// ── LRU Cache mémoire pour signed URLs (≤50 min, signed URL = 1h) ──
interface CachedUrl { url: string; expiresAt: number; }
const SIGNED_URL_CACHE = new Map<string, CachedUrl>();
const SIGNED_URL_TTL_MS = 50 * 60_000;
const SIGNED_URL_MAX = 200;

function getCachedSignedUrl(key: string): string | null {
  const entry = SIGNED_URL_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    SIGNED_URL_CACHE.delete(key);
    return null;
  }
  // LRU: refresh
  SIGNED_URL_CACHE.delete(key);
  SIGNED_URL_CACHE.set(key, entry);
  return entry.url;
}

function setCachedSignedUrl(key: string, url: string) {
  if (SIGNED_URL_CACHE.size >= SIGNED_URL_MAX) {
    const firstKey = SIGNED_URL_CACHE.keys().next().value;
    if (firstKey) SIGNED_URL_CACHE.delete(firstKey);
  }
  SIGNED_URL_CACHE.set(key, { url, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
}

export interface ClasseAudioRow {
  id: string;
  content_key: string;
  content_type: string;
  content_text: string;
  level: string;
  module: string;
  lesson_id: number | null;
  section_key: string | null;
  item_index: number | null;
  hierarchy_label: string | null;
  storage_path: string;
  file_name: string;
  duration_seconds: number | null;
  peak_db: number | null;
  rms_db: number | null;
  quality_score: number | null;
  teacher_id: string;
  status: AudioStatus;
  admin_id: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  version: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

/** Teacher: list current audios for a given (level, module, lessonId). */
export function useLessonAudios(level: string, module: string, lessonId: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['classe-audio-lesson', level, module, lessonId, user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<ClasseAudioRow[]> => {
      const { data, error } = await supabase
        .from('classe_content_audios')
        .select('*')
        .eq('level', level)
        .eq('module', module)
        .eq('lesson_id', lessonId)
        .eq('is_current', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClasseAudioRow[];
    },
  });
}

/** Teacher: counts per lesson for a (level, module). */
export function useModuleAudioCounts(level: string, module: string) {
  return useQuery({
    queryKey: ['classe-audio-module-counts', level, module],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classe_content_audios')
        .select('lesson_id,status,is_current')
        .eq('level', level)
        .eq('module', module)
        .eq('is_current', true);
      if (error) throw error;
      const map = new Map<number, { total: number; approved: number; submitted: number; rejected: number; draft: number }>();
      for (const row of (data ?? []) as any[]) {
        const k = row.lesson_id ?? -1;
        const cur = map.get(k) ?? { total: 0, approved: 0, submitted: 0, rejected: 0, draft: 0 };
        cur.total += 1;
        cur[row.status as keyof typeof cur] = (cur[row.status as keyof typeof cur] as number) + 1;
        map.set(k, cur);
      }
      return map;
    },
  });
}

/** Learner: lookup approved audio for a content_key. */
export function useApprovedAudio(contentKey: string | undefined) {
  return useQuery({
    queryKey: ['classe-audio-approved', contentKey],
    enabled: !!contentKey,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classe_content_audios')
        .select('id,storage_path,file_name,duration_seconds,content_text')
        .eq('content_key', contentKey!)
        .eq('is_current', true)
        .eq('status', 'approved')
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // Cache LRU mémoire pour éviter re-fetch entre leçons
      const cached = getCachedSignedUrl(data.storage_path);
      if (cached) return { ...data, signed_url: cached };
      const { data: signed, error: sErr } = await supabase.storage
        .from('classe-audio')
        .createSignedUrl(data.storage_path, 60 * 60);
      if (sErr) throw sErr;
      const url = signed?.signedUrl ?? null;
      if (url) setCachedSignedUrl(data.storage_path, url);
      return { ...data, signed_url: url };
    },
  });
}

export interface UploadParams {
  item: ContentItem;
  wavBlob: Blob;
  durationSec: number;
  peakDb: number;
  rmsDb: number;
  qualityScore: number;
  status: 'draft' | 'submitted';
}

export function useUploadClasseAudio() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: UploadParams) => {
      if (!user) throw new Error('Non connecté');
      const { item } = p;
      const ts = Date.now();
      const sanitize = (s: string) =>
        (s || 'item')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[ɛƐ]/g, 'e')
          .replace(/[ɔƆ]/g, 'o')
          .replace(/[ŋŊ]/g, 'n')
          .replace(/[ɲƝ]/g, 'ny')
          .replace(/[ɓƁ]/g, 'b')
          .replace(/[ɗƊ]/g, 'd')
          .replace(/[ƴƳ]/g, 'y')
          .replace(/[^A-Za-z0-9._-]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 60) || 'item';
      const safeSection = sanitize(item.section_key || 'item');
      const safeModule = sanitize(item.module);
      const safeLevel = sanitize(item.level);
      const fname = `${safeModule}_${safeLevel}_L${item.lesson_id}_${safeSection}_${item.item_index ?? 0}_${ts}.wav`;
      const path = `${user.id}/${safeLevel}/${safeModule}/${item.lesson_id}/${fname}`;
      const { error: upErr } = await supabase.storage
        .from('classe-audio')
        .upload(path, p.wavBlob, { contentType: 'audio/wav', upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from('classe_content_audios')
        .insert({
          content_key: item.content_key,
          content_type: item.content_type,
          content_text: item.content_text,
          level: item.level,
          module: item.module,
          lesson_id: item.lesson_id,
          section_key: item.section_key ?? null,
          item_index: item.item_index ?? null,
          hierarchy_label: item.hierarchy_label,
          storage_path: path,
          file_name: fname,
          duration_seconds: p.durationSec,
          peak_db: p.peakDb,
          rms_db: p.rmsDb,
          quality_score: p.qualityScore,
          teacher_id: user.id,
          status: p.status,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ClasseAudioRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['classe-audio-lesson', row.level, row.module, row.lesson_id] });
      qc.invalidateQueries({ queryKey: ['classe-audio-module-counts', row.level, row.module] });
      qc.invalidateQueries({ queryKey: ['classe-audio-approved', row.content_key] });
    },
  });
}

export function useUpdateAudioStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: AudioStatus; admin_notes?: string }) => {
      const patch: any = { status: params.status };
      if (params.status === 'approved' || params.status === 'rejected') {
        patch.admin_notes = params.admin_notes ?? null;
        patch.reviewed_at = new Date().toISOString();
        const { data: u } = await supabase.auth.getUser();
        patch.admin_id = u.user?.id ?? null;
      }
      const { data, error } = await supabase
        .from('classe_content_audios')
        .update(patch)
        .eq('id', params.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ClasseAudioRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['classe-audio-lesson', row.level, row.module, row.lesson_id] });
      qc.invalidateQueries({ queryKey: ['classe-audio-module-counts', row.level, row.module] });
      qc.invalidateQueries({ queryKey: ['classe-audio-approved', row.content_key] });
      qc.invalidateQueries({ queryKey: ['classe-audio-admin-queue'] });
    },
  });
}

export function useDeleteAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id: string; storage_path: string; level: string; module: string; lesson_id: number; content_key: string }) => {
      await supabase.storage.from('classe-audio').remove([row.storage_path]).catch(() => {});
      const { error } = await supabase.from('classe_content_audios').delete().eq('id', row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['classe-audio-lesson', row.level, row.module, row.lesson_id] });
      qc.invalidateQueries({ queryKey: ['classe-audio-module-counts', row.level, row.module] });
      qc.invalidateQueries({ queryKey: ['classe-audio-approved', row.content_key] });
    },
  });
}

/** Admin queue: list audios filtered by status and optional scope. */
export function useAdminAudioQueue(filter: { status?: AudioStatus; level?: string; module?: string }) {
  return useQuery({
    queryKey: ['classe-audio-admin-queue', filter],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase.from('classe_content_audios').select('*').order('created_at', { ascending: false }).limit(500);
      if (filter.status) q = q.eq('status', filter.status);
      if (filter.level) q = q.eq('level', filter.level);
      if (filter.module) q = q.eq('module', filter.module);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ClasseAudioRow[];
    },
  });
}

/** Get a signed URL for any storage_path (teacher preview / admin review). */
export function useGetSignedUrl() {
  return useCallback(async (storagePath: string, expiresInSec = 3600) => {
    const { data, error } = await supabase.storage
      .from('classe-audio')
      .createSignedUrl(storagePath, expiresInSec);
    if (error) throw error;
    return data.signedUrl;
  }, []);
}