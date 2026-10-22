// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This code runs in Supabase Edge Functions (Deno runtime)

import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.39.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function resolveSafeAppUrl(originHeader: string | null): string {
  // 1. Explicitly configured canonical application URL takes strict precedence
  const configuredAppUrl = Deno.env.get('CLIENT_APP_URL') || Deno.env.get('VITE_APP_URL');
  if (configuredAppUrl) {
    return configuredAppUrl.replace(/\/$/, '');
  }

  // 2. If origin header is supplied, validate against trusted hostname whitelist
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

  // 3. Fallback safe default
  return 'http://localhost:5173';
}

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: 'Stripe is not configured. Server-side STRIPE_SECRET_KEY is missing.',
          code: 'STRIPE_NOT_CONFIGURED',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // Initialize authenticated Supabase client to verify caller identity
    const authHeader = req.headers.get('Authorization');
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });

    // Trusted admin client for verifying DB constraints without client bypass
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse payload
    const body = await req.json().catch(() => ({}));
    const { mode, planTier, charityId, charityPercentage, amountCents } = body;

    const appUrl = resolveSafeAppUrl(req.headers.get('origin'));

    // =========================================================================
    // MODE A: MEMBERSHIP SUBSCRIPTION CHECKOUT (§ 01, § 04, § 08)
    // =========================================================================
    if (mode === 'subscription') {
      // 1. Authenticate user from session token
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authentication required. Authorization header missing.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired user session. Please sign in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Validate plan tier
      if (planTier !== 'monthly' && planTier !== 'yearly') {
        return new Response(
          JSON.stringify({ error: 'Invalid plan tier. Must be "monthly" or "yearly".' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Prevent duplicate active subscriptions (§ 04)
      const { data: activeSub, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('id, status, plan_tier')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) {
        console.error('[create-checkout-session] DB error checking existing subscription:', subError);
      }

      if (activeSub) {
        return new Response(
          JSON.stringify({
            error: 'You already have an active GreenPulse subscription. Manage your membership from your dashboard.',
            code: 'ALREADY_SUBSCRIBED',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4. Validate charity and minimum 10% pledge requirement (§ 08.1)
      let validatedCharityId = charityId;
      const pledge = typeof charityPercentage === 'number' ? charityPercentage : 10;
      if (pledge < 10 || pledge > 100) {
        return new Response(
          JSON.stringify({ error: 'Charity allocation must be at least 10% and at most 100% per PRD § 08.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (validatedCharityId) {
        const { data: charityRow } = await supabaseAdmin
          .from('charities')
          .select('id')
          .eq('id', validatedCharityId)
          .eq('is_archived', false)
          .maybeSingle();

        if (!charityRow) {
          // Fallback to first available active (non-archived) charity if invalid/archived ID provided
          const { data: fallbackCharity } = await supabaseAdmin
            .from('charities')
            .select('id')
            .eq('is_archived', false)
            .limit(1)
            .maybeSingle();
          validatedCharityId = fallbackCharity?.id || '';
        }
      }

      // 5. Derive Stripe Price (Minor Currency Units: Paise)
      // Monthly: ₹2,090.00 INR (209000 paise)
      // Yearly: ₹20,900.00 INR (2090000 paise - includes 2 months free discount)
      const configuredPriceId =
        planTier === 'yearly'
          ? Deno.env.get('STRIPE_PRICE_YEARLY')
          : Deno.env.get('STRIPE_PRICE_MONTHLY');

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
      if (configuredPriceId) {
        lineItems = [{ price: configuredPriceId, quantity: 1 }];
      } else {
        lineItems = [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: planTier === 'yearly' ? 'GreenPulse Yearly Membership' : 'GreenPulse Monthly Membership',
                description: `Golf performance tracking, monthly number-match prize draw ticket, and min ${pledge}% charity donation.`,
              },
              unit_amount: planTier === 'yearly' ? 2090000 : 209000,
              recurring: {
                interval: planTier === 'yearly' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ];
      }

      // 6. Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: lineItems,
        customer_email: user.email,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          plan_tier: planTier,
          charity_id: validatedCharityId || '',
          charity_percentage: String(pledge),
          type: 'membership_subscription',
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_tier: planTier,
            charity_id: validatedCharityId || '',
            charity_percentage: String(pledge),
          },
        },
        success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/subscribe/cancel`,
      });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // MODE B: STANDALONE CHARITY DONATION CHECKOUT (§ 08.1)
    // =========================================================================
    if (mode === 'donation') {
      if (!charityId) {
        return new Response(
          JSON.stringify({ error: 'Charity ID is required for standalone donations.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 1. Validate charity exists and is active (not archived) in database
      const { data: charity, error: charityErr } = await supabaseAdmin
        .from('charities')
        .select('id, name, slug, is_archived')
        .eq('id', charityId)
        .eq('is_archived', false)
        .maybeSingle();

      if (charityErr || !charity) {
        return new Response(
          JSON.stringify({ error: 'Selected charity does not exist or is not eligible for donations.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Validate donation amount on the server (explicit paise units)
      const amount = Number(amountCents);
      if (!Number.isInteger(amount) || amount < 11000 || amount > 110000000) {
        return new Response(
          JSON.stringify({ error: 'Donation amount must be between ₹110.00 and ₹11,00,000.00.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Resolve user identity if authenticated (optional for guest donations)
      let donorUserId: string | null = null;
      let donorEmail: string | undefined = undefined;
      if (authHeader) {
        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (user) {
          donorUserId = user.id;
          donorEmail = user.email;
        }
      }

      // 4. Create hosted Checkout Session for one-time donation
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: donorEmail,
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `Donation: ${charity.name}`,
                description: '100% independent charitable contribution via GreenPulse.',
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: 'independent_direct_donation',
          charity_id: charity.id,
          user_id: donorUserId || '',
          amount_cents: String(amount),
        },
        success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&type=donation`,
        cancel_url: `${appUrl}/charities`,
      });

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid checkout mode. Specify mode: "subscription" or "donation".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('[create-checkout-session] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
