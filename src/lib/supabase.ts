import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export class SupabaseConfigurationError extends Error {
  constructor(message = 'Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.') {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

export const supabase: SupabaseClient = createClient(
  env.supabaseUrl || 'https://placeholder-project.supabase.co',
  env.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function requireSupabase(): SupabaseClient {
  if (!env.isSupabaseConfigured) {
    throw new SupabaseConfigurationError();
  }
  return supabase;
}

export { env };
