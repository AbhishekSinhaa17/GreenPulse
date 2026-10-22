
CREATE OR REPLACE FUNCTION public.validate_winning_numbers(p_numbers INTEGER[])
RETURNS BOOLEAN AS $$
DECLARE
  v_num INTEGER;
  v_seen INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
  IF p_numbers IS NULL OR array_length(p_numbers, 1) <> 5 THEN
    RETURN FALSE;
  END IF;

  FOREACH v_num IN ARRAY p_numbers LOOP
    IF v_num < 1 OR v_num > 45 THEN
      RETURN FALSE;
    END IF;
    IF v_num = ANY(v_seen) THEN
      RETURN FALSE; -- Duplicates not allowed
    END IF;
    v_seen := array_append(v_seen, v_num);
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Server-side atomic draw publishing procedure (Admin only)
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
  -- 1. Verify caller is platform administrator
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can publish official monthly draws.';
  END IF;

  v_admin_id := auth.uid();

  -- 2. Validate draw logic
  IF p_draw_logic NOT IN ('random', 'algorithmic') THEN
    RAISE EXCEPTION 'Invalid draw logic: %. Expected "random" or "algorithmic".', p_draw_logic;
  END IF;

  -- 3. Validate winning numbers
  IF NOT public.validate_winning_numbers(p_winning_numbers) THEN
    RAISE EXCEPTION 'Invalid winning numbers: Must provide exactly 5 unique integers between 1 and 45.';
  END IF;

  -- 4. Verify no published draw already exists for this month (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.draws
    WHERE draw_month = p_draw_month AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'Draw for month % has already been published. Published draws cannot be overwritten.', p_draw_month;
  END IF;

  -- 5. Calculate pots according to PRD § 07 (40% / 35% / 25%)
  v_tier5_base := FLOOR(p_total_prize_pool_cents * 0.40);
  v_tier4_pot := FLOOR(p_total_prize_pool_cents * 0.35);
  v_tier3_pot := p_total_prize_pool_cents - v_tier5_base - v_tier4_pot;
  v_tier5_pot := v_tier5_base + COALESCE(p_carried_over_jackpot_cents, 0);

  -- 6. Collect active subscribers with their distinct latest scores
  -- A temporary table or CTE to count tier matches
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
  -- Eligible if subscription is active or user has entered scores
  WHERE (s.status = 'active' OR s.id IS NULL);

  SELECT COUNT(*) INTO v_total_eligible FROM temp_subscriber_tickets;

  -- 7. Count match tiers across tickets
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

  -- Calculate individual payouts
  IF v_tier5_winners > 0 THEN
    v_tier5_payout := FLOOR(v_tier5_pot / v_tier5_winners);
  END IF;

  IF v_tier4_winners > 0 THEN
    v_tier4_payout := FLOOR(v_tier4_pot / v_tier4_winners);
  END IF;

  IF v_tier3_winners > 0 THEN
    v_tier3_payout := FLOOR(v_tier3_pot / v_tier3_winners);
  END IF;

  -- 8. Insert or update the official draw record
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
  RETURNING id INTO v_draw_id;

  -- 9. Insert draw entries and winner claims
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

    -- Upsert draw entry
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

    -- If this is a winning ticket, create a pending winner claim
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

  -- 10. Return full publication summary
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
