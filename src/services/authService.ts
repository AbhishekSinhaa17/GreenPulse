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
