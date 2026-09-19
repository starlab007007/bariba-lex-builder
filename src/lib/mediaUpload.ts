import { supabase } from '@/integrations/supabase/client';

export const MEDIA_LIMITS = {
  videoMaxBytes: 50 * 1024 * 1024, // 50 Mo
  videoMaxSeconds: 60,
  imageMaxBytes: 10 * 1024 * 1024,
  audioMaxBytes: 25 * 1024 * 1024,
};

export class MediaUploadError extends Error {}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function extensionFor(file: Blob, fallback: string): string {
  const t = (file.type || '').toLowerCase();
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('quicktime')) return 'mov';
  if (t.includes('webm')) return 'webm';
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  if (t.includes('mpeg')) return 'mp3';
  if (t.includes('ogg')) return 'ogg';
  return fallback;
}

/** Durée d'une vidéo/audio locale, en secondes. Retourne null si indéterminable. */
export function probeDuration(file: Blob, kind: 'video' | 'audio'): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind);
    let settled = false;
    const done = (v: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(v);
    };
    el.preload = 'metadata';
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    el.src = url;
  });
}

export function assertWithinLimits(file: Blob, kind: 'video' | 'photo' | 'audio') {
  const max =
    kind === 'video' ? MEDIA_LIMITS.videoMaxBytes : kind === 'photo' ? MEDIA_LIMITS.imageMaxBytes : MEDIA_LIMITS.audioMaxBytes;
  if (file.size > max) {
    const mb = Math.round(max / (1024 * 1024));
    throw new MediaUploadError(`Fichier trop volumineux (maximum ${mb} Mo).`);
  }
}

export interface UploadOptions {
  bucket?: string;
  folder?: string;
  kind: 'video' | 'photo' | 'audio';
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Envoi d'un média par flux (XHR) avec progression réelle, délai d'attente et annulation.
 * Le fichier n'est jamais chargé entièrement en mémoire : le navigateur streame le Blob/File.
 */
export async function uploadMediaWithProgress(file: Blob, opts: UploadOptions): Promise<string> {
  const bucket = opts.bucket || 'tamtam-media';
  const kind = opts.kind;
  assertWithinLimits(file, kind);

  if (kind === 'video') {
    const duration = await probeDuration(file, 'video');
    if (duration !== null && duration > MEDIA_LIMITS.videoMaxSeconds + 1) {
      throw new MediaUploadError(`Vidéo trop longue (maximum ${MEDIA_LIMITS.videoMaxSeconds} secondes).`);
    }
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new MediaUploadError('Connectez-vous pour envoyer un média.');

  const ext = extensionFor(file, kind === 'video' ? 'webm' : kind === 'photo' ? 'jpg' : 'webm');
  const folder = opts.folder || 'posts';
  const path = `${folder}/${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.timeout = timeoutMs;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new MediaUploadError(`Envoi refusé par le serveur (code ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new MediaUploadError('Connexion interrompue pendant l\u2019envoi.'));
    xhr.ontimeout = () => reject(new MediaUploadError('L\u2019envoi a pris trop de temps. Réessayez avec un réseau plus stable.'));
    xhr.onabort = () => reject(new MediaUploadError('Envoi annulé.'));

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
      } else {
        opts.signal.addEventListener('abort', () => xhr.abort(), { once: true });
      }
    }

    xhr.send(file);
  });

  opts.onProgress?.(100);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
