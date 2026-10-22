# GreenPulse — Stripe Setup & Production Verification Guide

**Project:** GreenPulse  
**Tagline:** *Play with purpose. Create lasting impact.*  
**Phase:** 4 — Stripe Subscriptions, Webhooks & Charity Donations  
**Author:** Senior Full-Stack Engineer, Product Designer, Database Architect & QA  
**Date:** October 2026  

---

> [!IMPORTANT]
> **Zero Credential Exposure Rule**: Never paste Stripe Secret Keys (`sk_test_...`), Webhook Signing Secrets (`whsec_...`), or Supabase Service-Role Keys into chat prompts, commit histories, or frontend configuration files. All private keys must be configured directly within the Supabase Dashboard / CLI or Stripe Developer Portal.

---

## 1. Stripe Products & Recurring Prices Setup (Test Mode)

Log in to the [Stripe Dashboard](https://dashboard.stripe.com/) and ensure **Test Mode** is toggled ON (top right).

### A. Monthly Membership Product
1. Navigate to **Product Catalog** -> **Add Product**.
2. **Product Name:** `GreenPulse Monthly Membership`
3. **Description:** `Monthly golfer subscription: Stableford tracking (1-45), monthly number-match prize draw ticket, and min 10% charity contribution.`
4. **Pricing Information:**
   - **Pricing model:** Standard pricing
   - **Price:** `£19.00`
   - **Currency:** `GBP - British Pound`
   - **Billing period:** `Monthly`
5. Save the product and copy the generated Price ID (e.g. `price_1Nxxxxxxxxxxxxxx`).

### B. Yearly Membership Product
1. Add a second product: **Product Name:** `GreenPulse Yearly Membership`
2. **Description:** `Yearly golfer subscription: 12 monthly draw tickets, 2 months free (£38 annual savings), and continuous charity funding.`
3. **Pricing Information:**
   - **Pricing model:** Standard pricing
   - **Price:** `£190.00` (PRD § 04: includes £38 savings over monthly)
   - **Currency:** `GBP - British Pound`
   - **Billing period:** `Yearly`
5. Save the product and copy the generated Price ID (e.g. `price_1Myyyyyyyyyyyyyy`).

*(Note: If you run checkouts before configuring these specific price IDs, GreenPulse's Edge Function automatically creates inline price items at £19.00/mo and £190.00/yr dynamically).*

---

## 2. Server-Side Edge Functions & Secrets Configuration

All privileged payment and subscription operations run in trusted Supabase Edge Functions:
- `supabase/functions/create-checkout-session`
- `supabase/functions/stripe-webhook`

### Configure Secrets in Supabase

Using the Supabase CLI or the [Supabase Dashboard](https://supabase.com/dashboard/project/lagbukwqltcoaoqxtsnv/settings/functions):

#### Via Supabase CLI:
```bash
# Link to your live Supabase project
supabase link --project-ref lagbukwqltcoaoqxtsnv

# Set secrets for the Edge Functions environment
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
supabase secrets set STRIPE_PRICE_MONTHLY=price_1Nxxxxxxxxxxxxxx
supabase secrets set STRIPE_PRICE_YEARLY=price_1Myyyyyyyyyyyyyy
supabase secrets set CLIENT_APP_URL=http://localhost:5173
```

#### Via Supabase Web Dashboard:
1. Go to **Settings** -> **Edge Functions** -> **Secrets**.
2. Add the following secrets:
   - `STRIPE_SECRET_KEY`: Your Stripe test secret key (`sk_test_...`)
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret (`whsec_...`)
   - `STRIPE_PRICE_MONTHLY`: Price ID for monthly plan (optional, defaults to inline £19.00)
   - `STRIPE_PRICE_YEARLY`: Price ID for yearly plan (optional, defaults to inline £190.00)
   - `CLIENT_APP_URL`: Your frontend application root (e.g., `http://localhost:5173` or your production domain)

---

## 3. Deploying Supabase Edge Functions

Run the following commands from the repository root:

```bash
# Deploy the Checkout Session generator
supabase functions deploy create-checkout-session --no-verify-jwt

# Deploy the Webhook listener
supabase functions deploy stripe-webhook --no-verify-jwt
```

*(Note: JWT verification is handled programmatically inside the functions to support custom CORS preflight headers and signature verification).*

---

## 4. Registering Webhook Endpoint & Event Selection

### A. Local Testing (Using Stripe CLI)
For rapid local testing against your local dev environment:

1. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli).
2. Authenticate:
   ```bash
   stripe login
   ```
3. Forward webhook events to your Supabase Edge Function:
   ```bash
   stripe listen --forward-to https://lagbukwqltcoaoqxtsnv.supabase.co/functions/v1/stripe-webhook
   ```
4. Copy the webhook signing secret printed by the CLI (`whsec_...`) and save it to your Supabase secrets (`STRIPE_WEBHOOK_SECRET`).

### B. Remote / Production Webhook Endpoint
1. Go to **Stripe Dashboard** -> **Developers** -> **Webhooks** -> **Add endpoint**.
2. **Endpoint URL:** `https://lagbukwqltcoaoqxtsnv.supabase.co/functions/v1/stripe-webhook`
3. **Events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Click **Add endpoint**.
5. Reveal the **Signing secret** (`whsec_...`) and configure it in Supabase Secrets as `STRIPE_WEBHOOK_SECRET`.

---

## 5. End-to-End Test Checkout & Verification Procedures

### Test 1: Successful Monthly Subscription Checkout
1. Open GreenPulse at `http://localhost:5173/subscribe`.
2. Ensure you are signed in (create an account at `/signup` if needed).
3. Select **Monthly Plan (£19/mo)**.
4. Select a charity (e.g., *Fairway Green Youth Foundation*) and set the contribution slider (e.g., 15%).
5. Click **Proceed to Stripe Checkout (£19)**.
6. On the hosted Stripe Checkout page, enter Stripe test credentials:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** `123`
   - **Name:** Any test name
7. Click **Subscribe**.
8. Stripe will redirect back to `/subscribe/success?session_id=cs_test_...`.
9. The success page will poll PostgreSQL and display:
   - Green badge: **Payment Confirmed**
   - Confetti animation
   - Verified active status and button to Golfer Workspace
10. Verify in PostgreSQL:
   - `subscriptions` table has a new record with `status = 'active'`, `plan_tier = 'monthly'`.
   - `charity_preferences` table has `percentage = 15`.
   - `donation_ledger` table has a row with `donation_type = 'subscription_split'`, `amount_cents = 285` (15% of £19.00), and matching `stripe_session_id`.
   - `stripe_webhook_events` has recorded the event ID (`evt_...`).

### Test 2: Successful Standalone Charity Donation
1. Navigate to `/charities`.
2. Find a charity card (e.g. *Open Course Conservation Trust*) and click **Donate**.
3. Select a preset (e.g., `£25`) or enter a custom amount (e.g., `£50`).
4. Click **Proceed to Stripe Checkout**.
5. Complete payment using test card `4242 4242 4242 4242`.
6. Redirects to `/subscribe/success?session_id=cs_test_...&type=donation`.
7. Verify in PostgreSQL:
   - `donation_ledger` has a new row with `donation_type = 'independent_direct'`, `amount_cents = 2500` (or 5000), and matching `stripe_session_id`.
   - `charities.total_raised_cents` is incremented accordingly.

### Test 3: Failed Payment Simulation
1. At `/subscribe`, proceed to checkout.
2. In Stripe Checkout, enter test card for declined charges:
   - **Card Number:** `4000 0027 6000 3184` (Card Declined)
3. Submit payment; Stripe displays decline error immediately and prevents completion.
4. If an invoice renewal fails (`invoice.payment_failed` trigger), GreenPulse updates subscription `status = 'past_due'`.

### Test 4: Cancelled Checkout
1. At `/subscribe` or `/charities` donate modal, proceed to Stripe Checkout.
2. Click the back arrow or "Cancel and return to GreenPulse".
3. Browser redirects to `/subscribe/cancel`.
4. Page renders: **Checkout Was Cancelled** with clear explanations that no charges occurred.

---

## 6. Pending Pre-Requisites & Manual User Action Checklist

To enable live checkout and webhook delivery in your project:

1. [ ] **Apply Migration 3**: Run [`supabase/migrations/20261021000002_stripe_and_webhooks.sql`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/supabase/migrations/20261021000002_stripe_and_webhooks.sql) in your Supabase SQL Editor.
2. [ ] **Deploy Edge Functions**: Execute `supabase functions deploy create-checkout-session` and `supabase functions deploy stripe-webhook`.
3. [ ] **Configure Stripe Secrets**: Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Supabase Secrets.
4. [ ] **Register Webhook Endpoint**: Add `https://lagbukwqltcoaoqxtsnv.supabase.co/functions/v1/stripe-webhook` in the Stripe Dashboard.
5. [ ] **Unresolved Google OAuth Status**: Real interactive Google OAuth sign-in and the profile migration (`20261021000001_google_oauth_and_profiles.sql`) remain pending manual action in your Supabase SQL editor as noted in Phase 3.
