export type AndroidRelease = { version: string; build_number?: number; published_at?: string; signing: string; arm64: string; armv7?: string };
export const ANDROID_MANIFEST = '/dunya-packs/android/releases.json';
const apkPath = (value: unknown): value is string => typeof value === 'string' && /^\/dunya-packs\/android\/[a-zA-Z0-9_./-]+\.apk$/.test(value) && !value.includes('..');
export async function availableApk(url: string, signal?: AbortSignal): Promise<boolean> {
  if (!apkPath(url)) return false;
  const response = await fetch(url, { method: 'HEAD', cache: 'no-store', signal });
  const type = (response.headers.get('content-type') || '').toLowerCase();
  return response.ok && /application\/(?:vnd\.android\.package-archive|octet-stream|zip)/.test(type) && Number(response.headers.get('content-length')) > 1024 * 1024;
}
export async function latestAndroidRelease(signal?: AbortSignal): Promise<AndroidRelease> {
  const response = await fetch(`${ANDROID_MANIFEST}?v=${Date.now()}`, { cache: 'no-store', signal });
  if (!response.ok) throw new Error('manifest');
  const data = await response.json();
  const releases: AndroidRelease[] = (Array.isArray(data?.releases) ? data.releases : [])
    .filter((entry: AndroidRelease) => entry?.signing === 'production' && apkPath(entry.arm64))
    .sort((a: AndroidRelease, b: AndroidRelease) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
  for (const entry of releases) {
    try { if (await availableApk(entry.arm64, signal)) return entry; }
    catch (error) { if (signal?.aborted) throw error; }
  }
  throw new Error('unavailable');
}
export function saveAndroidApk(url: string) {
  if (!apkPath(url)) throw new Error('invalid-apk-path');
  // A download request must never become a React/PWA navigation.
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = url.split('/').pop() || 'FITILA.apk';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
