-- ==============================================================================
-- GreenPulse — Migration 20261021000001: Google OAuth & Profile Auto-Provisioning
-- Description:
--   1. Ensures an idempotent trigger on auth.users to auto-create public.profiles
--      from OAuth metadata (full_name/name, avatar_url/picture, email).
--   2. Enforces that public signup/OAuth ALWAYS assigns the 'subscriber' role.
--   3. Adds an RLS INSERT policy on public.profiles for authenticated users.
--   4. Prevents unauthorized role tampering via trigger.
-- ==============================================================================

-- 1. TRIGGER FUNCTION: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract full name from various OAuth metadata formats (Google provides 'name' and 'full_name')
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Golfer'
  );

  -- Extract avatar URL from various OAuth metadata formats (Google provides 'picture' or 'avatar_url')
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  -- Idempotent upsert into public.profiles
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_full_name,
    v_avatar_url,
    'subscriber' -- STRICT SECURITY: Never grant admin role on creation
  )
  ON CONFLICT (id) DO UPDATE
  SET
    -- Only update if missing in existing profile; do NOT overwrite user customizations
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' OR public.profiles.full_name = 'Golfer'
      THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. RLS INSERT POLICY ON public.profiles (Defense-in-depth)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND
    (role IS NULL OR role = 'subscriber')
  );

-- 3. TRIGGER FUNCTION: prevent_unauthorized_role_change
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only existing administrators can alter the role column
  IF NEW.role <> OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_role_change();
