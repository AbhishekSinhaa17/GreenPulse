
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stripe webhook events"
  ON public.stripe_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.donation_ledger 
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE;

ALTER TABLE public.donation_ledger 
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE public.donation_ledger 
  DROP CONSTRAINT IF EXISTS donation_ledger_donation_type_check;

ALTER TABLE public.donation_ledger 
  ADD CONSTRAINT donation_ledger_donation_type_check 
  CHECK (donation_type IN ('subscription_split', 'independent_direct', 'rollover_transfer'));

CREATE INDEX IF NOT EXISTS idx_donation_ledger_stripe_session 
  ON public.donation_ledger(stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_donation_ledger_user_charity 
  ON public.donation_ledger(user_id, charity_id);


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' AND policyname = 'Users can read their own subscriptions'
  ) THEN
    CREATE POLICY "Users can read their own subscriptions"
      ON public.subscriptions FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'donation_ledger' AND policyname = 'Users view their own donations'
  ) THEN
    CREATE POLICY "Users view their own donations"
      ON public.donation_ledger FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR public.is_admin());
  END IF;
END $$;
