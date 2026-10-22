CREATE OR REPLACE FUNCTION public.activate_demo_subscription(
  p_plan_tier TEXT,
  p_charity_id UUID DEFAULT NULL,
  p_charity_percentage NUMERIC DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_existing_sub RECORD;
  v_result_sub RECORD;
  v_period_interval INTERVAL;
BEGIN

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: You must be logged in to activate a demo subscription.';
  END IF;

  IF p_plan_tier NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid plan tier: Expected "monthly" or "yearly".';
  END IF;

  IF p_charity_percentage < 10 OR p_charity_percentage > 50 THEN
    RAISE EXCEPTION 'Invalid charity percentage: Must be between 10%% and 50%%.';
  END IF;

  IF p_plan_tier = 'yearly' THEN
    v_period_interval := INTERVAL '1 year';
  ELSE
    v_period_interval := INTERVAL '1 month';
  END IF;

  IF p_charity_id IS NOT NULL THEN
    INSERT INTO public.charity_preferences (
      user_id,
      charity_id,
      percentage,
      updated_at
    ) VALUES (
      v_user_id,
      p_charity_id,
      p_charity_percentage,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      charity_id = EXCLUDED.charity_id,
      percentage = EXCLUDED.percentage,
      updated_at = NOW();
  END IF;

  SELECT * INTO v_existing_sub
  FROM public.subscriptions
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_sub.id IS NOT NULL THEN

    IF v_existing_sub.status = 'active' AND v_existing_sub.plan_tier = p_plan_tier THEN
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'message', 'Subscription is already active.',
        'subscription', row_to_json(v_existing_sub)
      );
    END IF;

    UPDATE public.subscriptions
    SET
      plan_tier = p_plan_tier,
      status = 'active',
      current_period_start = NOW(),
      current_period_end = NOW() + v_period_interval,
      cancel_at_period_end = FALSE,
      updated_at = NOW()
    WHERE id = v_existing_sub.id
    RETURNING * INTO v_result_sub;
  ELSE

    INSERT INTO public.subscriptions (
      user_id,
      plan_tier,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      stripe_customer_id,
      stripe_subscription_id,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      p_plan_tier,
      'active',
      NOW(),
      NOW() + v_period_interval,
      FALSE,
      NULL,
      NULL,
      NOW(),
      NOW()
    )
    RETURNING * INTO v_result_sub;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'message', 'Demo subscription activated successfully.',
    'subscription', row_to_json(v_result_sub)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.activate_demo_subscription(TEXT, UUID, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_demo_subscription(TEXT, UUID, NUMERIC) TO authenticated;
