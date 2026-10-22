import { requireSupabase, env } from '../lib/supabase';
import type { Subscription, SubscriptionPlan } from '../types';

export const subscriptionService = {
  /**
   * Fetches the active or latest subscription record for the given user from PostgreSQL.
   * Returns null if the user has no recorded subscription.
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    if (!env.isSupabaseConfigured) {
      if (env.demoPayments && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(`gp_demo_sub_${userId}`) || sessionStorage.getItem('gp_demo_subscription');
        if (stored) {
          try {
            return JSON.parse(stored) as Subscription;
          } catch {
            // ignore JSON parse error
          }
        }
      }
      return null;
    }

    const client = requireSupabase();

    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('[subscriptionService] Error fetching user subscription:', error);
      throw error;
    }

    return data as Subscription | null;
  },

  /**
   * Activates a simulated/demo subscription for the currently authenticated user.
   * Only permitted when VITE_DEMO_PAYMENTS=true is configured.
   * Calls the secure user-scoped PostgreSQL RPC activate_demo_subscription.
   */
  async activateDemoSubscription(
    plan: SubscriptionPlan,
    charityId?: string,
    charityPercentage = 10
  ): Promise<Subscription> {
    if (!env.demoPayments) {
      throw new Error('Demo payments are disabled. Real payment verification required.');
    }

    if (!env.isSupabaseConfigured) {
      // Local preview simulation when Supabase backend is not configured
      const demoSub: Subscription = {
        id: `demo-sub-${Date.now()}`,
        user_id: 'demo-user',
        plan_tier: plan,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (plan === 'yearly' ? 365 : 30) * 86400000).toISOString(),
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('gp_demo_subscription', JSON.stringify(demoSub));
        } catch {
          // ignore
        }
      }
      return demoSub;
    }

    const client = requireSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('Authentication required: You must be signed in to activate a demo subscription.');
    }

    // Call canonical secure user-scoped RPC
    const { data, error } = await client.rpc('activate_demo_subscription', {
      p_plan_tier: plan,
      p_charity_id: charityId || null,
      p_charity_percentage: charityPercentage,
    });

    if (error) {
      console.error('[subscriptionService] Demo subscription RPC error:', error);
      throw new Error(`Demo subscription activation failed: ${error.message}`);
    }

    const sub = (data?.subscription || data) as Subscription;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`gp_demo_sub_${user.id}`, JSON.stringify(sub));
      } catch {
        // ignore
      }
    }
    return sub;
  },
};
