// GreenPulse — Stripe Webhook Handler (Supabase Edge Function / Deno Runtime)
// Source of Truth: PRD § 01, § 04, § 08, § 16
// Handles raw signature verification, retryable event idempotency, subscription status, and donation ledger entries.

import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.39.0';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

  if (!webhookSecret || !stripeKey) {
    console.error('[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY');
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Stripe webhook secrets not configured.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-12-18.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Read Raw Body
  const rawBody = await req.text();

  // 2. Cryptographic Signature Verification
  let event: Stripe.Event;
  try {
    if (!signature) {
      throw new Error('Missing stripe-signature header.');
    }
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error(`[stripe-webhook] Signature verification failed: ${message}`);
    return new Response(
      JSON.stringify({ error: `Webhook signature verification failed: ${message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. Robust Retryable Idempotency Check via stripe_webhook_events
  const { data: existingEvent, error: checkErr } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('id, status, processed_at, created_at')
    .eq('id', event.id)
    .maybeSingle();

  if (checkErr) {
    console.error('[stripe-webhook] Error querying idempotency ledger:', checkErr);
  }

  // If already successfully completed, skip side effects safely
  if (existingEvent && existingEvent.status === 'completed') {
    console.log(`[stripe-webhook] Event ${event.id} already completed at ${existingEvent.processed_at}. Skipping duplicate.`);
    return new Response(
      JSON.stringify({ received: true, duplicate: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // If currently processing by a concurrent worker within the last 60s, acknowledge to prevent race conditions
  if (existingEvent && existingEvent.status === 'processing') {
    const createdAtTime = new Date(existingEvent.created_at || existingEvent.processed_at || Date.now()).getTime();
    if (Date.now() - createdAtTime < 60000) {
      console.log(`[stripe-webhook] Event ${event.id} is actively being processed by another worker. Acknowledging.`);
      return new Response(
        JSON.stringify({ received: true, in_progress: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Record event in idempotency table with 'processing' state before executing side-effects
  const { error: recordEventErr } = await supabaseAdmin
    .from('stripe_webhook_events')
    .upsert({
      id: event.id,
      event_type: event.type,
      status: 'processing',
      error_message: null,
      created_at: new Date().toISOString(),
      processed_at: null,
    });

  if (recordEventErr) {
    console.error('[stripe-webhook] Warning: could not record processing state in ledger:', recordEventErr);
  }

  console.log(`[stripe-webhook] Processing verified event: ${event.type} [${event.id}]`);

  try {
    switch (event.type) {
      // =======================================================================
      // A. CHECKOUT SESSION COMPLETED (Initial Subscription or Direct Donation)
      // =======================================================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription') {
          const userId = session.metadata?.user_id || session.client_reference_id;
          const planTier = (session.metadata?.plan_tier as 'monthly' | 'yearly') || 'monthly';
          const charityId = session.metadata?.charity_id;
          const charityPercentage = Number(session.metadata?.charity_percentage || 10);

          if (!userId) {
            console.error('[stripe-webhook] checkout.session.completed missing user_id in metadata');
            break;
          }

          // Check payment status: only activate if payment is confirmed paid
          const initialStatus = session.payment_status === 'unpaid' ? 'incomplete' : 'active';

          // Fetch full subscription dates from Stripe
          let currentPeriodStart = new Date().toISOString();
          let currentPeriodEnd = new Date(Date.now() + (planTier === 'yearly' ? 365 : 30) * 86400000).toISOString();

          if (session.subscription) {
            try {
              const subObj = await stripe.subscriptions.retrieve(session.subscription as string);
              currentPeriodStart = new Date(subObj.current_period_start * 1000).toISOString();
              currentPeriodEnd = new Date(subObj.current_period_end * 1000).toISOString();
            } catch (retrieveErr) {
              console.warn('[stripe-webhook] Could not retrieve subscription object:', retrieveErr);
            }
          }

          // 1. Upsert Subscription in database
          const { error: subUpsertErr } = await supabaseAdmin.from('subscriptions').upsert(
            {
              user_id: userId,
              stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
              stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
              plan_tier: planTier,
              status: initialStatus,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          if (subUpsertErr) {
            throw new Error(`Failed to update subscriptions table: ${subUpsertErr.message}`);
          }

          // 2. Upsert Charity Preference
          if (charityId) {
            const { error: prefErr } = await supabaseAdmin.from('charity_preferences').upsert(
              {
                user_id: userId,
                charity_id: charityId,
                percentage: charityPercentage,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );

            if (prefErr) {
              console.error('[stripe-webhook] Error saving charity preference:', prefErr);
            }

            // 3. Record Initial Subscription Charity Allocation in donation_ledger
            // Full Subscription Fee: ₹2,090 monthly (209,000 paise) / ₹20,900 yearly (2,090,000 paise)
            const baseAmountCents = planTier === 'yearly' ? 2090000 : 209000;
            const donationCents = Math.round(baseAmountCents * (charityPercentage / 100));

            const { error: recordErr } = await supabaseAdmin.rpc('record_donation_and_increment', {
              p_charity_id: charityId,
              p_user_id: userId,
              p_amount_cents: donationCents,
              p_donation_type: 'subscription_split',
              p_stripe_session_id: session.id,
              p_stripe_invoice_id: null,
              p_stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
            });

            if (recordErr) {
              throw new Error(`Failed to record subscription donation: ${recordErr.message}`);
            }
          }
        } else if (session.mode === 'payment' && session.metadata?.type === 'independent_direct_donation') {
          // Direct Standalone Charity Donation
          const charityId = session.metadata.charity_id;
          const donorUserId = session.metadata.user_id || null;
          const donationAmountCents = Number(session.metadata.amount_cents || session.amount_total || 0);

          if (charityId && donationAmountCents > 0) {
            const { error: directDonationErr } = await supabaseAdmin.rpc('record_donation_and_increment', {
              p_charity_id: charityId,
              p_user_id: donorUserId,
              p_amount_cents: donationAmountCents,
              p_donation_type: 'independent_direct',
              p_stripe_session_id: session.id,
              p_stripe_invoice_id: null,
              p_stripe_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
            });

            if (directDonationErr) {
              throw new Error(`Failed to record direct donation: ${directDonationErr.message}`);
            }
          }
        }
        break;
      }

      // =======================================================================
      // B. SUBSCRIPTION LIFECYCLE: UPDATED / CREATED
      // =======================================================================
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const stripeSubId = sub.id;

        let validStatus = sub.status;
        if (!['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'].includes(validStatus)) {
          validStatus = 'past_due';
        }

        const updates = {
          status: validStatus,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabaseAdmin
          .from('subscriptions')
          .update(updates)
          .eq('stripe_subscription_id', stripeSubId);

        if (updateErr) {
          throw new Error(`Failed to update subscription lifecycle: ${updateErr.message}`);
        }
        break;
      }

      // =======================================================================
      // C. SUBSCRIPTION LIFECYCLE: DELETED (CANCELED)
      // =======================================================================
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { error: delErr } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);

        if (delErr) {
          throw new Error(`Failed to mark subscription canceled: ${delErr.message}`);
        }
        break;
      }

      // =======================================================================
      // D. INVOICE PAID (Recurring Membership Renewal)
      // =======================================================================
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;

          const { data: subRow, error: subFetchErr } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, plan_tier')
            .eq('stripe_subscription_id', stripeSubId)
            .maybeSingle();

          if (subFetchErr) {
            throw new Error(`Failed to query subscription for recurring invoice: ${subFetchErr.message}`);
          }

          if (subRow) {
            // Re-activate if lapsed
            await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'active', updated_at: new Date().toISOString() })
              .eq('stripe_subscription_id', stripeSubId);

            // Look up user's designated charity
            const { data: pref } = await supabaseAdmin
              .from('charity_preferences')
              .select('charity_id, percentage')
              .eq('user_id', subRow.user_id)
              .maybeSingle();

            if (pref) {
              // Full fee base: ₹20,900 yearly (2,090,000 paise) / ₹2,090 monthly (209,000 paise)
              const baseCents = subRow.plan_tier === 'yearly' ? 2090000 : 209000;
              const renewalDonationCents = Math.round(baseCents * (pref.percentage / 100));

              // Record renewal donation split with database-enforced stripe_invoice_id idempotency
              const { error: renewalErr } = await supabaseAdmin.rpc('record_donation_and_increment', {
                p_charity_id: pref.charity_id,
                p_user_id: subRow.user_id,
                p_amount_cents: renewalDonationCents,
                p_donation_type: 'subscription_split',
                p_stripe_session_id: null,
                p_stripe_invoice_id: invoice.id,
                p_stripe_payment_id: typeof invoice.payment_intent === 'string' ? invoice.payment_intent : invoice.id,
              });

              if (renewalErr) {
                throw new Error(`Failed to record renewal donation: ${renewalErr.message}`);
              }
            }
          }
        }
        break;
      }

      // =======================================================================
      // E. INVOICE PAYMENT FAILED
      // =======================================================================
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const stripeSubId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
          const { error: failErr } = await supabaseAdmin
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', stripeSubId);

          if (failErr) {
            throw new Error(`Failed to mark subscription past_due: ${failErr.message}`);
          }
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    // Mark event as successfully completed in idempotency table ONLY AFTER side effects succeed
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', event.id);

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal processing error';
    console.error(`[stripe-webhook] Error processing event ${event.id}:`, errorMsg);

    // Record failure in idempotency table so it can be retried safely
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        status: 'failed',
        error_message: errorMsg,
      })
      .eq('id', event.id);

    return new Response(
      JSON.stringify({ error: 'Internal server error while processing webhook' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
