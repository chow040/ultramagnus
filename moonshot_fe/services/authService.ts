import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile } from '../types';
import { logger } from '../src/lib/logger';

const deriveDisplayName = (email: string) => {
  const base = email.split('@')[0] || 'Trader';
  const normalized = base.replace(/[^a-zA-Z]/g, '') || 'Trader';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const mapProfile = (row: any): UserProfile => ({
  id: row.id,
  email: row.email,
  name: row.display_name || deriveDisplayName(row.email || ''),
  tier: (row.tier as UserProfile['tier']) || 'Pro',
  joinDate: row.join_date ? new Date(row.join_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '',
  avatarUrl: row.avatar_url || undefined
});

const ensureProfile = async (userId: string, email: string, displayName?: string) => {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (existing) return mapProfile(existing);

  const profilePayload = {
    id: userId,
    email,
    display_name: displayName || deriveDisplayName(email),
    tier: 'Pro'
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .insert(profilePayload)
    .select('*')
    .single();

  if (error) {
    logger.captureError(error, {
      meta: { scope: 'supabase.ensureProfile', userId }
    });
    return {
      id: userId,
      email,
      name: profilePayload.display_name,
      tier: 'Pro',
      joinDate: '',
      avatarUrl: undefined
    };
  }

  return mapProfile(data);
};

export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin
    }
  });

  if (error) throw error;

  const needsEmailConfirmation = !data.session;
  let profile: UserProfile | undefined;

  if (data.user?.id) {
    profile = await ensureProfile(data.user.id, email, displayName);
  }

  return {
    session: data.session,
    user: data.user,
    profile,
    needsEmailConfirmation
  };
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  let profile: UserProfile | undefined;
  if (data.user?.id) {
    profile = await ensureProfile(data.user.id, email);
  }

  return {
    session: data.session,
    user: data.user,
    profile
  };
};

export const signInWithGoogle = async (redirectTo?: string) => {
  if (!isSupabaseConfigured) {
    throw new Error('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const { error, data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || window.location.origin,
      queryParams: {
        prompt: 'select_account'
      }
    }
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const fetchProfileByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return mapProfile(data);
};
