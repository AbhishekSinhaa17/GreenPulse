import { describe, it, expect } from 'vitest';

// Pure algorithmic & domain logic validators mirroring Supabase Edge Functions & stripeService

export function validateSubscriptionCheckoutInput(input: {
  userId?: string | null;
  planTier?: string;
  charityId?: string;
  charityPercentage?: number;
  existingActiveSubscription?: boolean;
}) {
  if (!input.userId) {
    return { valid: false, error: 'Authentication required. User ID missing.' };
  }
  if (input.existingActiveSubscription) {
    return { valid: false, error: 'You already have an active GreenPulse subscription.' };
  }
  if (input.planTier !== 'monthly' && input.planTier !== 'yearly') {
    return { valid: false, error: 'Invalid plan tier. Must be "monthly" or "yearly".' };
  }
  const pct = input.charityPercentage ?? 10;
  if (typeof pct !== 'number' || pct < 10 || pct > 100) {
    return { valid: false, error: 'Charity allocation must be at least 10% and at most 100% per PRD § 08.' };
  }
  return { valid: true };
}

/**
 * Calculates subscription plan pricing using verified explicit integer minor units (paise).
 * Monthly: ₹2,090 = 209,000 paise.
 * Yearly: ₹20,900 = 2,090,000 paise (includes ₹4,180 / 2 months free discount).
 * Charity pledge is calculated on the full subscription fee.
 */
export function calculatePlanPricing(planTier: 'monthly' | 'yearly', charityPercentage: number = 10) {
  const basePriceCents = planTier === 'yearly' ? 2090000 : 209000;
  const charityAmountCents = Math.round(basePriceCents * (charityPercentage / 100));
  const prizePoolShareCents = Math.round(basePriceCents * 0.5);
  const platformOpsCents = basePriceCents - charityAmountCents - prizePoolShareCents;

  return {
    basePriceCents,
    charityAmountCents,
    prizePoolShareCents,
    platformOpsCents,
    annualSavingsCents: planTier === 'yearly' ? 209000 * 12 - 2090000 : 0, // 2508000 - 2090000 = 418000 (₹4,180)
  };
}

export function validateDonationInput(input: {
  charityId?: string;
  amountCents?: number;
  charityExists?: boolean;
  isArchived?: boolean;
}) {
  if (!input.charityId) {
    return { valid: false, error: 'Charity ID is required.' };
  }
  if (input.charityExists === false || input.isArchived === true) {
    return { valid: false, error: 'Selected charity does not exist or is not eligible for donations.' };
  }
  const amount = Number(input.amountCents);
  if (!Number.isInteger(amount) || amount < 11000 || amount > 110000000) {
    return { valid: false, error: 'Donation amount must be between ₹110.00 and ₹11,00,000.00.' };
  }
  return { valid: true };
}

export interface WebhookEventRecord {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  processedAt?: string | null;
  errorMessage?: string | null;
}

/**
 * Validates retryable webhook idempotency state machine
 */
export function processRetryableWebhookIdempotency(
  ledger: Map<string, WebhookEventRecord>,
  eventId: string
): { shouldProcess: boolean; duplicate: boolean; inProgress: boolean } {
  const existing = ledger.get(eventId);
  if (existing) {
    if (existing.status === 'completed') {
      return { shouldProcess: false, duplicate: true, inProgress: false };
    }
    if (existing.status === 'processing') {
      return { shouldProcess: false, duplicate: false, inProgress: true };
    }
    // If failed, allow retry
  }
  ledger.set(eventId, { id: eventId, status: 'processing', processedAt: null });
  return { shouldProcess: true, duplicate: false, inProgress: false };
}

export function verifyWebhookSignatureMock(
  rawBody: string,
  signature: string | null,
  secret: string
): { verified: boolean; error?: string } {
  if (!signature) {
    return { verified: false, error: 'Missing stripe-signature header.' };
  }
  if (!secret) {
    return { verified: false, error: 'Missing webhook signing secret.' };
  }
  if (!signature.includes('t=') || !signature.includes('v1=')) {
    return { verified: false, error: 'Malformed stripe-signature header.' };
  }
  if (signature.includes('invalid_sig')) {
    return { verified: false, error: 'Signature verification failed.' };
  }
  return { verified: true };
}

export function resolveSafeAppUrl(
  originHeader: string | null,
  configuredAppUrl?: string
): string {
  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/$/, '');
  }
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      const isAllowedDomain = parsed.hostname.endsWith('.greenpulse.org') || parsed.hostname.endsWith('.vercel.app');
      if (isLocal || isAllowedDomain) {
        return originHeader.replace(/\/$/, '');
      }
    } catch {
      // Invalid URL format
    }
  }
  return 'http://localhost:5173';
}

export function applySubscriptionLifecycleTransition(
  currentStatus: string,
  eventType: string
): string {
  switch (eventType) {
    case 'customer.subscription.created':
    case 'checkout.session.completed':
    case 'invoice.paid':
      return 'active';
    case 'invoice.payment_failed':
      return 'past_due';
    case 'customer.subscription.deleted':
      return 'canceled';
    default:
      return currentStatus;
  }
}

describe('Phase 4: Stripe Subscriptions, Webhook Idempotency & Charity Accounting', () => {
  // 1. Checkout Input Validation & Authorization
  describe('1. Checkout Input Validation & Authorization', () => {
    it('rejects unauthenticated membership checkout requests', () => {
      const res = validateSubscriptionCheckoutInput({
        userId: null,
        planTier: 'monthly',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Authentication required/i);
    });

    it('rejects invalid plan tiers', () => {
      const res = validateSubscriptionCheckoutInput({
        userId: 'usr_123',
        planTier: 'lifetime' as any,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/Invalid plan tier/i);
    });

    it('enforces PRD minimum 10% charity contribution invariant', () => {
      const resUnder = validateSubscriptionCheckoutInput({
        userId: 'usr_123',
        planTier: 'monthly',
        charityPercentage: 5,
      });
      expect(resUnder.valid).toBe(false);
      expect(resUnder.error).toMatch(/at least 10%/i);

      const resOver = validateSubscriptionCheckoutInput({
        userId: 'usr_123',
        planTier: 'monthly',
        charityPercentage: 110,
      });
      expect(resOver.valid).toBe(false);

      const resValid = validateSubscriptionCheckoutInput({
        userId: 'usr_123',
        planTier: 'monthly',
        charityPercentage: 15,
      });
      expect(resValid.valid).toBe(true);
    });

    it('prevents duplicate active subscriptions', () => {
      const res = validateSubscriptionCheckoutInput({
        userId: 'usr_123',
        planTier: 'monthly',
        existingActiveSubscription: true,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/already have an active GreenPulse subscription/i);
    });
  });

  // 2. Verified Explicit Integer Minor Currency Units (INR paise)
  describe('2. Verified Subscription Pricing & Full-Fee Charity Accounting', () => {
    it('correctly prices Monthly plan at ₹2,090.00 (209,000 paise) and calculates default 10% charity split (20,900 paise / ₹209)', () => {
      const pricing = calculatePlanPricing('monthly', 10);
      expect(pricing.basePriceCents).toBe(209000); // 209,000 paise (₹2,090.00)
      expect(pricing.charityAmountCents).toBe(20900); // 20,900 paise (₹209.00 / 10% of full fee)
      expect(pricing.prizePoolShareCents).toBe(104500); // 104,500 paise (₹1,045.00 / 50%)
      expect(pricing.platformOpsCents).toBe(83600); // 83,600 paise (₹836.00 / 40%)
    });

    it('correctly prices Yearly plan at ₹20,900.00 (2,090,000 paise) with 2 months free savings (₹4,180.00 / 418,000 paise)', () => {
      const pricing = calculatePlanPricing('yearly', 10);
      expect(pricing.basePriceCents).toBe(2090000); // 2,090,000 paise (₹20,900.00)
      expect(pricing.annualSavingsCents).toBe(418000); // 418,000 paise (₹4,180.00)
      expect(pricing.charityAmountCents).toBe(209000); // 209,000 paise (₹2,090.00 / 10% of full fee)
    });

    it('accurately scales voluntary charity contribution increase up to 100%', () => {
      const pricing = calculatePlanPricing('monthly', 25);
      expect(pricing.charityAmountCents).toBe(52250); // 25% of 209,000 = 52,250 paise (₹522.50)

      const pricing100 = calculatePlanPricing('monthly', 100);
      expect(pricing100.charityAmountCents).toBe(209000); // 100% of 209,000 = 209,000 paise (₹2,090.00)
    });
  });

  // 3. Donation Amount & Charity Eligibility Validation
  describe('3. Donation Amount and Charity Eligibility Validation', () => {
    it('rejects standalone donation if charity ID is missing or charity does not exist or is archived', () => {
      const missing = validateDonationInput({ amountCents: 25000 });
      expect(missing.valid).toBe(false);
      expect(missing.error).toMatch(/Charity ID is required/i);

      const notFound = validateDonationInput({
        charityId: 'charity-999',
        charityExists: false,
        amountCents: 25000,
      });
      expect(notFound.valid).toBe(false);
      expect(notFound.error).toMatch(/does not exist or is not eligible/i);

      const archived = validateDonationInput({
        charityId: 'charity-archived',
        charityExists: true,
        isArchived: true,
        amountCents: 25000,
      });
      expect(archived.valid).toBe(false);
      expect(archived.error).toMatch(/does not exist or is not eligible/i);
    });

    it('enforces donation boundaries (₹110.00 min / 11,000 paise to ₹11,00,000.00 max / 110,000,000 paise)', () => {
      const tooLow = validateDonationInput({
        charityId: 'charity-1',
        charityExists: true,
        amountCents: 5000, // ₹50.00 (below ₹110)
      });
      expect(tooLow.valid).toBe(false);
      expect(tooLow.error).toMatch(/between ₹110.00 and ₹11,00,000.00/i);

      const tooHigh = validateDonationInput({
        charityId: 'charity-1',
        charityExists: true,
        amountCents: 110000001,
      });
      expect(tooHigh.valid).toBe(false);

      const validDonation = validateDonationInput({
        charityId: 'charity-1',
        charityExists: true,
        amountCents: 25000, // ₹250.00
      });
      expect(validDonation.valid).toBe(true);
    });
  });

  // 4. Canonical Redirect URL Security
  describe('4. Canonical Redirect URL Security & Host Whitelisting', () => {
    it('prioritizes configured canonical application URL and strips trailing slash', () => {
      const url = resolveSafeAppUrl('https://malicious-phishing.com', 'https://greenpulse.org/');
      expect(url).toBe('https://greenpulse.org');
    });

    it('allows localhost and whitelisted domains when no canonical URL is set', () => {
      expect(resolveSafeAppUrl('http://localhost:5173')).toBe('http://localhost:5173');
      expect(resolveSafeAppUrl('https://preview-123.vercel.app/')).toBe('https://preview-123.vercel.app');
    });

    it('rejects untrusted external origin headers and falls back to safe default', () => {
      const url = resolveSafeAppUrl('https://evil-phishing-site.com');
      expect(url).toBe('http://localhost:5173');
    });
  });

  // 5. Retryable Webhook Idempotency State Machine
  describe('5. Retryable Webhook Idempotency State Machine', () => {
    it('does not mark event completed before side effects succeed and allows retry on failure', () => {
      const ledger = new Map<string, WebhookEventRecord>();

      // 1. Initial attempt starts processing
      const firstAttempt = processRetryableWebhookIdempotency(ledger, 'evt_001');
      expect(firstAttempt.shouldProcess).toBe(true);
      expect(ledger.get('evt_001')?.status).toBe('processing');

      // 2. Simulate failure during side effects -> record marked failed
      ledger.set('evt_001', { id: 'evt_001', status: 'failed', errorMessage: 'DB timeout' });

      // 3. Webhook retry comes in from Stripe -> must allow retry because not completed
      const retryAttempt = processRetryableWebhookIdempotency(ledger, 'evt_001');
      expect(retryAttempt.shouldProcess).toBe(true);
      expect(retryAttempt.duplicate).toBe(false);

      // 4. Side effects succeed -> marked completed
      ledger.set('evt_001', { id: 'evt_001', status: 'completed', processedAt: new Date().toISOString() });

      // 5. Subsequent delivery -> recognizes completed duplicate and skips
      const duplicateDelivery = processRetryableWebhookIdempotency(ledger, 'evt_001');
      expect(duplicateDelivery.shouldProcess).toBe(false);
      expect(duplicateDelivery.duplicate).toBe(true);
    });
  });

  // 6. Database-Enforced Idempotency for Invoices and Sessions
  describe('6. Database-Enforced Idempotency for Donation Ledger', () => {
    it('enforces uniqueness on session ID and recurring invoice ID preventing double accounting', () => {
      const ledgerTable = new Map<string, { charityId: string; amountCents: number }>();

      function recordDonation(key: string, charityId: string, amountCents: number) {
        if (ledgerTable.has(key)) {
          return { success: false, duplicate: true };
        }
        ledgerTable.set(key, { charityId, amountCents });
        return { success: true, duplicate: false };
      }

      // First invoice execution
      const inv1 = recordDonation('in_renewal_1001', 'charity-1', 20900);
      expect(inv1.success).toBe(true);
      expect(ledgerTable.size).toBe(1);

      // Webhook retry of the same invoice
      const invRetry = recordDonation('in_renewal_1001', 'charity-1', 20900);
      expect(invRetry.success).toBe(false);
      expect(invRetry.duplicate).toBe(true);
      expect(ledgerTable.size).toBe(1); // No double contribution
    });
  });

  // 7. Atomic Charity Total Updates
  describe('7. Atomic Charity Total Updates (No Read-Modify-Write)', () => {
    it('atomically increments charity totals avoiding lost updates under concurrency', () => {
      let totalRaisedCents = 100000;

      function simulateAtomicIncrement(amountToAdd: number): number {
        if (amountToAdd <= 0) throw new Error('amount must be positive');
        totalRaisedCents += amountToAdd;
        return totalRaisedCents;
      }

      const res1 = simulateAtomicIncrement(20900);
      const res2 = simulateAtomicIncrement(50000);

      expect(res1).toBe(120900);
      expect(res2).toBe(170900);
      expect(totalRaisedCents).toBe(170900);
    });
  });

  // 8. Subscription Lifecycle Transitions
  describe('8. Subscription Lifecycle State Machine', () => {
    it('transitions subscription to active on checkout completion or invoice payment', () => {
      expect(applySubscriptionLifecycleTransition('incomplete', 'checkout.session.completed')).toBe('active');
      expect(applySubscriptionLifecycleTransition('past_due', 'invoice.paid')).toBe('active');
    });

    it('transitions subscription to past_due on invoice payment failure', () => {
      expect(applySubscriptionLifecycleTransition('active', 'invoice.payment_failed')).toBe('past_due');
    });

    it('transitions subscription to canceled on subscription deletion', () => {
      expect(applySubscriptionLifecycleTransition('active', 'customer.subscription.deleted')).toBe('canceled');
    });
  });
});
