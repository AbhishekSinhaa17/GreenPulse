import { requireSupabase, env } from '../lib/supabase';
import type { UserProfile } from '../types';

export const authService = {
  async signUp(email: string, password: string, fullName: string) {
    if (!env.isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to enable registration.'
      );
    }
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    if (!env.isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to sign in.'
      );
    }
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle(redirectTo?: string) {
    if (!env.isSupabaseConfigured) {
      throw new Error(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file to sign in with Google.'
      );
    }
    const client = requireSupabase();
    const origin = typeof window !== 'undefined' ? window.location.origin : (env.appUrl || 'http://localhost:5173');
    // Ensure redirectTo is strictly within our trusted origin
    const targetRedirect = redirectTo && redirectTo.startsWith(origin) 
      ? redirectTo 
      : `${origin}/auth/callback`;

    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: targetRedirect,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!env.isSupabaseConfigured) return;
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    if (!env.isSupabaseConfigured) return null;
    const client = requireSupabase();
    const { data } = await client.auth.getSession();
    return data.session;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!env.isSupabaseConfigured) return null;
    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as UserProfile | null;
  },

  async ensureUserProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<UserProfile> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const client = requireSupabase();

    // 1. Try to get existing profile first
    const existing = await this.getUserProfile(user.id);
    if (existing) {
      return existing;
    }

    // 2. Safe idempotent insertion if trigger has not executed yet
    const fullName = String(
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Golfer'
    );
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
      ? String(user.user_metadata?.avatar_url || user.user_metadata?.picture)
      : null;

    const { data, error } = await client
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email || '',
          full_name: fullName,
          avatar_url: avatarUrl,
          role: 'subscriber', // STRICT: Client cannot escalate role
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
      .select('*')
      .maybeSingle();

    if (error) {
      // In case another process created it concurrently, attempt fetch
      const refetched = await this.getUserProfile(user.id);
      if (refetched) return refetched;
      console.warn('[authService] ensureUserProfile upsert note:', error.message);
    }

    if (data) {
      return data as UserProfile;
    }

    // Fallback retrieve
    const fallback = await this.getUserProfile(user.id);
    if (fallback) return fallback;

    // Return a synthesized subscriber profile if database write is pending
    return {
      id: user.id,
      email: user.email || '',
      full_name: fullName,
      avatar_url: avatarUrl || undefined,
      role: 'subscriber',
      handicap: undefined,
      home_club: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async updateProfile(userId: string, updates: Partial<Pick<UserProfile, 'full_name' | 'handicap' | 'home_club' | 'avatar_url'>>) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as UserProfile;
  },
};

