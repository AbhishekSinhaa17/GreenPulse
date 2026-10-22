import { requireSupabase, env } from '../lib/supabase';
import type { Subscription, SubscriptionPlan } from '../types';

export const subscriptionService = {

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    if (!env.isSupabaseConfigured) {
      if (env.demoPayments && typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(`gp_demo_sub_${userId}`) || sessionStorage.getItem('gp_demo_subscription');
        if (stored) {
          try {
            return JSON.parse(stored) as Subscription;
          } catch {

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

    if (data) return data as Subscription;

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`gp_demo_sub_${userId}`) || localStorage.getItem(`gp_demo_sub_${userId}`);
      if (stored) {
        try {
          return JSON.parse(stored) as Subscription;
        } catch {

        }
      }
    }

    return null;
  },

  async activateDemoSubscription(
    plan: SubscriptionPlan,
    charityId?: string,
    charityPercentage = 10
  ): Promise<Subscription> {
    if (!env.demoPayments) {
      throw new Error('Demo payments are disabled. Real payment verification required.');
    }

    if (!env.isSupabaseConfigured) {
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

        }
      }
      return demoSub;
    }

    const client = requireSupabase();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('Authentication required: You must be signed in to activate a demo subscription.');
    }

    const { data, error } = await client.rpc('activate_demo_subscription', {
      p_plan_tier: plan,
      p_charity_id: charityId || null,
      p_charity_percentage: charityPercentage,
    });

    if (error) {
      console.warn('[subscriptionService] activate_demo_subscription RPC unavailable or failed, applying direct table/session fallback:', error);

      const now = new Date();
      const periodEnd = new Date(now.getTime() + (plan === 'yearly' ? 365 : 30) * 86400000);

      try {
        if (charityId) {
          await client.from('charity_preferences').upsert({
            user_id: user.id,
            charity_id: charityId,
            percentage: charityPercentage,
            updated_at: now.toISOString(),
          }, { onConflict: 'user_id' });
        }

        const { data: directData, error: directErr } = await client
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            plan_tier: plan,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
            updated_at: now.toISOString(),
          }, { onConflict: 'user_id' })
          .select('*')
          .maybeSingle();

        if (!directErr && directData) {
          const sub = directData as Subscription;
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(`gp_demo_sub_${user.id}`, JSON.stringify(sub));
              localStorage.setItem(`gp_demo_sub_${user.id}`, JSON.stringify(sub));
            } catch {

            }
          }
          return sub;
        }
      } catch (tableErr) {
        console.warn('[subscriptionService] Direct table write failed, falling back to local demo session:', tableErr);
      }

      const fallbackSub: Subscription = {
        id: `demo-sub-${Date.now()}`,
        user_id: user.id,
        plan_tier: plan,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`gp_demo_sub_${user.id}`, JSON.stringify(fallbackSub));
          localStorage.setItem(`gp_demo_sub_${user.id}`, JSON.stringify(fallbackSub));
        } catch {

        }
      }
      return fallbackSub;
    }

    const sub = (data?.subscription || data) as Subscription;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`gp_demo_sub_${user.id}`, JSON.stringify(sub));
        localStorage.setItem(`gp_demo_sub_${user.id}`, JSON.stringify(sub));
      } catch {

      }
    }
    return sub;
  },
};
