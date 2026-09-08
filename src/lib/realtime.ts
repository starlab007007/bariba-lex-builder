/**
 * Helpers for Supabase Realtime channels.
 *
 * Supabase throws
 *   "cannot add 'postgres_changes' callbacks for realtime:<name> after 'subscribe()'"
 * whenever a channel name that is already subscribed gets reused (two screens
 * mounting the same hook, React StrictMode double-mount, fast remounts...).
 *
 * Using a unique name per mount guarantees a brand new channel instance every
 * time, so listeners are always registered before subscribe().
 */
export function uniqueChannelName(base: string): string {
  return `${base}:${Math.random().toString(36).slice(2)}`;
}
