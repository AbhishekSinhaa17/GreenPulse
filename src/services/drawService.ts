import { requireSupabase, env } from '../lib/supabase';
import type { MonthlyDraw, DrawEntry, WinnerClaim } from '../types';
import {
  validateProofFile,
  generateSecureProofPath,
} from './verificationService';

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

  async getLatestPublishedDraw(): Promise<MonthlyDraw | null> {
    if (!env.isSupabaseConfigured) return null;
    const client = requireSupabase();
    const { data, error } = await client
      .from('draws')
      .select('*')
      .eq('status', 'published')
      .order('draw_month', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0] as MonthlyDraw;
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

  async submitWinnerProof(
    claimId: string,
    userId: string,
    file: File,
    golferNotes?: string
  ): Promise<{ proofPath: string }> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Real storage upload unavailable.');
    }

    const validation = validateProofFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid proof file.');
    }

    const client = requireSupabase();

    const filePath = generateSecureProofPath(userId, claimId, file.name);

    const { error: uploadError } = await client.storage
      .from('winner-proofs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    const { data: rpcData, error: rpcErr } = await client.rpc('submit_winner_proof', {
      p_claim_id: claimId,
      p_proof_path: filePath,
      p_golfer_notes: golferNotes || null,
    });

    if (rpcErr) {
      throw new Error(`Winner proof submission failed: ${rpcErr.message}`);
    }

    if (!rpcData?.success) {
      throw new Error('Winner proof submission failed on server.');
    }

    return { proofPath: filePath };
  },

  async getProofSignedUrl(filePath: string, expiresInSeconds = 300): Promise<string | null> {
    if (!env.isSupabaseConfigured || !filePath) return null;
    try {
      const safeExpiry = Math.min(Math.max(1, expiresInSeconds), 300);
      const client = requireSupabase();
      const { data, error } = await client.storage
        .from('winner-proofs')
        .createSignedUrl(filePath, safeExpiry);

      if (error || !data?.signedUrl) {
        return null;
      }
      return data.signedUrl;
    } catch {
      return null;
    }
  },
};
