import { describe, it, expect } from 'vitest';
import type { PlatformAnalytics } from '../src/types';

export function determineCharityDeletionStrategy(params: {
  charityId: string;
  hasPledges: boolean;
  hasDonations: boolean;
}): { action: 'archive' | 'delete'; reason: string } {
  if (params.hasPledges || params.hasDonations) {
    return {
      action: 'archive',
      reason: 'Charity has historical subscriber pledges or donation ledger records and must be archived to preserve financial audit integrity.',
    };
  }
  return {
    action: 'delete',
    reason: 'Charity has no linked financial or pledge records and can be permanently removed.',
  };
}

export function validateCharityInput(input: {
  name: string;
  slug: string;
  description: string;
  category: string;
  existingSlugs?: string[];
}): { valid: boolean; error?: string; cleanSlug?: string } {
  if (!input.name || input.name.trim().length < 2) {
    return { valid: false, error: 'Charity name must be at least 2 characters.' };
  }
  if (!input.description || input.description.trim().length < 10) {
    return { valid: false, error: 'Charity description must be at least 10 characters.' };
  }

  const validCategories = ['environment', 'youth_sports', 'health', 'community'];
  if (!validCategories.includes(input.category)) {
    return { valid: false, error: 'Invalid charity category.' };
  }

  const cleanSlug = input.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
  if (cleanSlug.length < 2) {
    return { valid: false, error: 'Slug must be at least 2 characters.' };
  }

  if (input.existingSlugs && input.existingSlugs.includes(cleanSlug)) {
    return { valid: false, error: `A charity with slug "${cleanSlug}" already exists.` };
  }

  return { valid: true, cleanSlug };
}

export function canUpdateUserRole(params: {
  targetUserId: string;
  currentAdminId: string;
  newRole: 'subscriber' | 'admin';
}): { allowed: boolean; error?: string } {
  if (params.targetUserId === params.currentAdminId && params.newRole === 'subscriber') {
    return {
      allowed: false,
      error: 'Action Prohibited: You cannot remove your own administrator privileges.',
    };
  }
  return { allowed: true };
}

export function aggregatePlatformMetrics(data: {
  profilesCount: number;
  subscriptions: { status: string }[];
  draws: { total_prize_pool_cents: number; jackpot_rolled_over: boolean }[];
  charitiesCount: number;
  donations: { amount_cents: number }[];
  claims: { status: string; match_tier: string }[];
}): PlatformAnalytics {
  const activeSubs = data.subscriptions.filter((s) => s.status === 'active').length;

  const subBreakdown: Record<string, number> = {};
  for (const s of data.subscriptions) {
    subBreakdown[s.status] = (subBreakdown[s.status] || 0) + 1;
  }

  let totalPrizePoolCents = 0;
  let totalRollovers = 0;
  for (const d of data.draws) {
    totalPrizePoolCents += d.total_prize_pool_cents;
    if (d.jackpot_rolled_over) totalRollovers++;
  }

  let totalDonationsCents = 0;
  for (const don of data.donations) {
    totalDonationsCents += don.amount_cents;
  }

  const claimsStatus: Record<string, number> = {};
  const claimsTier: Record<string, number> = {};
  for (const c of data.claims) {
    claimsStatus[c.status] = (claimsStatus[c.status] || 0) + 1;
    claimsTier[c.match_tier] = (claimsTier[c.match_tier] || 0) + 1;
  }

  return {
    total_users: data.profilesCount,
    total_subscribers: activeSubs,
    subscription_breakdown: subBreakdown,
    total_draws: data.draws.length,
    total_prize_pool_cents: totalPrizePoolCents,
    total_rollovers: totalRollovers,
    total_charities: data.charitiesCount,
    total_donations_recorded_cents: totalDonationsCents,
    claims_by_status: claimsStatus,
    claims_by_tier: claimsTier,
    timestamp: new Date().toISOString(),
  };
}

describe('PRD § 11.3 Charity Management & Safe Archival Engine', () => {
  it('archives charity instead of deleting when donation records exist', () => {
    const result = determineCharityDeletionStrategy({
      charityId: 'charity-1',
      hasPledges: false,
      hasDonations: true,
    });
    expect(result.action).toBe('archive');
    expect(result.reason).toContain('preserve financial audit integrity');
  });

  it('archives charity instead of deleting when active subscriber pledges exist', () => {
    const result = determineCharityDeletionStrategy({
      charityId: 'charity-2',
      hasPledges: true,
      hasDonations: false,
    });
    expect(result.action).toBe('archive');
  });

  it('permanently deletes charity when zero pledges and zero donations exist', () => {
    const result = determineCharityDeletionStrategy({
      charityId: 'charity-3',
      hasPledges: false,
      hasDonations: false,
    });
    expect(result.action).toBe('delete');
  });

  it('validates charity input and enforces required fields and clean slugs', () => {
    const invalidName = validateCharityInput({
      name: ' ',
      slug: 'valid-slug',
      description: 'A valid description of length 15',
      category: 'environment',
    });
    expect(invalidName.valid).toBe(false);

    const duplicateSlug = validateCharityInput({
      name: 'Green Ocean Foundation',
      slug: 'green-ocean',
      description: 'Protecting coastal habitats and marine life.',
      category: 'environment',
      existingSlugs: ['green-ocean', 'woodland-trust'],
    });
    expect(duplicateSlug.valid).toBe(false);
    expect(duplicateSlug.error).toContain('already exists');

    const validCharity = validateCharityInput({
      name: 'Green Ocean Foundation',
      slug: 'Green Ocean 2026!',
      description: 'Protecting coastal habitats and marine life worldwide.',
      category: 'environment',
      existingSlugs: ['woodland-trust'],
    });
    expect(validCharity.valid).toBe(true);
    expect(validCharity.cleanSlug).toBe('green-ocean-2026-');
  });
});

describe('PRD § 11.1 Admin User Management & Self-Demotion Guards', () => {
  it('prevents an administrator from demoting their own account', () => {
    const selfDemote = canUpdateUserRole({
      targetUserId: 'admin-123',
      currentAdminId: 'admin-123',
      newRole: 'subscriber',
    });
    expect(selfDemote.allowed).toBe(false);
    expect(selfDemote.error).toContain('cannot remove your own administrator privileges');
  });

  it('allows an administrator to update other user roles', () => {
    const updateOther = canUpdateUserRole({
      targetUserId: 'user-456',
      currentAdminId: 'admin-123',
      newRole: 'admin',
    });
    expect(updateOther.allowed).toBe(true);

    const demoteOther = canUpdateUserRole({
      targetUserId: 'user-456',
      currentAdminId: 'admin-123',
      newRole: 'subscriber',
    });
    expect(demoteOther.allowed).toBe(true);
  });
});

describe('PRD § 11.5 Reports & Platform Analytics Aggregation', () => {
  it('correctly calculates platform metrics from real data sets', () => {
    const mockData = {
      profilesCount: 250,
      subscriptions: [
        { status: 'active' },
        { status: 'active' },
        { status: 'active' },
        { status: 'past_due' },
        { status: 'canceled' },
      ],
      draws: [
        { total_prize_pool_cents: 2845000, jackpot_rolled_over: false },
        { total_prize_pool_cents: 1950000, jackpot_rolled_over: true },
      ],
      charitiesCount: 8,
      donations: [
        { amount_cents: 50000 },
        { amount_cents: 25000 },
        { amount_cents: 15000 },
      ],
      claims: [
        { status: 'verified', match_tier: 'tier_5' },
        { status: 'under_review', match_tier: 'tier_4' },
        { status: 'pending_proof', match_tier: 'tier_3' },
      ],
    };

    const metrics = aggregatePlatformMetrics(mockData);

    expect(metrics.total_users).toBe(250);
    expect(metrics.total_subscribers).toBe(3);
    expect(metrics.subscription_breakdown.active).toBe(3);
    expect(metrics.subscription_breakdown.past_due).toBe(1);
    expect(metrics.subscription_breakdown.canceled).toBe(1);

    expect(metrics.total_draws).toBe(2);
    expect(metrics.total_prize_pool_cents).toBe(4795000);
    expect(metrics.total_rollovers).toBe(1);

    expect(metrics.total_charities).toBe(8);
    expect(metrics.total_donations_recorded_cents).toBe(90000);

    expect(metrics.claims_by_status.verified).toBe(1);
    expect(metrics.claims_by_status.under_review).toBe(1);
    expect(metrics.claims_by_tier.tier_5).toBe(1);
  });

  it('handles empty database sets without zero-division or null errors', () => {
    const emptyMetrics = aggregatePlatformMetrics({
      profilesCount: 0,
      subscriptions: [],
      draws: [],
      charitiesCount: 0,
      donations: [],
      claims: [],
    });

    expect(emptyMetrics.total_users).toBe(0);
    expect(emptyMetrics.total_subscribers).toBe(0);
    expect(emptyMetrics.total_draws).toBe(0);
    expect(emptyMetrics.total_prize_pool_cents).toBe(0);
    expect(emptyMetrics.total_rollovers).toBe(0);
    expect(emptyMetrics.total_donations_recorded_cents).toBe(0);
  });
});
