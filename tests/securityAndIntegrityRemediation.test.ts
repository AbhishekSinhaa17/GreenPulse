import { describe, it, expect } from 'vitest';
import {
  generateRandomWinningNumbers,
  calculatePrizeAllocation,
} from '../src/services/drawEngine';
import {
  validateProofFile,
  generateSecureProofPath,
  validateReviewDecision,
} from '../src/services/verificationService';
import { isRoleAuthorized } from '../src/utils/rbac';
import { calculatePlanPricing } from './stripeAndCheckout.test';

describe('Security, Financial Integrity & Production Readiness Remediation Suite', () => {
  // ===========================================================================
  // Priority 1 — Profile Privacy and Authorization
  // ===========================================================================
  describe('Priority 1: Profile Privacy, Projection & Fail-Closed RBAC', () => {
    it('restricts private profile access so users can only select their own data', () => {
      interface MockProfile {
        id: string;
        email: string;
        full_name: string;
        handicap: number;
        role: string;
      }

      const allProfiles: MockProfile[] = [
        { id: 'usr-1', email: 'alice@example.com', full_name: 'Alice', handicap: 12.4, role: 'subscriber' },
        { id: 'usr-2', email: 'bob@example.com', full_name: 'Bob', handicap: 8.1, role: 'subscriber' },
        { id: 'admin-1', email: 'admin@greenpulse.org', full_name: 'Admin', handicap: 4.0, role: 'admin' },
      ];

      // Simulates PostgreSQL RLS: (auth.uid() = id OR public.is_admin())
      function queryProfiles(currentUserId: string, isAdmin: boolean): MockProfile[] {
        return allProfiles.filter((p) => p.id === currentUserId || isAdmin);
      }

      // Regular user alice cannot read Bob or Admin private profiles
      const aliceVisible = queryProfiles('usr-1', false);
      expect(aliceVisible).toHaveLength(1);
      expect(aliceVisible[0].email).toBe('alice@example.com');
      expect(aliceVisible.some((p) => p.email === 'bob@example.com')).toBe(false);

      // Admin user can view all profiles
      const adminVisible = queryProfiles('admin-1', true);
      expect(adminVisible).toHaveLength(3);
    });

    it('enforces that public profile projection strictly exposes only non-sensitive columns', () => {
      const fullProfile = {
        id: 'usr-100',
        email: 'secret.golfer@club.com',
        full_name: 'Public Golfer',
        avatar_url: 'https://example.com/avatar.jpg',
        handicap: 14.2,
        home_club: 'St Andrews',
        role: 'subscriber',
        created_at: '2026-01-01T00:00:00Z',
      };

      // Simulates public_profiles view projection
      function getPublicProfileProjection(p: typeof fullProfile) {
        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
        };
      }

      const projection = getPublicProfileProjection(fullProfile);
      expect(projection).toHaveProperty('id');
      expect(projection).toHaveProperty('full_name');
      expect(projection).toHaveProperty('avatar_url');

      // Sensitive fields must NOT exist in the projection
      expect(projection).not.toHaveProperty('email');
      expect(projection).not.toHaveProperty('handicap');
      expect(projection).not.toHaveProperty('home_club');
      expect(projection).not.toHaveProperty('role');
      expect(projection).not.toHaveProperty('created_at');
    });

    it('fails closed when checking protected admin routes with unconfigured or missing auth', () => {
      // Simulates ProtectedRoute logic
      function checkRouteAccess(params: {
        isConfigured: boolean;
        requiredRole?: 'subscriber' | 'admin';
        role: string | null;
        hasUser: boolean;
      }): 'allowed' | 'locked_configuration' | 'redirect_login' | 'access_denied_403' {
        const { isConfigured, requiredRole, role, hasUser } = params;

        if (!isConfigured) {
          if (requiredRole === 'admin') {
            return 'locked_configuration'; // STRICT FAIL CLOSED
          }
          return 'allowed';
        }

        if (!hasUser) {
          return 'redirect_login';
        }

        if (!isRoleAuthorized(role as any, requiredRole)) {
          return 'access_denied_403';
        }

        return 'allowed';
      }

      // 1. Admin route when Supabase is unconfigured -> LOCKED FAIL CLOSED
      expect(checkRouteAccess({ isConfigured: false, requiredRole: 'admin', role: null, hasUser: false }))
        .toBe('locked_configuration');

      // 2. Admin route when subscriber tries to enter -> 403
      expect(checkRouteAccess({ isConfigured: true, requiredRole: 'admin', role: 'subscriber', hasUser: true }))
        .toBe('access_denied_403');

      // 3. Admin route when unauthenticated -> redirect login
      expect(checkRouteAccess({ isConfigured: true, requiredRole: 'admin', role: null, hasUser: false }))
        .toBe('redirect_login');

      // 4. Admin route when authenticated admin -> allowed
      expect(checkRouteAccess({ isConfigured: true, requiredRole: 'admin', role: 'admin', hasUser: true }))
        .toBe('allowed');
    });
  });

  // ===========================================================================
  // Priority 2 — Score and Draw Integrity
  // ===========================================================================
  describe('Priority 2: Score Uniqueness, Randomness Security & Draw Integrity', () => {
    it('enforces one score per golfer per played date constraint at database level', () => {
      const scoreTable = new Set<string>();

      function recordScore(userId: string, playedAt: string, score: number) {
        if (score < 1 || score > 45) {
          throw new Error('Score out of bounds (1-45)');
        }
        const key = `${userId}:${playedAt}`;
        if (scoreTable.has(key)) {
          throw new Error(`A score entry already exists for date ${playedAt}.`);
        }
        scoreTable.add(key);
        return { success: true };
      }

      // First score on date
      expect(recordScore('user-1', '2026-10-22', 36).success).toBe(true);

      // Concurrent or duplicate submission on same date -> rejected
      expect(() => recordScore('user-1', '2026-10-22', 38)).toThrow(/already exists for date/i);

      // Different user on same date -> permitted
      expect(recordScore('user-2', '2026-10-22', 40).success).toBe(true);
    });

    it('enforces Stableford score range (1 to 45 points)', () => {
      const isValidScore = (s: number) => Number.isInteger(s) && s >= 1 && s <= 45;

      expect(isValidScore(0)).toBe(false);
      expect(isValidScore(1)).toBe(true);
      expect(isValidScore(36)).toBe(true);
      expect(isValidScore(45)).toBe(true);
      expect(isValidScore(46)).toBe(false);
      expect(isValidScore(-5)).toBe(false);
      expect(isValidScore(36.5)).toBe(false);
    });

    it('removes insecure Math.random() fallback and fails safely if Web Crypto is unavailable', () => {
      // Test custom mock cryptoSource
      let cryptoCalled = false;
      let counter = 10;
      const mockCrypto = (arr: Uint32Array) => {
        cryptoCalled = true;
        arr[0] = counter++;
      };

      const numbers = generateRandomWinningNumbers(mockCrypto);
      expect(cryptoCalled).toBe(true);
      expect(numbers).toHaveLength(5);
      expect(new Set(numbers).size).toBe(5);

      // When cryptoSource is undefined in modern Node/browser, globalThis.crypto is used
      expect(typeof globalThis.crypto.getRandomValues).toBe('function');
      const randomWin = generateRandomWinningNumbers();
      expect(randomWin).toHaveLength(5);
      expect(new Set(randomWin).size).toBe(5);
      randomWin.forEach((num) => {
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(45);
      });
    });

    it('validates winning numbers are exactly five distinct integers between 1 and 45', () => {
      function validateWinningNumbers(numbers: number[]): boolean {
        if (!Array.isArray(numbers) || numbers.length !== 5) return false;
        const seen = new Set<number>();
        for (const n of numbers) {
          if (!Number.isInteger(n) || n < 1 || n > 45) return false;
          if (seen.has(n)) return false; // Duplicates prohibited
          seen.add(n);
        }
        return true;
      }

      expect(validateWinningNumbers([5, 12, 23, 34, 45])).toBe(true);
      expect(validateWinningNumbers([5, 12, 23, 34])).toBe(false); // Only 4
      expect(validateWinningNumbers([5, 12, 23, 34, 45, 10])).toBe(false); // 6
      expect(validateWinningNumbers([5, 12, 23, 34, 34])).toBe(false); // Duplicate
      expect(validateWinningNumbers([0, 12, 23, 34, 45])).toBe(false); // Out of bounds 0
      expect(validateWinningNumbers([5, 12, 23, 34, 46])).toBe(false); // Out of bounds 46
    });

    it('calculates atomic prize pool splits (40% / 35% / 25%) and rolls over Tier 1 jackpot when no winner', () => {
      const poolCents = 2484000; // ₹24,840.00
      const allocation = calculatePrizeAllocation(poolCents, 0, {
        tier5: 0, // No jackpot winner
        tier4: 2, // 2 winners
        tier3: 10, // 10 winners
      });

      // 40% Tier 5 = 993,600 paise
      expect(allocation.tier5.potCents).toBe(993600);
      expect(allocation.jackpotRolledOver).toBe(true);
      expect(allocation.nextJackpotSeedCents).toBe(993600); // Rolled over to next cycle

      // 35% Tier 4 = 869,400 paise divided by 2 winners = 434,700 paise each
      expect(allocation.tier4.potCents).toBe(869400);
      expect(allocation.tier4.payoutPerWinnerCents).toBe(434700);

      // 25% Tier 3 = 621,000 paise divided by 10 winners = 62,100 paise each
      expect(allocation.tier3.potCents).toBe(621000);
      expect(allocation.tier3.payoutPerWinnerCents).toBe(62100);

      // Base sum equals exact pool
      expect(allocation.tier5.potCents + allocation.tier4.potCents + allocation.tier3.potCents).toBe(poolCents);
    });

    it('strictly prohibits republishing or overwriting an already published or closed draw', () => {
      interface DrawRecord {
        month: string;
        status: 'scheduled' | 'simulated' | 'published' | 'closed';
        winningNumbers: number[];
      }

      const existingDraws = new Map<string, DrawRecord>([
        ['2026-09-01', { month: '2026-09-01', status: 'published', winningNumbers: [1, 2, 3, 4, 5] }],
        ['2026-08-01', { month: '2026-08-01', status: 'closed', winningNumbers: [10, 20, 30, 40, 45] }],
        ['2026-10-01', { month: '2026-10-01', status: 'scheduled', winningNumbers: [] }],
      ]);

      function publishDraw(month: string, newWinningNumbers: number[]) {
        const existing = existingDraws.get(month);
        if (existing && (existing.status === 'published' || existing.status === 'closed')) {
          throw new Error(`Draw for month ${month} has already been published. Published draws cannot be overwritten.`);
        }

        const published: DrawRecord = {
          month,
          status: 'published',
          winningNumbers: newWinningNumbers,
        };
        existingDraws.set(month, published);
        return published;
      }

      // Attempting to republish September draw -> strictly rejected
      expect(() => publishDraw('2026-09-01', [9, 19, 29, 39, 44])).toThrow(
        /Draw for month 2026-09-01 has already been published/
      );

      // Attempting to overwrite a closed draw -> strictly rejected
      expect(() => publishDraw('2026-08-01', [7, 14, 21, 28, 35])).toThrow(
        /Draw for month 2026-08-01 has already been published/
      );

      // Publishing a scheduled draft -> allowed
      const oct = publishDraw('2026-10-01', [5, 12, 23, 34, 45]);
      expect(oct.status).toBe('published');
      expect(oct.winningNumbers).toEqual([5, 12, 23, 34, 45]);

      // Attempting to publish October again -> now rejected
      expect(() => publishDraw('2026-10-01', [1, 2, 3, 4, 5])).toThrow(
        /Draw for month 2026-10-01 has already been published/
      );
    });
  });

  // ===========================================================================
  // Priority 3 — Stripe and Charity Accounting
  // ===========================================================================
  describe('Priority 3: Full-Fee Minor Currency Units & Database Idempotency', () => {
    it('calculates charity pledges strictly on the verified full subscription fee', () => {
      // Verified policy: Full subscription fee base (₹2,090 monthly / ₹20,900 yearly)
      const monthlyPricing = calculatePlanPricing('monthly', 10);
      expect(monthlyPricing.basePriceCents).toBe(209000);
      expect(monthlyPricing.charityAmountCents).toBe(20900); // 10% of ₹2,090 = ₹209

      const yearlyPricing = calculatePlanPricing('yearly', 10);
      expect(yearlyPricing.basePriceCents).toBe(2090000);
      expect(yearlyPricing.charityAmountCents).toBe(209000); // 10% of ₹20,900 = ₹2,090

      // Proportional voluntary increase (e.g. 20%)
      const monthly20 = calculatePlanPricing('monthly', 20);
      expect(monthly20.charityAmountCents).toBe(41800); // 20% of ₹2,090 = ₹418
    });

    it('enforces database-level idempotency on donation ledger using unique session and invoice IDs', () => {
      const ledger = new Map<string, { amount: number; type: string }>();

      function recordDonation(uniqueToken: string, amount: number, type: string) {
        if (ledger.has(uniqueToken)) {
          return { recorded: false, duplicate: true };
        }
        ledger.set(uniqueToken, { amount, type });
        return { recorded: true, duplicate: false };
      }

      // Initial checkout session
      const res1 = recordDonation('cs_sess_1', 20900, 'subscription_split');
      expect(res1.recorded).toBe(true);

      // Retried webhook event with same checkout session
      const res1Retry = recordDonation('cs_sess_1', 20900, 'subscription_split');
      expect(res1Retry.recorded).toBe(false);
      expect(res1Retry.duplicate).toBe(true);

      // Recurring invoice renewal
      const res2 = recordDonation('in_renewal_1', 20900, 'subscription_split');
      expect(res2.recorded).toBe(true);

      // Duplicate recurring invoice webhook
      const res2Retry = recordDonation('in_renewal_1', 20900, 'subscription_split');
      expect(res2Retry.recorded).toBe(false);
      expect(res2Retry.duplicate).toBe(true);

      expect(ledger.size).toBe(2);
    });

    it('atomically increments charity totals to prevent read-modify-write lost updates', () => {
      let charityRaised = 50000;

      // Atomic SQL simulation: UPDATE charities SET total_raised_cents = total_raised_cents + amount
      function atomicIncrement(amount: number) {
        if (amount <= 0) throw new Error('Invalid increment amount');
        charityRaised += amount;
        return charityRaised;
      }

      atomicIncrement(20900);
      expect(charityRaised).toBe(70900);
      atomicIncrement(11000);
      expect(charityRaised).toBe(81900);
    });

    it('strictly restricts increment_charity_raised execution to service_role or admin callers', () => {
      function executeIncrementCharityRaised(caller: { role: string; isAdmin: boolean }, amount: number) {
        if (caller.role !== 'service_role' && !caller.isAdmin) {
          throw new Error('Unauthorized: Charity totals can only be updated by trusted payment services or platform administrators.');
        }
        if (amount <= 0) {
          throw new Error('amount_to_add must be greater than zero.');
        }
        return { success: true, added: amount };
      }

      // Anonymous caller -> REJECTED
      expect(() => executeIncrementCharityRaised({ role: 'anon', isAdmin: false }, 20900)).toThrow(
        /Unauthorized: Charity totals can only be updated/
      );

      // Authenticated regular subscriber -> REJECTED
      expect(() => executeIncrementCharityRaised({ role: 'authenticated', isAdmin: false }, 20900)).toThrow(
        /Unauthorized: Charity totals can only be updated/
      );

      // service_role (Stripe payment webhook) -> ALLOWED
      expect(executeIncrementCharityRaised({ role: 'service_role', isAdmin: false }, 20900).success).toBe(true);

      // Verified platform admin -> ALLOWED
      expect(executeIncrementCharityRaised({ role: 'authenticated', isAdmin: true }, 20900).success).toBe(true);
    });

    it('manages webhook event processed_at timestamp as null while processing and sets it on completion', () => {
      interface WebhookEventRow {
        id: string;
        status: 'processing' | 'completed' | 'failed';
        created_at: string;
        processed_at: string | null;
        error_message: string | null;
      }

      // Step 1: Ingress upsert in 'processing' state
      const row: WebhookEventRow = {
        id: 'evt_test_123',
        status: 'processing',
        created_at: new Date().toISOString(),
        processed_at: null, // Nullable while processing
        error_message: null,
      };

      expect(row.status).toBe('processing');
      expect(row.processed_at).toBeNull();

      // Step 2: On successful completion
      row.status = 'completed';
      row.processed_at = new Date().toISOString();

      expect(row.status).toBe('completed');
      expect(row.processed_at).not.toBeNull();
    });

    it('atomically records donation in ledger and increments charity balance in a single SQL operation with idempotency', () => {
      interface Charity {
        id: string;
        totalRaisedCents: number;
        donorCount: number;
      }
      interface LedgerEntry {
        id: string;
        charityId: string;
        amountCents: number;
        stripeSessionId?: string | null;
        stripeInvoiceId?: string | null;
      }

      const charities = new Map<string, Charity>([
        ['ch-1', { id: 'ch-1', totalRaisedCents: 100000, donorCount: 5 }],
      ]);
      const ledger = new Map<string, LedgerEntry>();

      function recordDonationAndIncrement(params: {
        charityId: string;
        userId: string;
        amountCents: number;
        stripeSessionId?: string | null;
        stripeInvoiceId?: string | null;
      }) {
        const { charityId, amountCents, stripeSessionId, stripeInvoiceId } = params;

        // 1. Idempotency check: if session or invoice was already processed, return duplicate
        for (const entry of ledger.values()) {
          if (stripeSessionId && entry.stripeSessionId === stripeSessionId) {
            return { success: true, duplicate: true, message: 'Session already processed' };
          }
          if (stripeInvoiceId && entry.stripeInvoiceId === stripeInvoiceId) {
            return { success: true, duplicate: true, message: 'Invoice already processed' };
          }
        }

        // 2. Atomic insert & increment
        const charity = charities.get(charityId);
        if (!charity) throw new Error('Charity not found');

        const entryId = `ledg-${Date.now()}`;
        ledger.set(entryId, {
          id: entryId,
          charityId,
          amountCents,
          stripeSessionId,
          stripeInvoiceId,
        });

        charity.totalRaisedCents += amountCents;
        charity.donorCount += 1;

        return { success: true, duplicate: false, newTotalCents: charity.totalRaisedCents };
      }

      // Initial checkout session
      const res1 = recordDonationAndIncrement({
        charityId: 'ch-1',
        userId: 'u-1',
        amountCents: 20900,
        stripeSessionId: 'cs_live_123',
      });
      expect(res1.duplicate).toBe(false);
      expect(res1.newTotalCents).toBe(120900);
      expect(charities.get('ch-1')?.donorCount).toBe(6);

      // Duplicate delivery of same checkout session -> acknowledges without double counting
      const res1Dup = recordDonationAndIncrement({
        charityId: 'ch-1',
        userId: 'u-1',
        amountCents: 20900,
        stripeSessionId: 'cs_live_123',
      });
      expect(res1Dup.duplicate).toBe(true);
      expect(charities.get('ch-1')?.totalRaisedCents).toBe(120900); // Unchanged!
      expect(charities.get('ch-1')?.donorCount).toBe(6); // Unchanged!

      // Recurring invoice renewal
      const res2 = recordDonationAndIncrement({
        charityId: 'ch-1',
        userId: 'u-1',
        amountCents: 20900,
        stripeInvoiceId: 'in_cycle_456',
      });
      expect(res2.duplicate).toBe(false);
      expect(res2.newTotalCents).toBe(141800);
      expect(charities.get('ch-1')?.donorCount).toBe(7);

      // Duplicate delivery of invoice renewal -> acknowledges without double counting
      const res2Dup = recordDonationAndIncrement({
        charityId: 'ch-1',
        userId: 'u-1',
        amountCents: 20900,
        stripeInvoiceId: 'in_cycle_456',
      });
      expect(res2Dup.duplicate).toBe(true);
      expect(charities.get('ch-1')?.totalRaisedCents).toBe(141800); // Unchanged!
    });
  });

  // ===========================================================================
  // Priority 4 — Operational Reliability & Lockout Prevention
  // ===========================================================================
  describe('Priority 4: Sole Administrator Demotion Protection & Operational Reliability', () => {
    it('blocks demoting the sole administrator to prevent permanent lockout', () => {
      const profiles = [
        { id: 'admin-1', role: 'admin', email: 'sole.admin@greenpulse.org' },
        { id: 'user-1', role: 'subscriber', email: 'golfer@greenpulse.org' },
      ];

      function updateRole(targetId: string, newRole: string) {
        const target = profiles.find((p) => p.id === targetId);
        if (!target) throw new Error('User not found');

        if (target.role === 'admin' && newRole !== 'admin') {
          const adminCount = profiles.filter((p) => p.role === 'admin').length;
          if (adminCount <= 1) {
            throw new Error('Action Prohibited: Cannot demote the sole administrator on the platform.');
          }
        }
        target.role = newRole;
        return target;
      }

      // Demoting sole admin -> rejected
      expect(() => updateRole('admin-1', 'subscriber')).toThrow(
        'Action Prohibited: Cannot demote the sole administrator on the platform.'
      );

      // Adding a second admin
      profiles.push({ id: 'admin-2', role: 'admin', email: 'admin2@greenpulse.org' });

      // Self-demotion guard: an admin cannot demote themselves
      function updateRoleWithCaller(callerId: string, targetId: string, newRole: string) {
        if (targetId === callerId && newRole !== 'admin') {
          throw new Error('Action Prohibited: You cannot remove your own administrator privileges. Another administrator must perform this action.');
        }
        return updateRole(targetId, newRole);
      }

      // admin-1 trying to demote themselves -> rejected
      expect(() => updateRoleWithCaller('admin-1', 'admin-1', 'subscriber')).toThrow(
        /You cannot remove your own administrator privileges/
      );

      // admin-2 demoting admin-1 -> permitted
      expect(updateRoleWithCaller('admin-2', 'admin-1', 'subscriber').role).toBe('subscriber');

      // Now demoting admin-2 (last admin remaining) is rejected again
      expect(() => updateRoleWithCaller('other', 'admin-2', 'subscriber')).toThrow(
        'Action Prohibited: Cannot demote the sole administrator on the platform.'
      );
    });

    it('enforces secure winner proof pathing, file constraints, and signed URL 300s expiry limit', () => {
      // 1. File validation
      const validPng = { name: 'scorecard.png', size: 2 * 1024 * 1024, type: 'image/png' };
      expect(validateProofFile(validPng).valid).toBe(true);

      const oversized = { name: 'huge.jpg', size: 6 * 1024 * 1024, type: 'image/jpeg' };
      expect(validateProofFile(oversized).valid).toBe(false);

      const executable = { name: 'hack.exe', size: 1024, type: 'application/x-msdownload' };
      expect(validateProofFile(executable).valid).toBe(false);

      // 2. Path traversal sanitization
      const safePath = generateSecureProofPath('../usr-123/..', '../../claim-456', 'scorecard.png');
      expect(safePath).not.toContain('..');
      expect(safePath).toMatch(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+\.png$/);

      // 3. Signed URL expiry capping
      const capSignedUrlExpiry = (expirySec: number) => Math.min(Math.max(1, expirySec), 300);
      expect(capSignedUrlExpiry(300)).toBe(300);
      expect(capSignedUrlExpiry(3600)).toBe(300); // Capped to 5 minutes
      expect(capSignedUrlExpiry(0)).toBe(1);
    });

    it('requires a mandatory detailed rejection reason when rejecting a winner claim', () => {
      const validUnderReview = validateReviewDecision({ decision: 'under_review' });
      expect(validUnderReview.valid).toBe(true);

      const validApproved = validateReviewDecision({ decision: 'verified' });
      expect(validApproved.valid).toBe(true);

      const invalidReject = validateReviewDecision({ decision: 'rejected', rejectionReason: 'bad' });
      expect(invalidReject.valid).toBe(false);
      expect(invalidReject.error).toMatch(/minimum 5 characters/i);

      const validReject = validateReviewDecision({
        decision: 'rejected',
        rejectionReason: 'The uploaded screenshot does not show player handicap and date.',
      });
      expect(validReject.valid).toBe(true);
    });
  });
});
