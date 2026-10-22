DROP POLICY IF EXISTS "Public profiles are readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.profiles;

CREATE POLICY "Users read own profile or admin reads all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT
  id,
  full_name,
  avatar_url
FROM public.profiles;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    ALTER VIEW public.public_profiles OWNER TO postgres;
  END IF;
END $$;

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Users can update their own golf scores" ON public.golf_scores;
CREATE POLICY "Users can update their own golf scores"
  ON public.golf_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Public can view charities" ON public.charities;
CREATE POLICY "Public can view charities"
  ON public.charities FOR SELECT
  TO anon, authenticated
  USING (is_archived = FALSE OR public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count INTEGER;
BEGIN
  IF NEW.role <> OLD.role THEN

    IF OLD.role = 'admin' AND NEW.role <> 'admin' THEN

      SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin';
      IF v_admin_count <= 1 THEN
        RAISE EXCEPTION 'Action Prohibited: Cannot demote the sole administrator on the platform. At least one platform administrator must remain.';
      END IF;

      IF auth.uid() = OLD.id THEN
        RAISE EXCEPTION 'Action Prohibited: You cannot remove your own administrator privileges. Another administrator must perform this action.';
      END IF;
    END IF;

    IF public.is_admin() THEN
      RETURN NEW;
    END IF;

    IF current_setting('greenpulse.allow_initial_admin_bootstrap', true) = 'true' THEN
      RETURN NEW;
    END IF;

    IF current_user IN ('postgres', 'supabase_admin') AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_role_change();

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_handicap NUMERIC DEFAULT NULL,
  p_home_club TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_current_role TEXT;
  v_admin_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can manage user profiles.';
  END IF;

  v_admin_id := auth.uid();

  IF p_user_id = v_admin_id AND p_role IS NOT NULL AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'Action Prohibited: You cannot remove your own administrator privileges.';
  END IF;

  SELECT role INTO v_current_role FROM public.profiles WHERE id = p_user_id;
  IF v_current_role = 'admin' AND p_role IS NOT NULL AND p_role <> 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Action Prohibited: Cannot demote the sole administrator on the platform. At least one platform administrator must remain.';
    END IF;
  END IF;

  IF p_handicap IS NOT NULL AND (p_handicap < -10.0 OR p_handicap > 54.0) THEN
    RAISE EXCEPTION 'Invalid handicap: WHS index must be between -10.0 and 54.0.';
  END IF;

  IF p_role IS NOT NULL AND p_role NOT IN ('subscriber', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: Expected "subscriber" or "admin".';
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    handicap = COALESCE(p_handicap, handicap),
    home_club = COALESCE(p_home_club, home_club),
    role = COALESCE(p_role, role),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'updated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.admin_update_profile(UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'golf_scores'
      AND c.conname = 'unique_user_played_at'
  ) THEN
    ALTER TABLE public.golf_scores ADD CONSTRAINT unique_user_played_at UNIQUE (user_id, played_at);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.publish_monthly_draw(
  p_draw_month DATE,
  p_draw_title TEXT,
  p_draw_logic TEXT,
  p_winning_numbers INTEGER[],
  p_total_prize_pool_cents BIGINT,
  p_carried_over_jackpot_cents BIGINT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_draw_id UUID;
  v_existing_draw_id UUID;
  v_existing_status TEXT;
  v_tier5_base BIGINT;
  v_tier4_pot BIGINT;
  v_tier3_pot BIGINT;
  v_tier5_pot BIGINT;
  v_tier5_winners INTEGER := 0;
  v_tier4_winners INTEGER := 0;
  v_tier3_winners INTEGER := 0;
  v_tier5_payout BIGINT := 0;
  v_tier4_payout BIGINT := 0;
  v_tier3_payout BIGINT := 0;
  v_jackpot_rolled_over BOOLEAN;
  v_total_eligible INTEGER := 0;
  v_entry RECORD;
  v_matched_count INTEGER;
  v_match_tier TEXT;
  v_prize_cents BIGINT;
  v_entry_id UUID;
BEGIN

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can publish official monthly draws.';
  END IF;

  v_admin_id := auth.uid();

  IF p_draw_logic NOT IN ('random', 'algorithmic') THEN
    RAISE EXCEPTION 'Invalid draw logic: %. Expected "random" or "algorithmic".', p_draw_logic;
  END IF;

  IF NOT public.validate_winning_numbers(p_winning_numbers) THEN
    RAISE EXCEPTION 'Invalid winning numbers: Must provide exactly 5 unique integers between 1 and 45.';
  END IF;

  IF p_total_prize_pool_cents < 0 THEN
    RAISE EXCEPTION 'Invalid prize pool: Total prize pool cannot be negative.';
  END IF;

  IF COALESCE(p_carried_over_jackpot_cents, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid rollover: Carried over jackpot cannot be negative.';
  END IF;

  SELECT id, status INTO v_existing_draw_id, v_existing_status
  FROM public.draws
  WHERE draw_month = p_draw_month
  FOR UPDATE;

  IF v_existing_status IN ('published', 'closed') THEN
    RAISE EXCEPTION 'Draw for month % has already been published. Published draws cannot be overwritten.', p_draw_month;
  END IF;

  v_tier5_base := FLOOR(p_total_prize_pool_cents * 0.40);
  v_tier4_pot := FLOOR(p_total_prize_pool_cents * 0.35);
  v_tier3_pot := p_total_prize_pool_cents - v_tier5_base - v_tier4_pot;
  v_tier5_pot := v_tier5_base + COALESCE(p_carried_over_jackpot_cents, 0);

  CREATE TEMP TABLE temp_subscriber_tickets ON COMMIT DROP AS
  WITH latest_scores AS (
    SELECT
      gs.user_id,
      gs.score,
      ROW_NUMBER() OVER (PARTITION BY gs.user_id ORDER BY gs.played_at DESC, gs.created_at DESC) as rn
    FROM public.golf_scores gs
  ),
  distinct_active_scores AS (
    SELECT
      ls.user_id,
      array_agg(DISTINCT ls.score ORDER BY ls.score) as numbers_snapshot
    FROM latest_scores ls
    WHERE ls.rn <= 5
    GROUP BY ls.user_id
  )
  SELECT
    p.id as user_id,
    das.numbers_snapshot
  FROM public.profiles p
  INNER JOIN distinct_active_scores das ON das.user_id = p.id
  LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE (s.status = 'active' OR s.id IS NULL);

  SELECT COUNT(*) INTO v_total_eligible FROM temp_subscriber_tickets;

  CREATE TEMP TABLE temp_ticket_evaluations ON COMMIT DROP AS
  SELECT
    t.user_id,
    t.numbers_snapshot,
    (
      SELECT COUNT(*)
      FROM unnest(t.numbers_snapshot) val
      WHERE val = ANY(p_winning_numbers)
    ) as matched_count
  FROM temp_subscriber_tickets t;

  SELECT
    COALESCE(COUNT(*) FILTER (WHERE matched_count >= 5), 0),
    COALESCE(COUNT(*) FILTER (WHERE matched_count = 4), 0),
    COALESCE(COUNT(*) FILTER (WHERE matched_count = 3), 0)
  INTO v_tier5_winners, v_tier4_winners, v_tier3_winners
  FROM temp_ticket_evaluations;

  v_jackpot_rolled_over := (v_tier5_winners = 0);

  IF v_tier5_winners > 0 THEN
    v_tier5_payout := FLOOR(v_tier5_pot / v_tier5_winners);
  END IF;

  IF v_tier4_winners > 0 THEN
    v_tier4_payout := FLOOR(v_tier4_pot / v_tier4_winners);
  END IF;

  IF v_tier3_winners > 0 THEN
    v_tier3_payout := FLOOR(v_tier3_pot / v_tier3_winners);
  END IF;

  INSERT INTO public.draws (
    draw_title,
    draw_month,
    draw_logic,
    status,
    winning_numbers,
    total_eligible_subscribers,
    total_prize_pool_cents,
    carried_over_jackpot_cents,
    tier_5_pot_cents,
    tier_4_pot_cents,
    tier_3_pot_cents,
    tier_5_winners_count,
    tier_4_winners_count,
    tier_3_winners_count,
    jackpot_rolled_over,
    published_at,
    published_by
  ) VALUES (
    p_draw_title,
    p_draw_month,
    p_draw_logic,
    'published',
    p_winning_numbers,
    v_total_eligible,
    p_total_prize_pool_cents,
    COALESCE(p_carried_over_jackpot_cents, 0),
    v_tier5_pot,
    v_tier4_pot,
    v_tier3_pot,
    v_tier5_winners,
    v_tier4_winners,
    v_tier3_winners,
    v_jackpot_rolled_over,
    NOW(),
    v_admin_id
  )
  ON CONFLICT (draw_month) DO UPDATE SET
    draw_title = EXCLUDED.draw_title,
    draw_logic = EXCLUDED.draw_logic,
    status = 'published',
    winning_numbers = EXCLUDED.winning_numbers,
    total_eligible_subscribers = EXCLUDED.total_eligible_subscribers,
    total_prize_pool_cents = EXCLUDED.total_prize_pool_cents,
    carried_over_jackpot_cents = EXCLUDED.carried_over_jackpot_cents,
    tier_5_pot_cents = EXCLUDED.tier_5_pot_cents,
    tier_4_pot_cents = EXCLUDED.tier_4_pot_cents,
    tier_3_pot_cents = EXCLUDED.tier_3_pot_cents,
    tier_5_winners_count = EXCLUDED.tier_5_winners_count,
    tier_4_winners_count = EXCLUDED.tier_4_winners_count,
    tier_3_winners_count = EXCLUDED.tier_3_winners_count,
    jackpot_rolled_over = EXCLUDED.jackpot_rolled_over,
    published_at = NOW(),
    published_by = EXCLUDED.published_by
  WHERE public.draws.status NOT IN ('published', 'closed')
  RETURNING id INTO v_draw_id;

  FOR v_entry IN SELECT * FROM temp_ticket_evaluations LOOP
    v_matched_count := v_entry.matched_count;
    v_match_tier := 'none';
    v_prize_cents := 0;

    IF v_matched_count >= 5 THEN
      v_match_tier := 'tier_5';
      v_prize_cents := v_tier5_payout;
    ELSIF v_matched_count = 4 THEN
      v_match_tier := 'tier_4';
      v_prize_cents := v_tier4_payout;
    ELSIF v_matched_count = 3 THEN
      v_match_tier := 'tier_3';
      v_prize_cents := v_tier3_payout;
    END IF;

    INSERT INTO public.draw_entries (
      draw_id,
      user_id,
      numbers_snapshot,
      matched_count,
      match_tier,
      prize_awarded_cents
    ) VALUES (
      v_draw_id,
      v_entry.user_id,
      v_entry.numbers_snapshot,
      v_matched_count,
      v_match_tier,
      v_prize_cents
    )
    ON CONFLICT (draw_id, user_id) DO UPDATE SET
      numbers_snapshot = EXCLUDED.numbers_snapshot,
      matched_count = EXCLUDED.matched_count,
      match_tier = EXCLUDED.match_tier,
      prize_awarded_cents = EXCLUDED.prize_awarded_cents
    RETURNING id INTO v_entry_id;

    IF v_match_tier IN ('tier_5', 'tier_4', 'tier_3') THEN
      INSERT INTO public.winner_claims (
        draw_id,
        user_id,
        draw_entry_id,
        prize_amount_cents,
        match_tier,
        status
      ) VALUES (
        v_draw_id,
        v_entry.user_id,
        v_entry_id,
        v_prize_cents,
        v_match_tier,
        'pending_proof'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_admin_id,
    'publish_monthly_draw',
    'draws',
    v_draw_id::text,
    jsonb_build_object(
      'draw_month', p_draw_month,
      'winning_numbers', p_winning_numbers,
      'total_eligible_subscribers', v_total_eligible,
      'tier_5_winners', v_tier5_winners,
      'tier_4_winners', v_tier4_winners,
      'tier_3_winners', v_tier3_winners,
      'jackpot_rolled_over', v_jackpot_rolled_over
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'draw_id', v_draw_id,
    'draw_month', p_draw_month,
    'winning_numbers', p_winning_numbers,
    'total_eligible_subscribers', v_total_eligible,
    'tier_5_winners', v_tier5_winners,
    'tier_4_winners', v_tier4_winners,
    'tier_3_winners', v_tier3_winners,
    'jackpot_rolled_over', v_jackpot_rolled_over,
    'tier_5_payout_per_winner_cents', v_tier5_payout,
    'tier_4_payout_per_winner_cents', v_tier4_payout,
    'tier_3_payout_per_winner_cents', v_tier3_payout
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.publish_monthly_draw(DATE, TEXT, TEXT, INTEGER[], BIGINT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_monthly_draw(DATE, TEXT, TEXT, INTEGER[], BIGINT, BIGINT) TO authenticated, service_role;

ALTER TABLE public.stripe_webhook_events
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.stripe_webhook_events
  ALTER COLUMN processed_at DROP NOT NULL;

ALTER TABLE public.stripe_webhook_events
  ALTER COLUMN processed_at DROP DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'stripe_webhook_events'
      AND c.conname = 'chk_stripe_webhook_events_status'
  ) THEN
    ALTER TABLE public.stripe_webhook_events
      ADD CONSTRAINT chk_stripe_webhook_events_status
      CHECK (status IN ('processing', 'completed', 'failed'));
  END IF;
END $$;

ALTER TABLE public.donation_ledger
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_donation_ledger_stripe_invoice
  ON public.donation_ledger(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_donation_and_increment(
  p_charity_id UUID,
  p_user_id UUID,
  p_amount_cents BIGINT,
  p_donation_type TEXT,
  p_stripe_session_id TEXT DEFAULT NULL,
  p_stripe_invoice_id TEXT DEFAULT NULL,
  p_stripe_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_total BIGINT;
  v_ledger_id UUID;
BEGIN

  IF auth.role() <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only payment services or platform administrators can record donations.';
  END IF;

  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Donation amount must be greater than zero.';
  END IF;

  IF p_stripe_session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.donation_ledger WHERE stripe_session_id = p_stripe_session_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Session already processed');
  END IF;

  IF p_stripe_invoice_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.donation_ledger WHERE stripe_invoice_id = p_stripe_invoice_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'message', 'Invoice already processed');
  END IF;

  INSERT INTO public.donation_ledger (
    charity_id,
    user_id,
    amount_cents,
    donation_type,
    stripe_session_id,
    stripe_invoice_id,
    stripe_payment_id,
    created_at
  ) VALUES (
    p_charity_id,
    p_user_id,
    p_amount_cents,
    p_donation_type,
    p_stripe_session_id,
    p_stripe_invoice_id,
    p_stripe_payment_id,
    NOW()
  ) RETURNING id INTO v_ledger_id;

  UPDATE public.charities
  SET
    total_raised_cents = total_raised_cents + p_amount_cents,
    donor_count = donor_count + 1,
    updated_at = NOW()
  WHERE id = p_charity_id
  RETURNING total_raised_cents INTO v_new_total;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Charity with ID % not found.', p_charity_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'ledger_id', v_ledger_id,
    'new_total_cents', v_new_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.record_donation_and_increment(UUID, UUID, BIGINT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_donation_and_increment(UUID, UUID, BIGINT, TEXT, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_charity_raised(
  target_charity_id UUID,
  amount_to_add BIGINT
)
RETURNS BIGINT AS $$
DECLARE
  v_new_total BIGINT;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Charity totals can only be updated by trusted payment services or platform administrators.';
  END IF;

  IF amount_to_add <= 0 THEN
    RAISE EXCEPTION 'amount_to_add must be greater than zero.';
  END IF;

  UPDATE public.charities
  SET
    total_raised_cents = total_raised_cents + amount_to_add,
    updated_at = NOW()
  WHERE id = target_charity_id
  RETURNING total_raised_cents INTO v_new_total;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Charity with ID % not found.', target_charity_id;
  END IF;

  RETURN v_new_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.increment_charity_raised(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_charity_raised(UUID, BIGINT) TO service_role;
