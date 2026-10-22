import { requireSupabase, env } from '../lib/supabase';
import type { SubscriptionPlan } from '../types';

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface CheckoutError {
  message: string;
  code?: string;
}

export const stripeService = {

  async createSubscriptionCheckout(
    planTier: SubscriptionPlan,
    charityId?: string,
    charityPercentage: number = 10
  ): Promise<CheckoutResult> {
    if (!env.isSupabaseConfigured) {
      throw new Error(
        'Supabase credentials are not configured. A valid Supabase project is required for membership checkout.'
      );
    }

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
      console.error('[stripeService] Edge function checkout session error:', error);

      const errorMsg =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : 'Could not create checkout session. Please ensure Edge Functions and Stripe secrets are configured.';
      throw new Error(errorMsg);
    }

    if (!data?.url) {
      if (data?.error) {
        throw new Error(data.error);
      }
      throw new Error('Failed to retrieve checkout URL from payment gateway.');
    }

    return {
      url: data.url,
      sessionId: data.sessionId,
    };
  },

  async createDonationCheckout(
    charityId: string,
    amountCents: number
  ): Promise<CheckoutResult> {
    if (!env.isSupabaseConfigured) {
      throw new Error(
        'Supabase credentials are not configured. A valid Supabase connection is required for charity donations.'
      );
    }

    if (!charityId) {
      throw new Error('Please select a charity to donate to.');
    }

    if (!Number.isInteger(amountCents) || amountCents < 11000) {
      throw new Error('Minimum donation amount is ₹110.00 (11,000 paise).');
    }

    const client = requireSupabase();

    const { data, error } = await client.functions.invoke('create-checkout-session', {
      body: {
        mode: 'donation',
        charityId,
        amountCents,
      },
    });

    if (error) {
      console.error('[stripeService] Direct donation checkout error:', error);
      const errorMsg =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : 'Could not initialize donation checkout. Please ensure Stripe is configured on the backend.';
      throw new Error(errorMsg);
    }

    if (!data?.url) {
      if (data?.error) {
        throw new Error(data.error);
      }
      throw new Error('Failed to retrieve donation checkout URL.');
    }

    return {
      url: data.url,
      sessionId: data.sessionId,
    };
  },
};
