import { requireSupabase, env } from '../lib/supabase';
import type { GolfScore } from '../types';

export const scoreService = {
  /**
   * Fetches the latest 5 golf scores for a given user, ordered reverse-chronologically.
   */
  async getScores(userId: string): Promise<GolfScore[]> {
    if (!env.isSupabaseConfigured) {
      return [];
    }
    const client = requireSupabase();
    const { data, error } = await client
      .from('golf_scores')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return (data || []) as GolfScore[];
  },

  /**
   * Records a Stableford score (1–45) using the database atomic RPC.
   * Enforces 1-per-date uniqueness and rolling 5-score FIFO retention in PostgreSQL.
   */
  async submitScore(score: number, playedAt: string, courseName?: string): Promise<GolfScore[]> {
    if (!env.isSupabaseConfigured) {
      throw new Error(
        'Database is not connected. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
      );
    }

    if (score < 1 || score > 45) {
      throw new Error('Score out of bounds. Stableford format requires 1 to 45 points.');
    }

    const client = requireSupabase();

    // Canonical atomic PostgreSQL RPC record_golf_score
    const { data: rpcData, error: rpcError } = await client.rpc('record_golf_score', {
      p_score: score,
      p_played_at: playedAt,
      p_course_name: courseName || null,
    });

    if (rpcError) {
      throw new Error(`Score submission failed: ${rpcError.message}`);
    }

    if (rpcData?.active_scores) {
      return rpcData.active_scores as GolfScore[];
    }

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to retrieve updated scores.');
    }
    return this.getScores(user.id);
  },

  /**
   * Deletes a golf score by ID.
   */
  async deleteScore(scoreId: string): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Database is not connected.');
    }
    const client = requireSupabase();
    const { error } = await client.from('golf_scores').delete().eq('id', scoreId);
    if (error) throw error;
  },

  /**
   * Updates an existing round's score or course.
   */
  async updateScore(scoreId: string, score: number, courseName?: string): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Database is not connected.');
    }
    if (score < 1 || score > 45) {
      throw new Error('Score out of bounds. Stableford format requires 1 to 45 points.');
    }
    const client = requireSupabase();
    const { error } = await client
      .from('golf_scores')
      .update({ score, course_name: courseName })
      .eq('id', scoreId);
    if (error) throw error;
  },
};
