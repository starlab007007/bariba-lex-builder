import { supabase } from '@/integrations/supabase/client';
import { htmlToText, searchKey } from './baribaText';

// Les tables `espace_*` ne sont pas encore dans les types générés : accès non typé, modèles typés ici.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type EspaceFolder = { id: string; parent_id: string | null; name: string; color: string | null; created_at: string };
export type EspaceDoc = {
  id: string;
  owner_id: string;
  folder_id: string | null;
  title: string;
  category: string;
  tags: string[];
  content_html: string;
  content_text: string;
  source: 'editor' | 'upload' | 'ocr' | 'import';
  file_path: string | null;
  file_mime: string | null;
  file_size: number | null;
  metadata: Record<string, unknown>;
  version: number;
  archived: boolean;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};
export type EspaceVersion = { id: string; version: number; title: string; content_html: string; content_text: string; created_at: string };
export type EspaceOcrJob = {
  id: string;
  document_id: string | null;
  file_name: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  confidence: number | null;
  page_count: number;
  error: string | null;
  created_at: string;
};
export type EspacePermission = {
  id: string;
  grantee_id: string | null;
  share_token: string | null;
  role: 'viewer' | 'editor';
  expires_at: string | null;
  created_at: string;
};

export const CATEGORIES = [
  { id: 'general', label: 'Général' },
  { id: 'litterature', label: 'Littérature & contes' },
  { id: 'education', label: 'Éducation' },
  { id: 'administratif', label: 'Administratif' },
  { id: 'histoire', label: 'Histoire & culture' },
  { id: 'religion', label: 'Religion' },
  { id: 'recherche', label: 'Recherche linguistique' },
  { id: 'manuscrit', label: 'Manuscrits numérisés' },
] as const;

function fail(error: { message: string } | null | undefined): never | void {
  if (error) throw new Error(error.message);
}

const DOC_LIST_COLUMNS = 'id,owner_id,folder_id,title,category,tags,source,file_mime,version,archived,favorite,created_at,updated_at,content_text';

export async function listDocuments(opts: { archived?: boolean; folderId?: string | null; tag?: string; category?: string; q?: string; limit?: number } = {}) {
  let query = db.from('espace_documents').select(DOC_LIST_COLUMNS).eq('archived', !!opts.archived).order('updated_at', { ascending: false }).limit(opts.limit ?? 300);
  if (opts.folderId) query = query.eq('folder_id', opts.folderId);
  if (opts.tag) query = query.contains('tags', [opts.tag]);
  if (opts.category) query = query.eq('category', opts.category);
  const key = opts.q ? searchKey(opts.q) : '';
  // La colonne `search_text` est pliée côté serveur : « Baatonu » retrouve « Bàátɔ̀nú ».
  if (key) query = query.ilike('search_text', `%${key.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  const { data, error } = await query;
  fail(error);
  return (data ?? []) as Omit<EspaceDoc, 'content_html' | 'file_path' | 'file_size' | 'metadata' | 'owner_id'>[] as unknown as EspaceDoc[];
}

export async function getDocument(id: string): Promise<EspaceDoc> {
  const { data, error } = await db.from('espace_documents').select('*').eq('id', id).single();
  fail(error);
  return data as EspaceDoc;
}

export async function createDocument(input: Partial<EspaceDoc> & { title?: string }): Promise<EspaceDoc> {
  const content_html = input.content_html ?? '';
  const { data, error } = await db
    .from('espace_documents')
    .insert({ ...input, content_html, content_text: input.content_text ?? htmlToText(content_html) })
    .select('*')
    .single();
  fail(error);
  return data as EspaceDoc;
}

export async function updateDocument(id: string, patch: Partial<EspaceDoc>): Promise<EspaceDoc> {
  const next = { ...patch } as Record<string, unknown>;
  if (typeof patch.content_html === 'string') next.content_text = htmlToText(patch.content_html);
  delete next.version;
  const { data, error } = await db.from('espace_documents').update(next).eq('id', id).select('*').single();
  fail(error);
  return data as EspaceDoc;
}

export async function deleteDocument(id: string, filePath?: string | null) {
  const { error } = await db.from('espace_documents').delete().eq('id', id);
  fail(error);
  if (filePath) await supabase.storage.from('espace-files').remove([filePath]);
}

export async function listFolders(): Promise<EspaceFolder[]> {
  const { data, error } = await db.from('espace_folders').select('id,parent_id,name,color,created_at').order('name');
  fail(error);
  return (data ?? []) as EspaceFolder[];
}
export async function createFolder(name: string, parent_id: string | null = null): Promise<EspaceFolder> {
  const { data, error } = await db.from('espace_folders').insert({ name: name.trim(), parent_id }).select('*').single();
  fail(error);
  return data as EspaceFolder;
}
export async function renameFolder(id: string, name: string) {
  const { error } = await db.from('espace_folders').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', id);
  fail(error);
}
export async function deleteFolder(id: string) {
  const { error } = await db.from('espace_folders').delete().eq('id', id);
  fail(error);
}

export async function listVersions(documentId: string): Promise<EspaceVersion[]> {
  const { data, error } = await db
    .from('espace_document_versions')
    .select('id,version,title,content_html,content_text,created_at')
    .eq('document_id', documentId)
    .order('version', { ascending: false })
    .limit(100);
  fail(error);
  return (data ?? []) as EspaceVersion[];
}

export async function listPermissions(documentId: string): Promise<EspacePermission[]> {
  const { data, error } = await db.from('espace_permissions').select('id,grantee_id,share_token,role,expires_at,created_at').eq('document_id', documentId).order('created_at', { ascending: false });
  fail(error);
  return (data ?? []) as EspacePermission[];
}
export async function shareWithEmail(documentId: string, email: string, role: 'viewer' | 'editor') {
  const { error } = await db.rpc('espace_share_with_email', { _doc: documentId, _email: email, _role: role });
  fail(error);
}
export async function createShareLink(documentId: string, role: 'viewer' | 'editor', hours: number): Promise<string> {
  const { data, error } = await db.rpc('espace_create_share_link', { _doc: documentId, _role: role, _hours: hours });
  fail(error);
  return data as string;
}
export async function revokePermission(id: string) {
  const { error } = await db.from('espace_permissions').delete().eq('id', id);
  fail(error);
}
export function shareUrl(token: string) {
  return `${window.location.origin}/espace/partage/${token}`;
}

export type SharedDoc = { id: string; title: string; content_html: string; role: 'viewer' | 'editor'; expires_at: string | null; owner_name: string; updated_at: string };
export async function getShared(token: string): Promise<SharedDoc | null> {
  const { data, error } = await db.rpc('espace_get_shared', { _token: token });
  fail(error);
  return (Array.isArray(data) ? data[0] : data) ?? null;
}
export async function saveShared(token: string, html: string) {
  const { error } = await db.rpc('espace_save_shared', { _token: token, _html: html, _text: htmlToText(html) });
  fail(error);
}

/** Envoie un fichier dans le coffre : `{userId}/{docId}/{nom}`. */
export async function uploadFile(userId: string, docId: string, file: File | Blob, name: string): Promise<string> {
  const safe = name.normalize('NFC').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-120) || 'fichier';
  const path = `${userId}/${docId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from('espace-files').upload(path, file, { upsert: false, contentType: (file as File).type || undefined });
  fail(error);
  return path;
}
export async function signedFileUrl(path: string, seconds = 300): Promise<string | null> {
  const { data } = await supabase.storage.from('espace-files').createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function listOcrJobs(limit = 8): Promise<EspaceOcrJob[]> {
  const { data, error } = await db.from('espace_ocr_jobs').select('id,document_id,file_name,status,confidence,page_count,error,created_at').order('created_at', { ascending: false }).limit(limit);
  fail(error);
  return (data ?? []) as EspaceOcrJob[];
}
export async function createOcrJob(input: { file_name: string; file_mime: string; page_count: number; file_path?: string | null }): Promise<string> {
  const { data, error } = await db.from('espace_ocr_jobs').insert({ ...input, status: 'processing' }).select('id').single();
  fail(error);
  return data.id as string;
}
export async function finishOcrJob(id: string, patch: { status: 'done' | 'failed'; engine?: string; confidence?: number; extracted_text?: string; pages?: unknown; error?: string; document_id?: string | null }) {
  const { error } = await db.from('espace_ocr_jobs').update({ ...patch, finished_at: new Date().toISOString() }).eq('id', id);
  fail(error);
}

export async function runOcrRemote(pages: string[], mode: 'printed' | 'handwritten') {
  const { data, error } = await supabase.functions.invoke('espace-ocr', { body: { pages, mode } });
  if (error) {
    // Le corps d'erreur JSON contient un message lisible (ex. moteur non configuré).
    let message = error.message;
    try {
      const body = await (error as unknown as { context?: Response }).context?.json();
      if (body?.message || body?.error) message = body.message ?? body.error;
    } catch {
      /* corps illisible */
    }
    throw new Error(message);
  }
  return data as { engine: string; text: string; confidence: number; pages: { page: number; text: string; confidence: number; notes: string[] }[] };
}

export async function espaceStats() {
  const [docs, archived, folders, jobs] = await Promise.all([
    db.from('espace_documents').select('id', { count: 'exact', head: true }).eq('archived', false),
    db.from('espace_documents').select('id', { count: 'exact', head: true }).eq('archived', true),
    db.from('espace_folders').select('id', { count: 'exact', head: true }),
    db.from('espace_ocr_jobs').select('id', { count: 'exact', head: true }).eq('status', 'done'),
  ]);
  return { docs: docs.count ?? 0, archived: archived.count ?? 0, folders: folders.count ?? 0, scans: jobs.count ?? 0 };
}

/** Traduction en ligne (moteur `ai-translate`) ; renvoie null si indisponible (hors ligne, non connecté). */
export async function translateRemote(text: string, direction: 'ba-fr' | 'fr-ba'): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-translate', {
      body: { text, sourceLang: direction === 'ba-fr' ? 'bariba' : 'french', targetLang: direction === 'ba-fr' ? 'french' : 'bariba' },
    });
    if (error) return null;
    const t = typeof data?.translation === 'string' ? data.translation.trim() : '';
    return t || null;
  } catch {
    return null;
  }
}
