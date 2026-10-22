-- ==============================================================================
-- GREENPULSE MIGRATION: SECURE INITIAL ADMIN BOOTSTRAP
-- File: supabase/migrations/20261021000006_initial_admin_bootstrap.sql
-- Description:
--   1. Updates prevent_unauthorized_role_change() to allow initial bootstrap
--      when executed by trusted procedures or database owner when zero admins exist.
--   2. Provides public.bootstrap_initial_admin(p_identifier) to securely promote
--      the initial verified owner once, idempotently, with strict RBAC guards.
--   3. Revokes execution from PUBLIC, anon, and authenticated roles so client
--      users cannot invoke the bootstrap function via PostgREST.
-- ==============================================================================

-- 1. UPDATE ROLE PROTECTION TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    -- A. Allow if caller is an existing verified admin (via authenticated session auth.uid())
    IF public.is_admin() THEN
      RETURN NEW;
    END IF;

    -- B. Allow if explicitly authorized by trusted bootstrap session flag during one-time initial setup
    IF current_setting('greenpulse.allow_initial_admin_bootstrap', true) = 'true' THEN
      RETURN NEW;
    END IF;

    -- C. Allow database owner (postgres / supabase_admin) ONLY if NO administrator currently exists on the platform
    IF current_user IN ('postgres', 'supabase_admin') AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
      RETURN NEW;
    END IF;

    -- Otherwise, strictly reject all unauthorized role changes
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. ONE-TIME INITIAL ADMIN BOOTSTRAP PROCEDURE
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
  -- A. Sanitize and validate input
  v_clean_identifier := trim(p_identifier);
  IF v_clean_identifier IS NULL OR length(v_clean_identifier) = 0 THEN
    RAISE EXCEPTION 'Invalid identifier: Must provide a valid user email address or user UUID.';
  END IF;

  -- B. Check if any administrator already exists on the platform
  SELECT id, email INTO v_existing_admin
  FROM public.profiles
  WHERE role = 'admin'
  LIMIT 1;

  -- C. Locate target user in auth.users or public.profiles
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

  -- D. Enforce one-time constraint:
  -- If an administrator already exists, only permit execution if it is the SAME user (idempotent)
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

  -- E. Ensure profile record exists
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    v_user_id,
    v_email,
    split_part(v_email, '@', 1),
    'subscriber'
  )
  ON CONFLICT (id) DO NOTHING;

  -- F. Set transaction-scoped authorization flag to satisfy trigger
  PERFORM set_config('greenpulse.allow_initial_admin_bootstrap', 'true', true);

  -- G. Promote target user to administrator
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

-- 3. STRICT PRIVILEGE RESTRICTIONS
-- Revoke execution from PUBLIC, anon, and authenticated so client users cannot call this via PostgREST
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM authenticated;

-- Grant execution strictly to database superuser / project owner and service_role
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO service_role;
