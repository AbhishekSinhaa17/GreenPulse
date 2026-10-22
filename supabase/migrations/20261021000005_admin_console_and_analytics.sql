
ALTER TABLE public.charities
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.safe_delete_charity(p_charity_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_has_pledges BOOLEAN;
  v_has_donations BOOLEAN;
  v_charity_name TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can manage charities.';
  END IF;

  SELECT name INTO v_charity_name
  FROM public.charities
  WHERE id = p_charity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Charity with ID % not found.', p_charity_id;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.charity_preferences WHERE charity_id = p_charity_id) INTO v_has_pledges;
  SELECT EXISTS (SELECT 1 FROM public.donation_ledger WHERE charity_id = p_charity_id) INTO v_has_donations;

  IF v_has_pledges OR v_has_donations THEN
    UPDATE public.charities
    SET
      is_archived = TRUE,
      is_featured = FALSE,
      updated_at = NOW()
    WHERE id = p_charity_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'archived',
      'message', format('Charity "%s" has existing subscriber pledges or donation records and was safely archived instead of deleted.', v_charity_name)
    );
  ELSE
    -- Safe to permanently delete (also cleans up events via CASCADE)
    DELETE FROM public.charities WHERE id = p_charity_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'deleted',
      'message', format('Charity "%s" was permanently deleted.', v_charity_name)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Admin Profile Update RPC with Self-Demotion Protection (PRD § 11.1)
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
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can manage user profiles.';
  END IF;

  v_admin_id := auth.uid();

  -- Prevent self-demotion
  IF p_user_id = v_admin_id AND p_role IS NOT NULL AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'Action Prohibited: You cannot remove your own administrator privileges.';
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

-- 4. Platform Analytics Aggregation RPC (PRD § 11.5)
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS JSONB AS $$
DECLARE
  v_total_users BIGINT;
  v_total_subscribers BIGINT;
  v_sub_breakdown JSONB;
  v_total_draws BIGINT;
  v_total_prize_pool BIGINT;
  v_total_rollovers BIGINT;
  v_total_charities BIGINT;
  v_total_donations BIGINT;
  v_claims_status JSONB;
  v_claims_tier JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can access analytics.';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  SELECT COUNT(*) INTO v_total_subscribers FROM public.subscriptions WHERE status = 'active';

  -- Subscription status breakdown
  SELECT jsonb_object_agg(status, cnt) INTO v_sub_breakdown
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM public.subscriptions
    GROUP BY status
  ) s;

  -- Draws stats
  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(total_prize_pool_cents), 0),
    COALESCE(COUNT(*) FILTER (WHERE jackpot_rolled_over = TRUE), 0)
  INTO v_total_draws, v_total_prize_pool, v_total_rollovers
  FROM public.draws
  WHERE status = 'published';

  -- Charities stats
  SELECT COUNT(*) INTO v_total_charities FROM public.charities WHERE is_archived = FALSE;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_donations FROM public.donation_ledger;

  -- Claims breakdown
  SELECT jsonb_object_agg(status, cnt) INTO v_claims_status
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM public.winner_claims
    GROUP BY status
  ) cs;

  SELECT jsonb_object_agg(match_tier, cnt) INTO v_claims_tier
  FROM (
    SELECT match_tier, COUNT(*) as cnt
    FROM public.winner_claims
    GROUP BY match_tier
  ) ct;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'total_subscribers', v_total_subscribers,
    'subscription_breakdown', COALESCE(v_sub_breakdown, '{}'::jsonb),
    'total_draws', v_total_draws,
    'total_prize_pool_cents', v_total_prize_pool,
    'total_rollovers', v_total_rollovers,
    'total_charities', v_total_charities,
    'total_donations_recorded_cents', v_total_donations,
    'claims_by_status', COALESCE(v_claims_status, '{}'::jsonb),
    'claims_by_tier', COALESCE(v_claims_tier, '{}'::jsonb),
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
