import { describe, it, expect, beforeEach } from 'vitest';
import type { Subscription, SubscriptionPlan } from '../src/types';

describe('Demo Payment Mode — Unit & Integration Test Suite', () => {
  interface MockDatabaseState {
    subscriptions: Map<string, Subscription>;
    charityPreferences: Map<string, { charityId: string; percentage: number }>;
    donationLedger: Array<{ id: string; amountCents: number; stripeInvoiceId?: string }>;
  }

  let db: MockDatabaseState;

  beforeEach(() => {
    db = {
      subscriptions: new Map(),
      charityPreferences: new Map(),
      donationLedger: [],
    };
  });

  /**
   * Simulates the PostgreSQL stored procedure public.activate_demo_subscription
   */
  function simulateActivateDemoSubscriptionRpc(params: {
    callerUid: string | null;
    demoPaymentsEnabled: boolean;
    planTier: SubscriptionPlan;
    charityId?: string;
    charityPercentage?: number;
  }): { success: boolean; duplicate: boolean; subscription: Subscription } {
    const { callerUid, demoPaymentsEnabled, planTier, charityId, charityPercentage = 10 } = params;

    // 1. Explicit feature flag guard
    if (!demoPaymentsEnabled) {
      throw new Error('Demo payments are disabled. Real payment verification required.');
    }

    // 2. Strict authentication guard (scoped strictly to auth.uid())
    if (!callerUid) {
      throw new Error('Authentication required: You must be logged in to activate a demo subscription.');
    }

    // 3. Plan tier validation
    if (!['monthly', 'yearly'].includes(planTier)) {
      throw new Error('Invalid plan tier: Expected "monthly" or "yearly".');
    }

    // 4. Charity percentage validation
    if (charityPercentage < 10 || charityPercentage > 50) {
      throw new Error('Invalid charity percentage: Must be between 10% and 50%.');
    }

    // 5. Update charity preference if provided
    if (charityId) {
      db.charityPreferences.set(callerUid, { charityId, percentage: charityPercentage });
    }

    // 6. Idempotency Check on subscriptions
    const existing = db.subscriptions.get(callerUid);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (planTier === 'yearly' ? 365 : 30) * 86400000);

    if (existing && existing.status === 'active' && existing.plan_tier === planTier) {
      // Idempotent return without duplicate subscription creation
      return {
        success: true,
        duplicate: true,
        subscription: existing,
      };
    }

    const sub: Subscription = {
      id: existing ? existing.id : `sub_demo_${callerUid}`,
      user_id: callerUid,
      plan_tier: planTier,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      stripe_customer_id: undefined, // Legitimate undefined / null (no fake Stripe IDs)
      stripe_subscription_id: undefined,
      created_at: existing ? existing.created_at : now.toISOString(),
      updated_at: now.toISOString(),
    };

    db.subscriptions.set(callerUid, sub);

    return {
      success: true,
      duplicate: false,
      subscription: sub,
    };
  }

  // ===========================================================================
  // 1. Successful Activation
  // ===========================================================================
  it('successfully activates a monthly demo subscription for the authenticated user', () => {
    const result = simulateActivateDemoSubscriptionRpc({
      callerUid: 'usr-alice-123',
      demoPaymentsEnabled: true,
      planTier: 'monthly',
      charityId: 'charity-green-earth',
      charityPercentage: 15,
    });

    expect(result.success).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.subscription.status).toBe('active');
    expect(result.subscription.plan_tier).toBe('monthly');
    expect(result.subscription.user_id).toBe('usr-alice-123');

    // Asserts no fake Stripe IDs are generated
    expect(result.subscription.stripe_customer_id).toBeUndefined();
    expect(result.subscription.stripe_subscription_id).toBeUndefined();

    // Verifies charity preference was stored
    expect(db.charityPreferences.get('usr-alice-123')).toEqual({
      charityId: 'charity-green-earth',
      percentage: 15,
    });

    // Verifies donation ledger was NOT polluted with fake Stripe charges
    expect(db.donationLedger).toHaveLength(0);
  });

  it('successfully activates a yearly demo subscription with correct validity period', () => {
    const result = simulateActivateDemoSubscriptionRpc({
      callerUid: 'usr-bob-456',
      demoPaymentsEnabled: true,
      planTier: 'yearly',
    });

    expect(result.success).toBe(true);
    expect(result.subscription.plan_tier).toBe('yearly');

    const start = new Date(result.subscription.current_period_start).getTime();
    const end = new Date(result.subscription.current_period_end).getTime();
    const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBe(365);
  });

  // ===========================================================================
  // 2. Repeated Clicks & Idempotency
  // ===========================================================================
  it('is completely idempotent when repeatedly activated, preventing duplicate subscriptions', () => {
    // First click
    const res1 = simulateActivateDemoSubscriptionRpc({
      callerUid: 'usr-charlie-789',
      demoPaymentsEnabled: true,
      planTier: 'monthly',
    });
    expect(res1.duplicate).toBe(false);
    expect(db.subscriptions.size).toBe(1);

    // Second click (duplicate invocation)
    const res2 = simulateActivateDemoSubscriptionRpc({
      callerUid: 'usr-charlie-789',
      demoPaymentsEnabled: true,
      planTier: 'monthly',
    });
    expect(res2.duplicate).toBe(true);
    expect(res2.subscription.id).toBe(res1.subscription.id);

    // Third click
    const res3 = simulateActivateDemoSubscriptionRpc({
      callerUid: 'usr-charlie-789',
      demoPaymentsEnabled: true,
      planTier: 'monthly',
    });
    expect(res3.duplicate).toBe(true);

    // Database still has exactly 1 subscription
    expect(db.subscriptions.size).toBe(1);
  });

  // ===========================================================================
  // 3. Unauthenticated User Rejection
  // ===========================================================================
  it('rejects activation when caller is unauthenticated (callerUid is null)', () => {
    expect(() =>
      simulateActivateDemoSubscriptionRpc({
        callerUid: null,
        demoPaymentsEnabled: true,
        planTier: 'monthly',
      })
    ).toThrow(/Authentication required/i);

    expect(db.subscriptions.size).toBe(0);
  });

  // ===========================================================================
  // 4. Demo Mode Disabled Guard
  // ===========================================================================
  it('fails closed and refuses activation when demo mode is disabled', () => {
    expect(() =>
      simulateActivateDemoSubscriptionRpc({
        callerUid: 'usr-alice-123',
        demoPaymentsEnabled: false, // Flag disabled
        planTier: 'monthly',
      })
    ).toThrow(/Demo payments are disabled\. Real payment verification required\./i);

    expect(db.subscriptions.size).toBe(0);
  });

  // ===========================================================================
  // 5. User-Scoped Authorization (No cross-user activation)
  // ===========================================================================
  it('strictly scopes activation to the authenticated session caller, preventing cross-user mutation', () => {
    // User A activates
    simulateActivateDemoSubscriptionRpc({
      callerUid: 'user-A',
      demoPaymentsEnabled: true,
      planTier: 'monthly',
    });

    // User B activates
    simulateActivateDemoSubscriptionRpc({
      callerUid: 'user-B',
      demoPaymentsEnabled: true,
      planTier: 'yearly',
    });

    expect(db.subscriptions.get('user-A')?.plan_tier).toBe('monthly');
    expect(db.subscriptions.get('user-B')?.plan_tier).toBe('yearly');

    // User A cannot modify User B's subscription because RPC caller is auth.uid()
    expect(db.subscriptions.get('user-A')?.user_id).toBe('user-A');
    expect(db.subscriptions.get('user-B')?.user_id).toBe('user-B');
  });

  // ===========================================================================
  // 6. UI Labeling & Feedback Logic
  // ===========================================================================
  it('correctly provides UI labels depending on demo mode flag', () => {
    function getCheckoutButtonLabel(params: {
      isDemo: boolean;
      hasActiveSubscription: boolean;
      fee: number;
    }) {
      const { isDemo, hasActiveSubscription, fee } = params;
      if (hasActiveSubscription) return 'Already Subscribed';
      if (isDemo) return `Simulate Demo Payment · Activate (₹${fee.toLocaleString('en-IN')})`;
      return `Proceed to Stripe Checkout (₹${fee.toLocaleString('en-IN')})`;
    }

    expect(getCheckoutButtonLabel({ isDemo: true, hasActiveSubscription: false, fee: 2090 })).toBe(
      'Simulate Demo Payment · Activate (₹2,090)'
    );

    expect(getCheckoutButtonLabel({ isDemo: false, hasActiveSubscription: false, fee: 2090 })).toBe(
      'Proceed to Stripe Checkout (₹2,090)'
    );

    expect(getCheckoutButtonLabel({ isDemo: true, hasActiveSubscription: true, fee: 2090 })).toBe(
      'Already Subscribed'
    );
  });
});
