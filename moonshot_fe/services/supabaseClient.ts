import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../src/lib/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey = 'public-anon-key-placeholder';

const isValidSupabaseUrl = (value?: string) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const isConfigured = isValidSupabaseUrl(supabaseUrl) && !!supabaseAnonKey;
const urlToUse = isConfigured ? (supabaseUrl as string) : fallbackUrl;
const anonKeyToUse = isConfigured ? (supabaseAnonKey as string) : fallbackAnonKey;

if (!isConfigured) {
  logger.warn('supabase.config.missing', {
    meta: {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    }
  });
}

export const supabase: SupabaseClient = createClient(urlToUse, anonKeyToUse, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export const isSupabaseConfigured = isConfigured;
