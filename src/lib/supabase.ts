import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

export class SupabaseConfigurationError extends Error {
  constructor(message = 'Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.') {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

/**
 * Single instance of Supabase Client.
 * When unconfigured, a dummy client is provided to prevent boot crashes,
 * but operations will be guarded by requireSupabase() / env.isSupabaseConfigured.
 */
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

/**
 * Asserts that Supabase is properly configured before executing a backend operation.
 * Prevents silent failures or false successes.
 */
export function requireSupabase(): SupabaseClient {
  if (!env.isSupabaseConfigured) {
    throw new SupabaseConfigurationError();
  }
  return supabase;
}

export { env };
