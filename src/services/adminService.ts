import { requireSupabase, env } from '../lib/supabase';
import type { UserProfile, WinnerClaim, MonthlyDraw } from '../types';

export const adminService = {
  async getAllUsers(): Promise<UserProfile[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as UserProfile[];
  },

  async getAllWinnerClaims(): Promise<WinnerClaim[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('winner_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WinnerClaim[];
  },

  async reviewWinnerClaim(
    claimId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string,
    payoutReference?: string
  ): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const client = requireSupabase();

    const updates: Partial<WinnerClaim> = {
      updated_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      updates.status = payoutReference ? 'paid' : 'verified';
      if (payoutReference) {
        updates.payout_reference = payoutReference;
        updates.paid_at = new Date().toISOString();
      }
    } else {
      updates.status = 'rejected';
      updates.rejection_reason = rejectionReason || 'Scorecard details do not match reported round.';
    }

    const { error } = await client.from('winner_claims').update(updates).eq('id', claimId);
    if (error) throw error;
  },

  async publishDraw(drawData: Partial<MonthlyDraw>): Promise<MonthlyDraw> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const client = requireSupabase();
    const { data, error } = await client
      .from('draws')
      .insert({
        ...drawData,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as MonthlyDraw;
  },
};
