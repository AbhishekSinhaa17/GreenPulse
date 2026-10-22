# GreenPulse — Initial Admin Bootstrap & Role Security Guide

**Document Version:** 1.0  
**Migration:** `supabase/migrations/20261021000006_initial_admin_bootstrap.sql`  
**Security Status:** Production Ready (RBAC Hardened)

---

## 1. Root Cause Analysis: The Bootstrap Deadlock

In previous migrations (`20261021000000` and `20261021000001`), user profiles were protected by the `prevent_unauthorized_role_change()` trigger:

```sql
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

And `public.is_admin()` evaluates:
```sql
SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin';
```

### Why Initial Admin Setup Failed:
1. When running an `UPDATE` in the **Supabase Dashboard SQL Editor** or via direct `psql`, `auth.uid()` is `NULL`.
2. As a result, `public.is_admin()` returned `FALSE`.
3. The trigger immediately aborted the update with error `P0001: Unauthorized: Only administrators can modify user roles.`.
4. Even worse, on a fresh platform with **zero administrators**, no user could ever become an administrator because doing so required an administrator to already exist (a circular deadlock).

---

## 2. Security Solution & Defense-in-Depth

Migration `20261021000006_initial_admin_bootstrap.sql` resolves this deadlock safely without weakening security for normal application users.

### A. Updated Trigger Logic (`prevent_unauthorized_role_change`)
The trigger now evaluates three strictly defined authorization paths before blocking a role change:

```sql
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    -- 1. Allow if caller is an existing verified admin (via authenticated session auth.uid())
    IF public.is_admin() THEN
      RETURN NEW;
    END IF;

    -- 2. Allow if explicitly authorized by trusted bootstrap session flag during one-time setup
    IF current_setting('greenpulse.allow_initial_admin_bootstrap', true) = 'true' THEN
      RETURN NEW;
    END IF;

    -- 3. Allow database owner (postgres / supabase_admin) ONLY if NO administrator currently exists
    IF current_user IN ('postgres', 'supabase_admin') AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
      RETURN NEW;
    END IF;

    -- Otherwise, strictly reject all unauthorized role changes
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles.';
  END IF;
  RETURN NEW;
END;
$$;
```

### B. Dedicated Bootstrap Procedure (`public.bootstrap_initial_admin`)
A hardened, one-time bootstrap RPC was created with the following guarantees:
1. **Verified Identity Check:** The designated email or UUID is checked against `auth.users` to confirm the user has genuinely authenticated.
2. **One-Time Promotion Constraint:** The procedure checks if an administrator already exists on the platform.
   - If **zero admins exist**: It sets the transaction-scoped flag and promotes the user.
   - If the user is **already the admin**: It completes **idempotently** with status `already_admin`.
   - If **another administrator already exists**: It raises `Bootstrap Prohibited: An administrator (email) already exists on this platform. Initial bootstrap cannot be reused to promote additional users.`.
3. **Strict Privilege Revocation:**
   ```sql
   REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM PUBLIC;
   REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM anon;
   REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM authenticated;

   GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO postgres;
   GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO service_role;
   ```
   **Why this matters:** Because execution is revoked from `anon` and `authenticated`, regular web clients connecting through PostgREST cannot call this function. It can only be executed by the database owner (`postgres`) in the SQL Editor or a trusted backend task (`service_role`).

---

## 3. Step-by-Step Operator Guide

Follow these steps to establish the initial platform administrator account safely.

### Step 1: Create the User Account
1. Open the GreenPulse web application (e.g. at `http://localhost:5173/login` or your production domain).
2. Register or sign in the account you want to designate as the initial administrator (using email/password or Google OAuth).
3. Confirm that the account has been created in Supabase Auth.

---

### Step 2: Apply Migration `20261021000006` (If Not Yet Applied)
If you manage migrations via the Supabase CLI:
```bash
supabase db push
```

If applying manually via the **Supabase Dashboard**:
1. Navigate to **SQL Editor** in your Supabase project.
2. Open the file [20261021000006_initial_admin_bootstrap.sql](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/supabase/migrations/20261021000006_initial_admin_bootstrap.sql).
3. Paste the contents into the SQL Editor and click **Run**.

---

### Step 3: Execute Initial Admin Bootstrap
In the **Supabase SQL Editor**, execute:

```sql
-- Replace with the exact email of your designated administrator account
SELECT public.bootstrap_initial_admin('your-admin-email@example.com');
```

*(Alternatively, you can provide the user's UUID instead of email)*:
```sql
SELECT public.bootstrap_initial_admin('bba35b26-4d37-4182-b5ea-cbe4bea662c1');
```

#### Expected Successful Output:
```json
{
  "success": true,
  "status": "promoted",
  "user_id": "bba35b26-4d37-4182-b5ea-cbe4bea662c1",
  "email": "your-admin-email@example.com",
  "role": "admin",
  "message": "Initial platform administrator successfully bootstrapped."
}
```

If you re-run the same command later, it executes idempotently without error:
```json
{
  "success": true,
  "status": "already_admin",
  "user_id": "bba35b26-4d37-4182-b5ea-cbe4bea662c1",
  "email": "your-admin-email@example.com",
  "message": "Designated user is already configured as the platform administrator (idempotent)."
}
```

---

### Step 4: Verify Admin Access
1. In the Supabase SQL Editor, verify that the profile is recorded as `'admin'`:
   ```sql
   SELECT id, email, full_name, role, updated_at
   FROM public.profiles
   WHERE role = 'admin';
   ```
2. In the web application, log in with the administrator credentials and navigate to:
   `http://localhost:5173/admin`
3. You will have full access to:
   - **01 User Management** (Profiles & handicap audit)
   - **02 Draw Engine** (Simulation & publication)
   - **03 Charity Directory** (CRUD & safe archival)
   - **04 Winner Verification Queue** (Proof reviews)
   - **05 Reports & Platform Analytics** (KPI aggregation)

---

## 4. Security Verification & Test Results

The bootstrap mechanism and role security triggers have been verified with automated regression tests in [tests/initialAdminBootstrap.test.ts](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/tests/initialAdminBootstrap.test.ts):

```text
 ✓ tests/initialAdminBootstrap.test.ts (7 tests)
   ✓ successfully promotes initial verified user when zero admins exist
   ✓ is strictly idempotent when executed multiple times for the same designated owner
   ✓ rejects bootstrap attempts to promote a second user once an admin exists
   ✓ rejects bootstrap if target user does not exist in auth.users
   ✓ blocks anonymous and authenticated client roles from calling the bootstrap function
   ✓ allows direct SQL editor update by database owner (postgres) ONLY when zero admins exist
   ✓ blocks arbitrary role modifications by normal application callers
```

**Overall Test Suite Status:** 102 passing tests across 10 test files (`npx vitest run`).
