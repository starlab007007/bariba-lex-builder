import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const FITILA_SUPABASE_URL = 'https://dvswhjawiooprghzeyol.supabase.co';
const FITILA_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Rs6ysvbwQ0oGpHuYulZ5Hw_loUqyGKw';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL || FITILA_SUPABASE_URL;
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FITILA_SUPABASE_PUBLISHABLE_KEY;

// FITILA has a single canonical Supabase project. Refuse silent drift to any legacy backend.
const SUPABASE_URL = configuredUrl.includes('dvswhjawiooprghzeyol')
  ? configuredUrl
  : FITILA_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = SUPABASE_URL === configuredUrl
  ? configuredKey
  : FITILA_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
