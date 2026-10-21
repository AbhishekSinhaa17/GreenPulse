import { requireSupabase, env } from '../lib/supabase';
import type { Subscription } from '../types';

export const subscriptionService = {
  /**
   * Fetches the active or latest subscription record for the given user from PostgreSQL.
   * Returns null if the user has no recorded subscription.
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    if (!env.isSupabaseConfigured) return null;
    const client = requireSupabase();

    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('[subscriptionService] Error fetching user subscription:', error);
      throw error;
    }

    return data as Subscription | null;
  },
};
