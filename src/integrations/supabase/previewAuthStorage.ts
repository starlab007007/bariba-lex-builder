// FITILA uses its own Supabase project and standard browser storage.
export function brokeredPreviewStorage() {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}
