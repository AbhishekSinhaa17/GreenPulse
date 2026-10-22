import { requireSupabase, env } from '../lib/supabase';
import type { UserProfile, WinnerClaim, MonthlyDraw, Charity, GolfScore, PlatformAnalytics, UserRole } from '../types';
import type { EligibleSubscriberEntry, DrawSimulationResult, DrawLogicMode } from './drawEngine';

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

  async updateUserProfile(
    userId: string,
    updates: {
      full_name?: string;
      handicap?: number | null;
      home_club?: string | null;
      role?: UserRole;
    },
    currentAdminId?: string
  ): Promise<UserProfile> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    // 1. Guard against self-demotion
    if (currentAdminId && userId === currentAdminId && updates.role === 'subscriber') {
      throw new Error('Action Prohibited: You cannot remove your own administrator privileges.');
    }

    // 2. Validate handicap
    if (updates.handicap !== undefined && updates.handicap !== null) {
      if (updates.handicap < -10.0 || updates.handicap > 54.0) {
        throw new Error('Invalid handicap: WHS index must be between -10.0 and 54.0.');
      }
    }

    const client = requireSupabase();

    // Canonical server-side authorization and update procedure
    const { data: rpcData, error: rpcErr } = await client.rpc('admin_update_profile', {
      p_user_id: userId,
      p_full_name: updates.full_name || null,
      p_handicap: updates.handicap ?? null,
      p_home_club: updates.home_club ?? null,
      p_role: updates.role || null,
    });

    if (rpcErr) {
      throw new Error(`Profile update failed: ${rpcErr.message}`);
    }

    if (!rpcData?.success) {
      throw new Error('Profile update failed on server.');
    }

    const { data: pData, error: pErr } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (pErr || !pData) {
      throw new Error(`Profile was updated but failed to retrieve: ${pErr?.message || 'Not found'}`);
    }

    return pData as UserProfile;
  },

  async getUserScores(userId: string): Promise<GolfScore[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('golf_scores')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false });

    if (error) throw error;
    return (data || []) as GolfScore[];
  },

  async adminUpdateScore(
    scoreId: string,
    score: number,
    playedAt: string,
    courseName?: string
  ): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    if (score < 1 || score > 45) {
      throw new Error('Stableford score must be between 1 and 45 points.');
    }
    const client = requireSupabase();
    const { error } = await client
      .from('golf_scores')
      .update({
        score,
        played_at: playedAt,
        course_name: courseName || null,
      })
      .eq('id', scoreId);

    if (error) throw error;
  },

  async adminDeleteScore(scoreId: string): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const client = requireSupabase();
    const { error } = await client.from('golf_scores').delete().eq('id', scoreId);
    if (error) throw error;
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
    decision: 'under_review' | 'verified' | 'rejected',
    rejectionReason?: string,
    adminNotes?: string,
    _reviewerId?: string
  ): Promise<void> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    if (decision === 'rejected') {
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        throw new Error('A detailed rejection reason (minimum 5 characters) is required when rejecting proof.');
      }
    }

    const client = requireSupabase();

    // Canonical server-side review procedure (audited, atomic)
    const { data: rpcData, error: rpcErr } = await client.rpc('admin_review_winner_claim', {
      p_claim_id: claimId,
      p_decision: decision,
      p_rejection_reason: decision === 'rejected' ? rejectionReason : null,
      p_admin_notes: adminNotes || null,
    });

    if (rpcErr) {
      throw new Error(`Review claim failed: ${rpcErr.message}`);
    }

    if (!rpcData?.success) {
      throw new Error('Review claim operation failed on server.');
    }
  },

  /**
   * Retrieves active subscribers with their latest 5 golf scores to feed the Draw Engine simulation.
   */
  async getEligibleSubscribers(): Promise<EligibleSubscriberEntry[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();

    // 1. Fetch profiles
    const { data: profiles, error: pErr } = await client
      .from('profiles')
      .select('id, full_name');
    if (pErr) throw pErr;
    if (!profiles || profiles.length === 0) return [];

    // 2. Fetch golf scores
    const { data: scores, error: sErr } = await client
      .from('golf_scores')
      .select('user_id, score, played_at, created_at')
      .order('played_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (sErr) throw sErr;

    // Group up to 5 latest scores per user
    const scoresByUser = new Map<string, number[]>();
    for (const row of scores || []) {
      const userList = scoresByUser.get(row.user_id) || [];
      if (userList.length < 5) {
        userList.push(row.score);
        scoresByUser.set(row.user_id, userList);
      }
    }

    // Filter subscribers who have active scores
    const eligible: EligibleSubscriberEntry[] = [];
    for (const p of profiles) {
      const userScores = scoresByUser.get(p.id) || [];
      if (userScores.length > 0) {
        eligible.push({
          userId: p.id,
          fullName: p.full_name,
          scores: userScores,
        });
      }
    }

    return eligible;
  },

  /**
   * Retrieves latest draw to calculate carried-over jackpot rollover.
   */
  async getLatestRollover(): Promise<{ lastDraw: MonthlyDraw | null; carriedOverJackpotCents: number }> {
    if (!env.isSupabaseConfigured) {
      return { lastDraw: null, carriedOverJackpotCents: 0 };
    }
    const client = requireSupabase();
    const { data, error } = await client
      .from('draws')
      .select('*')
      .eq('status', 'published')
      .order('draw_month', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { lastDraw: null, carriedOverJackpotCents: 0 };
    }

    const lastDraw = data[0] as MonthlyDraw;
    const carriedOverJackpotCents = lastDraw.jackpot_rolled_over ? Number(lastDraw.tier_5_pot_cents) : 0;
    return { lastDraw, carriedOverJackpotCents };
  },

  /**
   * Publishes official draw results transactionally and idempotently.
   */
  async publishOfficialDraw(params: {
    drawMonth: string; // YYYY-MM-01
    drawTitle: string;
    drawLogic: DrawLogicMode;
    winningNumbers: [number, number, number, number, number];
    totalPrizePoolCents: number;
    carriedOverJackpotCents: number;
    simulationResult?: DrawSimulationResult;
    adminUserId?: string;
  }): Promise<MonthlyDraw> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const client = requireSupabase();

    // Check if draw already published for this month
    const { data: existing, error: existErr } = await client
      .from('draws')
      .select('id, status')
      .eq('draw_month', params.drawMonth)
      .eq('status', 'published')
      .maybeSingle();

    if (existErr) throw existErr;
    if (existing) {
      throw new Error(`Draw for month ${params.drawMonth} is already published and cannot be modified.`);
    }

    // Canonical server-side atomic draw publishing procedure
    const { data: rpcData, error: rpcErr } = await client.rpc('publish_monthly_draw', {
      p_draw_month: params.drawMonth,
      p_draw_title: params.drawTitle,
      p_draw_logic: params.drawLogic,
      p_winning_numbers: params.winningNumbers,
      p_total_prize_pool_cents: params.totalPrizePoolCents,
      p_carried_over_jackpot_cents: params.carriedOverJackpotCents,
    });

    if (rpcErr) {
      throw new Error(`Official draw publication failed: ${rpcErr.message}`);
    }

    if (!rpcData?.draw_id) {
      throw new Error('Official draw publication did not return a valid draw ID.');
    }

    const { data: publishedRecord, error: fetchErr } = await client
      .from('draws')
      .select('*')
      .eq('id', rpcData.draw_id)
      .single();

    if (fetchErr || !publishedRecord) {
      throw new Error(`Draw was published (ID: ${rpcData.draw_id}) but could not be retrieved: ${fetchErr?.message || 'Record not found'}`);
    }

    return publishedRecord as MonthlyDraw;
  },

  // ==========================================
  // Surface 03: Charity CRUD & Archival
  // ==========================================

  async getAllCharitiesAdmin(): Promise<Charity[]> {
    if (!env.isSupabaseConfigured) return [];
    const client = requireSupabase();
    const { data, error } = await client
      .from('charities')
      .select('*')
      .order('is_archived', { ascending: true })
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Charity[];
  },

  async createCharity(charity: {
    name: string;
    slug: string;
    tagline?: string;
    description: string;
    category: 'environment' | 'youth_sports' | 'health' | 'community';
    logo_url?: string;
    cover_image_url?: string;
    website_url?: string;
    is_featured?: boolean;
  }): Promise<Charity> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    if (!charity.name.trim() || !charity.slug.trim() || !charity.description.trim()) {
      throw new Error('Charity name, slug, and description are required.');
    }

    const cleanSlug = charity.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    const client = requireSupabase();

    // Check slug uniqueness
    const { data: existing } = await client
      .from('charities')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (existing) {
      throw new Error(`A charity with slug "${cleanSlug}" already exists.`);
    }

    const { data, error } = await client
      .from('charities')
      .insert({
        name: charity.name.trim(),
        slug: cleanSlug,
        tagline: charity.tagline?.trim() || null,
        description: charity.description.trim(),
        category: charity.category,
        logo_url: charity.logo_url?.trim() || null,
        cover_image_url: charity.cover_image_url?.trim() || null,
        website_url: charity.website_url?.trim() || null,
        is_featured: !!charity.is_featured,
        is_archived: false,
        total_raised_cents: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Charity;
  },

  async updateCharity(id: string, updates: Partial<Charity>): Promise<Charity> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const client = requireSupabase();

    if (updates.slug) {
      const cleanSlug = updates.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
      updates.slug = cleanSlug;
    }

    const { data, error } = await client
      .from('charities')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Charity;
  },

  async deleteOrArchiveCharity(id: string): Promise<{ action: 'archived' | 'deleted'; message: string }> {
    if (!env.isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }
    const client = requireSupabase();

    // Canonical safe delete or archive procedure
    const { data: rpcData, error: rpcErr } = await client.rpc('safe_delete_charity', {
      p_charity_id: id,
    });

    if (rpcErr) {
      throw new Error(`Charity management action failed: ${rpcErr.message}`);
    }

    if (!rpcData?.action) {
      throw new Error('Safe delete charity operation returned an unexpected result.');
    }

    return { action: rpcData.action, message: rpcData.message };
  },

  // ==========================================
  // Surface 05: Reports & Analytics
  // ==========================================

  async getPlatformAnalytics(): Promise<PlatformAnalytics | null> {
    if (!env.isSupabaseConfigured) {
      return null;
    }

    const client = requireSupabase();

    // Canonical platform aggregation RPC
    const { data: rpcData, error: rpcErr } = await client.rpc('get_platform_analytics');
    if (!rpcErr && rpcData) {
      return rpcData as PlatformAnalytics;
    }

    if (rpcErr) {
      console.warn('[adminService.getPlatformAnalytics] Canonical RPC error, falling back to read-only query:', rpcErr.message);
    }

    const [
      usersRes,
      subsRes,
      drawsRes,
      charitiesRes,
      donationsRes,
      claimsRes,
    ] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact' }),
      client.from('subscriptions').select('status'),
      client.from('draws').select('total_prize_pool_cents, jackpot_rolled_over').eq('status', 'published'),
      client.from('charities').select('id', { count: 'exact' }),
      client.from('donation_ledger').select('amount_cents'),
      client.from('winner_claims').select('status, match_tier'),
    ]);

    const totalUsers = usersRes.count || 0;
    const subsList = subsRes.data || [];
    const activeSubscribers = subsList.filter((s) => s.status === 'active').length;

    const subBreakdown: Record<string, number> = {};
    for (const s of subsList) {
      subBreakdown[s.status] = (subBreakdown[s.status] || 0) + 1;
    }

    const drawsList = drawsRes.data || [];
    const totalDraws = drawsList.length;
    let totalPrizePoolCents = 0;
    let totalRollovers = 0;
    for (const d of drawsList) {
      totalPrizePoolCents += Number(d.total_prize_pool_cents || 0);
      if (d.jackpot_rolled_over) totalRollovers++;
    }

    const totalCharities = charitiesRes.count || 0;

    let totalDonationsRecordedCents = 0;
    for (const don of donationsRes.data || []) {
      totalDonationsRecordedCents += Number(don.amount_cents || 0);
    }

    const claimsByStatus: Record<string, number> = {};
    const claimsByTier: Record<string, number> = {};
    for (const c of claimsRes.data || []) {
      claimsByStatus[c.status] = (claimsByStatus[c.status] || 0) + 1;
      claimsByTier[c.match_tier] = (claimsByTier[c.match_tier] || 0) + 1;
    }

    return {
      total_users: totalUsers,
      total_subscribers: activeSubscribers,
      subscription_breakdown: subBreakdown,
      total_draws: totalDraws,
      total_prize_pool_cents: totalPrizePoolCents,
      total_rollovers: totalRollovers,
      total_charities: totalCharities,
      total_donations_recorded_cents: totalDonationsRecordedCents,
      claims_by_status: claimsByStatus,
      claims_by_tier: claimsByTier,
      timestamp: new Date().toISOString(),
    };
  },
};
