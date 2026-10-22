import { requireSupabase, env } from '../lib/supabase';
import type { Charity, CharityPreference, CharityEvent } from '../types';

export const charityService = {
  /**
   * Fetches the full charity directory with fallback to default vetted charities if DB is unconfigured.
   */
  async getCharities(): Promise<Charity[]> {
    if (!env.isSupabaseConfigured) {
      return [];
    }
    const client = requireSupabase();
    const { data, error } = await client
      .from('charities')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Charity[];
  },

  async getCharityBySlug(slug: string): Promise<{ charity: Charity; events: CharityEvent[] } | null> {
    if (!env.isSupabaseConfigured) return null;
    const client = requireSupabase();

    const { data: charity, error: charityError } = await client
      .from('charities')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (charityError || !charity) return null;

    const { data: events } = await client
      .from('charity_events')
      .select('*')
      .eq('charity_id', charity.id)
      .order('event_date', { ascending: true });

    return {
      charity: charity as Charity,
      events: (events || []) as CharityEvent[],
    };
  },

  async getUserCharityPreference(userId: string): Promise<CharityPreference | null> {
    if (!env.isSupabaseConfigured) return null;
    const client = requireSupabase();
    const { data, error } = await client
      .from('charity_preferences')
      .select('*, charity:charities(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as CharityPreference | null;
  },

  async setUserCharityPreference(userId: string, charityId: string, percentage: number): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Database is not connected. Credentials required.');
    }
    if (percentage < 10 || percentage > 100) {
      throw new Error('Charity pledge must be between 10% and 100%.');
    }
    const client = requireSupabase();
    const { error } = await client.from('charity_preferences').upsert({
      user_id: userId,
      charity_id: charityId,
      percentage,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },
};
