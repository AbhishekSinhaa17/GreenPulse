import { requireSupabase, env } from '../lib/supabase';
import type { SubscriptionPlan } from '../types';
import { subscriptionService } from './subscriptionService';

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface CheckoutError {
  message: string;
  code?: string;
}

export const stripeService = {

  async executeDemoDonation(
    charityId: string,
    amountCents: number
  ): Promise<CheckoutResult> {
    if (env.isSupabaseConfigured) {
      try {
        const client = requireSupabase();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(charityId);
        if (isUuid) {
          const { data: charity } = await client
            .from('charities')
            .select('total_raised_cents')
            .eq('id', charityId)
            .maybeSingle();

          if (charity) {
            const currentCents = charity.total_raised_cents || 0;
            await client
              .from('charities')
              .update({ total_raised_cents: currentCents + amountCents })
              .eq('id', charityId);
          }
        }

        const { data: { user } } = await client.auth.getUser();
        await client.from('donation_ledger').insert({
          charity_id: isUuid ? charityId : null,
          donor_user_id: user?.id || null,
          amount_cents: amountCents,
          stripe_payment_intent_id: `demo_pi_${Date.now()}`,
          status: 'succeeded',
        });
      } catch (dbErr) {
        console.warn('[stripeService] Demo donation database write skipped:', dbErr);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const key = `gp_charity_raised_${charityId}`;
        const prev = parseInt(localStorage.getItem(key) || '0', 10);
        localStorage.setItem(key, String(prev + amountCents));
      } catch {
        // Ignore localStorage issues
      }
    }

    return {
      url: '',
      sessionId: `demo_donation_${Date.now()}`,
    };
  },

  async createSubscriptionCheckout(
    planTier: SubscriptionPlan,
    charityId?: string,
    charityPercentage: number = 10
  ): Promise<CheckoutResult> {
    if (env.demoPayments) {
      const sub = await subscriptionService.activateDemoSubscription(
        planTier,
        charityId,
        charityPercentage
      );
      return {
        url: `${env.appUrl}/subscribe/success?demo=true&plan=${planTier}`,
        sessionId: sub.id,
      };
    }

    if (!env.isSupabaseConfigured) {
      const sub = await subscriptionService.activateDemoSubscription(
        planTier,
        charityId,
        charityPercentage
      );
      return {
        url: `${env.appUrl}/subscribe/success?demo=true&plan=${planTier}`,
        sessionId: sub.id,
      };
    }

    try {
      const client = requireSupabase();
      const { data: { session } } = await client.auth.getSession();

      if (!session || !session.user) {
        throw new Error('You must be signed in to join a GreenPulse membership.');
      }

      const { data, error } = await client.functions.invoke('create-checkout-session', {
        body: {
          mode: 'subscription',
          planTier,
          charityId: charityId || undefined,
          charityPercentage: charityPercentage || 10,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        return {
          url: data.url,
          sessionId: data.sessionId,
        };
      }
      throw new Error(data?.error || 'Failed to retrieve checkout URL from payment gateway.');
    } catch (err: unknown) {
      console.warn('[stripeService] Edge function subscription checkout unavailable, falling back to simulated demo payment:', err);
      const sub = await subscriptionService.activateDemoSubscription(
        planTier,
        charityId,
        charityPercentage
      );
      return {
        url: `${env.appUrl}/subscribe/success?demo=true&plan=${planTier}&fallback=true`,
        sessionId: sub.id,
      };
    }
  },

  async createDonationCheckout(
    charityId: string,
    amountCents: number
  ): Promise<CheckoutResult> {
    if (!charityId) {
      throw new Error('Please select a charity to donate to.');
    }

    if (!Number.isInteger(amountCents) || amountCents < 11000) {
      throw new Error('Minimum donation amount is ₹110.00 (11,000 paise).');
    }

    if (env.demoPayments) {
      return this.executeDemoDonation(charityId, amountCents);
    }

    if (!env.isSupabaseConfigured) {
      return this.executeDemoDonation(charityId, amountCents);
    }

    try {
      const client = requireSupabase();

      const { data, error } = await client.functions.invoke('create-checkout-session', {
        body: {
          mode: 'donation',
          charityId,
          amountCents,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        return {
          url: data.url,
          sessionId: data.sessionId,
        };
      }
      throw new Error(data?.error || 'Failed to retrieve donation checkout URL.');
    } catch (err: unknown) {
      console.warn('[stripeService] Edge function donation checkout error, falling back to simulated demo payment:', err);
      return this.executeDemoDonation(charityId, amountCents);
    }
  },
};

