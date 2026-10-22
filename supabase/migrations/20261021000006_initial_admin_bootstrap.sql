CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> OLD.role THEN

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

CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_identifier TEXT;
  v_user_id UUID;
  v_email TEXT;
  v_existing_admin RECORD;
BEGIN

  v_clean_identifier := trim(p_identifier);
  IF v_clean_identifier IS NULL OR length(v_clean_identifier) = 0 THEN
    RAISE EXCEPTION 'Invalid identifier: Must provide a valid user email address or user UUID.';
  END IF;

  SELECT id, email INTO v_existing_admin
  FROM public.profiles
  WHERE role = 'admin'
  LIMIT 1;

  SELECT id, email INTO v_user_id, v_email
  FROM auth.users
  WHERE (v_clean_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = v_clean_identifier::UUID)
     OR LOWER(email) = LOWER(v_clean_identifier)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT id, email INTO v_user_id, v_email
    FROM public.profiles
    WHERE (v_clean_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = v_clean_identifier::UUID)
       OR LOWER(email) = LOWER(v_clean_identifier)
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Bootstrap Failed: User "%" was not found in auth.users. The designated initial administrator must register or sign in via Supabase Auth first.', v_clean_identifier;
  END IF;

  IF v_existing_admin.id IS NOT NULL THEN
    IF v_existing_admin.id = v_user_id THEN
      RETURN jsonb_build_object(
        'success', true,
        'status', 'already_admin',
        'user_id', v_user_id,
        'email', v_email,
        'message', 'Designated user is already configured as the platform administrator (idempotent).'
      );
    ELSE
      RAISE EXCEPTION 'Bootstrap Prohibited: An administrator (%) already exists on this platform. Initial bootstrap cannot be reused to promote additional users.', v_existing_admin.email;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    v_user_id,
    v_email,
    split_part(v_email, '@', 1),
    'subscriber'
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM set_config('greenpulse.allow_initial_admin_bootstrap', 'true', true);

  UPDATE public.profiles
  SET
    role = 'admin',
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'promoted',
    'user_id', v_user_id,
    'email', v_email,
    'role', 'admin',
    'message', 'Initial platform administrator successfully bootstrapped.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO service_role;
