import { requireSupabase, env } from '../lib/supabase';
import type { MonthlyDraw, DrawEntry, WinnerClaim } from '../types';

export const drawService = {
  async getPublishedDraws(): Promise<MonthlyDraw[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('draws')
      .select('*')
      .eq('status', 'published')
      .order('draw_month', { ascending: false });

    if (error) throw error;
    return (data || []) as MonthlyDraw[];
  },

  async getUserDrawEntries(userId: string): Promise<DrawEntry[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('draw_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DrawEntry[];
  },

  async getUserWinnerClaims(userId: string): Promise<WinnerClaim[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('winner_claims')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WinnerClaim[];
  },

  /**
   * Uploads scorecard screenshot to private Supabase Storage bucket 'winner-proofs'
   * and updates the winner claim record to 'under_review'.
   */
  async submitWinnerProof(claimId: string, userId: string, file: File, golferNotes?: string): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Real storage upload unavailable.');
    }
    const client = requireSupabase();

    // 1. Upload to winner-proofs/{userId}/{claimId}-{filename}
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${claimId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await client.storage
      .from('winner-proofs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 2. Update claim state to under_review (PRD § 09)
    const { error: updateError } = await client
      .from('winner_claims')
      .update({
        proof_image_path: filePath,
        golfer_notes: golferNotes,
        status: 'under_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', claimId)
      .eq('user_id', userId);

    if (updateError) throw updateError;
  },
};
