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
    amountCents: number,
    charitySlug?: string
  ): Promise<CheckoutResult> {
    if (env.isSupabaseConfigured) {
      try {
        const client = requireSupabase();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(charityId);

        let dbCharity: { id: string; total_raised_cents: number } | null = null;
        if (isUuid) {
          const { data } = await client
            .from('charities')
            .select('id, total_raised_cents')
            .eq('id', charityId)
            .maybeSingle();
          dbCharity = data;
        } else if (charitySlug) {
          const { data } = await client
            .from('charities')
            .select('id, total_raised_cents')
            .eq('slug', charitySlug)
            .maybeSingle();
          dbCharity = data;
        }

        if (dbCharity) {
          const currentCents = dbCharity.total_raised_cents || 0;
          await client
            .from('charities')
            .update({ total_raised_cents: currentCents + amountCents })
            .eq('id', dbCharity.id);
        }

        const { data: { user } } = await client.auth.getUser();
        await client.from('donation_ledger').insert({
          charity_id: dbCharity?.id || (isUuid ? charityId : null),
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
        const keys = [`gp_charity_raised_${charityId}`];
        if (charitySlug) keys.push(`gp_charity_raised_${charitySlug}`);
        for (const k of keys) {
          const prev = parseInt(localStorage.getItem(k) || '0', 10);
          localStorage.setItem(k, String(prev + amountCents));
        }
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
    const sub = await subscriptionService.activateDemoSubscription(
      planTier,
      charityId,
      charityPercentage
    );
    return {
      url: `${env.appUrl}/subscribe/success?demo=true&plan=${planTier}`,
      sessionId: sub.id,
    };
  },

  async createDonationCheckout(
    charityId: string,
    amountCents: number,
    charitySlug?: string
  ): Promise<CheckoutResult> {
    if (!charityId) {
      throw new Error('Please select a charity to donate to.');
    }

    if (!Number.isInteger(amountCents) || amountCents < 11000) {
      throw new Error('Minimum donation amount is ₹110.00 (11,000 paise).');
    }

    return this.executeDemoDonation(charityId, amountCents, charitySlug);
  },
};


