import { requireSupabase, env } from '../lib/supabase';
import type { Subscription, SubscriptionPlan } from '../types';

export const subscriptionService = {

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    if (typeof window !== 'undefined') {
      const demoOverride = sessionStorage.getItem(`gp_demo_sub_${userId}`) || localStorage.getItem(`gp_demo_sub_${userId}`);
      if (demoOverride) {
        try {
          const parsed = JSON.parse(demoOverride) as Subscription;
          if (parsed && parsed.status === 'active') {
            return parsed;
          }
        } catch {
          // ignore
        }
      }
    }

    if (!env.isSupabaseConfigured) {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(`gp_demo_sub_${userId}`) || sessionStorage.getItem('gp_demo_subscription');
        if (stored) {
          try {
            return JSON.parse(stored) as Subscription;
          } catch {
            // ignore
          }
        }
      }
      return null;
    }

    try {
      const client = requireSupabase();
      const { data, error } = await client
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (error) {
        console.warn('[subscriptionService] Error fetching user subscription, checking local storage:', error);
      } else if (data) {
        return data as Subscription;
      }
    } catch (err) {
      console.warn('[subscriptionService] Query exception, falling back to local storage:', err);
    }

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`gp_demo_sub_${userId}`) || localStorage.getItem(`gp_demo_sub_${userId}`) || sessionStorage.getItem('gp_demo_subscription');
      if (stored) {
        try {
          return JSON.parse(stored) as Subscription;
        } catch {
          // ignore
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
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (plan === 'yearly' ? 365 : 30) * 86400000);

    let currentUser = null;
    if (env.isSupabaseConfigured) {
      try {
        const client = requireSupabase();
        const { data: { user } } = await client.auth.getUser();
        currentUser = user;
      } catch {
        currentUser = null;
      }
    }

    // Guest / non-logged-in demo activation:
    if (!currentUser) {
      const demoSub: Subscription = {
        id: `demo-sub-${Date.now()}`,
        user_id: 'demo-user',
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
          sessionStorage.setItem('gp_demo_subscription', JSON.stringify(demoSub));
          sessionStorage.setItem('gp_demo_sub_demo-user', JSON.stringify(demoSub));
          localStorage.setItem('gp_demo_sub_demo-user', JSON.stringify(demoSub));
        } catch {
          // ignore
        }
      }
      return demoSub;
    }

    const client = requireSupabase();

    // Ensure profiles role is subscriber:
    try {
      const { data: prof } = await client
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();
      if (prof && prof.role !== 'admin') {
        await client
          .from('profiles')
          .update({ role: 'subscriber', updated_at: now.toISOString() })
          .eq('id', currentUser.id);
      }
    } catch (profErr) {
      console.warn('[subscriptionService] Profile role update warning:', profErr);
    }

    // Authenticated user demo activation via RPC:
    try {
      const { data, error } = await client.rpc('activate_demo_subscription', {
        p_plan_tier: plan,
        p_charity_id: charityId || null,
        p_charity_percentage: charityPercentage,
      });

      if (!error && data) {
        const sub = (data?.subscription || data) as Subscription;
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(`gp_demo_sub_${currentUser.id}`, JSON.stringify(sub));
            localStorage.setItem(`gp_demo_sub_${currentUser.id}`, JSON.stringify(sub));
          } catch {
            // ignore
          }
        }
        return sub;
      }
      if (error) {
        console.warn('[subscriptionService] activate_demo_subscription RPC unavailable or failed, applying direct table/session fallback:', error);
      }
    } catch (rpcErr) {
      console.warn('[subscriptionService] RPC call exception, applying fallback:', rpcErr);
    }

    // Fallback: direct table upsert or local storage
    try {
      if (charityId) {
        await client.from('charity_preferences').upsert({
          user_id: currentUser.id,
          charity_id: charityId,
          percentage: charityPercentage,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' });
      }

      const { data: directData, error: directErr } = await client
        .from('subscriptions')
        .upsert({
          user_id: currentUser.id,
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
            sessionStorage.setItem(`gp_demo_sub_${currentUser.id}`, JSON.stringify(sub));
            localStorage.setItem(`gp_demo_sub_${currentUser.id}`, JSON.stringify(sub));
          } catch {
            // ignore
          }
        }
        return sub;
      }
    } catch (tableErr) {
      console.warn('[subscriptionService] Direct table write failed, falling back to local demo session:', tableErr);
    }

    const fallbackSub: Subscription = {
      id: `demo-sub-${Date.now()}`,
      user_id: currentUser.id,
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
        sessionStorage.setItem(`gp_demo_sub_${currentUser.id}`, JSON.stringify(fallbackSub));
        localStorage.setItem(`gp_demo_sub_${currentUser.id}`, JSON.stringify(fallbackSub));
      } catch {
        // ignore
      }
    }
    return fallbackSub;
  },
};

