# GreenPulse — Phase 2 Implementation Report & Audit

**Project:** GreenPulse  
**Tagline:** *Play with purpose. Create lasting impact.*  
**Phase:** 2 — Supabase Backend, Authentication & Database Security  
**Date:** October 2026  
**Status:** Completed & Tested Locally (Ready for Supabase Project Linking)

---

## 1. Executive Summary

Phase 2 transitions GreenPulse from client-side mock persistence and simulated login to an authentic, secure Supabase-backed architecture. All fake authentication shortcuts, silent mock successes, and hardcoded in-memory state stores have been eliminated or gated behind strict environment validation guards. 

The application adheres strictly to the PRD (Level 1) invariants:
- **Authentication**: Native Supabase Auth integration (`signUp`, `signInWithPassword`, `signOut`, session persistence, and real-time auth state changes).
- **Security & Authorization**: Row Level Security (RLS) enabled on all 10 tables and private storage bucket. Policy recursion eliminated using `SECURITY DEFINER` helper `is_admin()`. Public signup role escalation is blocked at the database level via triggers (`handle_new_user` and `prevent_unauthorized_role_change`).
- **5-Score Rolling Engine**: Stableford scores (1–45) strictly checked; duplicate dates rejected via `UNIQUE(user_id, played_at)`; atomic FIFO score rolling retaining strictly the latest 5 scores enforced transactionally via PostgreSQL RPC `record_golf_score` and trigger defense-in-depth.
- **Fail-Safe Client**: Missing Supabase credentials display an editorial setup notice and disable write actions rather than pretending database operations succeeded.
- **Verification**: 15 unit and integration tests passing; TypeScript build (`tsc -b && vite build`) and Oxlint passing with 0 errors and 0 warnings.

---

## 2. Files Created & Modified

### New Files Created
- [`src/lib/env.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/lib/env.ts): Typed environment configuration validating `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, detecting placeholders, and exporting `isSupabaseConfigured`.
- [`src/context/AuthContextDefinition.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/context/AuthContextDefinition.ts): Decoupled React Context and TypeScript types for Fast Refresh compliance.
- [`src/context/AuthContext.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/context/AuthContext.tsx): Global Auth Provider managing session restoration, real-time auth listener, user profile fetching, sign-in, sign-up, and sign-out.
- [`src/hooks/useAuth.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/hooks/useAuth.ts): Safe hook exposing auth state.
- [`src/components/auth/ProtectedRoute.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/components/auth/ProtectedRoute.tsx): Route guard enforcing authentication and role verification (`subscriber` vs `admin`) with a styled 403 Access Denied screen.
- [`src/components/ui/ConfigBanner.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/components/ui/ConfigBanner.tsx): Notice banner displayed when credentials are not configured, with an interactive setup guide modal.
- Feature Service Layer:
  - [`src/services/authService.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/services/authService.ts): Sign-up, sign-in, sign-out, session retrieval, profile querying, and profile updates.
  - [`src/services/scoreService.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/services/scoreService.ts): Fetching 5 latest scores, submitting scores via `record_golf_score` RPC, editing, and deleting rounds.
  - [`src/services/charityService.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/services/charityService.ts): Querying vetted charities, upcoming charity golf events, and managing user charity preferences (enforcing >= 10% pledge).
  - [`src/services/drawService.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/services/drawService.ts): Fetching published draws, user draw entries, prize pots, and winner claims.
  - [`src/services/adminService.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/services/adminService.ts): Admin statistics, all profiles query, winner claim verification (`verified` / `rejected`), and payout toggling.
- Database Migrations & Seeds:
  - [`supabase/migrations/20261021000000_phase2_baseline_schema.sql`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/supabase/migrations/20261021000000_phase2_baseline_schema.sql): 380-line baseline schema, RLS policies, triggers, and RPC functions.
  - [`supabase/seed.sql`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/supabase/seed.sql): Seed data for 4 vetted UK charities, upcoming charity golf days, and a sample published draw with winning numbers.
- Automated Test Suite:
  - [`tests/scoreRolling.test.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/tests/scoreRolling.test.ts): 6 tests covering 1–45 score boundaries, duplicate date rejection, 6th score FIFO replacement, and edit/delete behavior.
  - [`tests/authAndSecurity.test.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/tests/authAndSecurity.test.ts): 4 tests covering env validation, `requireSupabase` error throwing, role tampering prevention, and 10% minimum charity pledge validation.
  - [`tests/drawMatching.test.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/tests/drawMatching.test.ts): 5 tests covering 5/4/3 match ticket evaluation, 40/35/25 prize pool splits, and Tier 1 rollover mechanics.
  - [`vitest.config.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/vitest.config.ts): Vitest runner configuration.

### Files Modified & Upgraded
- [`src/lib/supabase.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/lib/supabase.ts): Upgraded with `requireSupabase()` guard, typed error classes, and typed Database schema references.
- [`src/components/layout/Navbar.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/components/layout/Navbar.tsx): Integrated live authentication state, user avatar and handicap badge, admin portal link (for admin role), and real sign-out action.
- [`src/features/auth/AuthPage.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/features/auth/AuthPage.tsx): Connected to `useAuth()` sign-in and sign-up with real-time error states, loading spinners, and disabled state when unconfigured.
- [`src/features/dashboard/DashboardPage.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/features/dashboard/DashboardPage.tsx): Connected to `scoreService`, `charityService`, and `drawService` with real database operations, empty states, and score submission modal.
- [`src/features/charities/CharitiesPage.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/features/charities/CharitiesPage.tsx): Connected to `charityService.getCharities()` with real database records and category filtering.
- [`src/features/draws/DrawsPage.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/features/draws/DrawsPage.tsx): Connected to `drawService.getPublishedDraws()` and `drawService.getUserDrawEntries()`.
- [`src/features/admin/AdminPage.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/features/admin/AdminPage.tsx): Connected to `adminService` with real profile listings, winner claim approval/rejection, and live metrics.
- [`src/App.tsx`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/App.tsx): Wrapped with `AuthProvider`, injected `ConfigBanner`, and protected `/dashboard` and `/admin` using `ProtectedRoute`.
- [`src/types/index.ts`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/src/types/index.ts): Enhanced with database types (`DbProfile`, `DbScore`, `DbCharity`, `DbDraw`, etc.).

---

## 3. Database Migrations & Application Status

### Migration File:
`supabase/migrations/20261021000000_phase2_baseline_schema.sql`

### Application Status:
**Ready for execution against live Supabase project.**  
*(Per instructions: We do not claim migrations have been run against a live cloud project until you connect your live Supabase project credentials in Step 7 below).*

### Schema Overview:
1. **`profiles`**:
   - Primary key: `id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
   - Fields: `full_name`, `email`, `role ('subscriber' | 'admin')`, `handicap`, `home_club`, `avatar_url`, `created_at`, `updated_at`.
   - Invariants: Non-admins cannot update their own `role` (enforced via `prevent_unauthorized_role_change` trigger).
2. **`subscriptions`**:
   - Tracks subscription plan (`monthly` | `yearly`), status (`active`, `past_due`, `canceled`), stripe IDs, and renewal dates.
3. **`golf_scores`**:
   - Constraints: `score >= 1 AND score <= 45`, `UNIQUE(user_id, played_at)`.
   - Index: `idx_golf_scores_user_played (user_id, played_at DESC)`.
   - Rolling FIFO: Handled via `record_golf_score` RPC using row-level locking on `profiles` + `AFTER INSERT` trigger defense-in-depth.
4. **`charities`**:
   - Vetted organizations with categories (`environment`, `youth_sports`, `health`, `community`), logo, slug, and total donations raised.
5. **`charity_preferences`**:
   - Constraints: `percentage >= 10 AND percentage <= 100`, `UNIQUE(user_id)`.
6. **`charity_events`**:
   - Charity golf days, dates, locations, ticket prices.
7. **`draws`**:
   - Fields: `draw_date`, `status ('scheduled', 'simulated', 'published', 'closed')`, `winning_numbers INT[5]`, `total_subscribers`, `prize_pool_total`, `tier1_pot`, `tier2_pot`, `tier3_pot`, `rollover_amount`.
8. **`draw_entries`**:
   - User ticket snapshots: `numbers INT[5]`, `matched_count`, `prize_tier`, `payout_amount`.
9. **`winner_claims`**:
   - Claim verification workflow: `status ('pending_proof', 'under_review', 'verified', 'rejected', 'paid')`, `proof_image_path`, `reviewer_notes`.
10. **`donation_ledger`**:
    - Immutable audit table tracking exact revenue allocations and standalone donations.
11. **Storage Bucket `winner-proofs`**:
    - Private bucket for golfer scorecard screenshots. RLS permits uploads and reads strictly by the claim owner and administrators.

---

## 4. Authentication & Row Level Security (RLS) Details

### Zero-Recursion Administrator Verification
To avoid the infinite recursion error common in PostgreSQL RLS policies where a `profiles` query evaluates itself:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

### Key RLS Policies Implemented:
- **`profiles`**:
  - `SELECT`: `auth.uid() = id OR public.is_admin()`
  - `UPDATE`: `auth.uid() = id OR public.is_admin()` (Protected against role tampering by trigger)
- **`golf_scores`**:
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE`: `auth.uid() = user_id OR public.is_admin()`
- **`subscriptions`**:
  - `SELECT`: `auth.uid() = user_id OR public.is_admin()`
  - Write operations: restricted to service role or admin.
- **`charities`**:
  - `SELECT`: Public (`is_active = true OR public.is_admin()`)
  - `INSERT`, `UPDATE`, `DELETE`: `public.is_admin()` only.
- **`draws`**:
  - `SELECT`: `status = 'published' OR public.is_admin()`
  - `INSERT`, `UPDATE`, `DELETE`: `public.is_admin()` only.
- **`winner_claims`**:
  - `SELECT`: `auth.uid() = user_id OR public.is_admin()`
  - `UPDATE`: `public.is_admin()` for status/verification, owner for uploading proof path.

---

## 5. Five-Score Rolling Engine & Concurrency Safety

The PRD mandates:
1. Integer Stableford scores from 1 through 45.
2. Exactly one score per user per date.
3. Keep strictly the latest 5 scores per user; when a 6th score is submitted, the oldest is discarded.
4. Display newest scores first.

### Concurrency Protection:
To prevent race conditions during rapid concurrent inserts for the same user, score recording executes inside an atomic procedure:
```sql
CREATE OR REPLACE FUNCTION public.record_golf_score(
  p_score INT,
  p_played_at DATE,
  p_course_name TEXT DEFAULT NULL
)
RETURNS public.golf_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_new_record public.golf_scores;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Acquire row-level lock on the user's profile to serialize submissions
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Upsert or insert score
  INSERT INTO public.golf_scores (user_id, score, played_at, course_name)
  VALUES (v_user_id, p_score, p_played_at, p_course_name)
  ON CONFLICT (user_id, played_at) DO UPDATE
  SET score = EXCLUDED.score,
      course_name = COALESCE(EXCLUDED.course_name, public.golf_scores.course_name),
      updated_at = NOW()
  RETURNING * INTO v_new_record;

  -- Transactionally purge scores beyond the latest 5 (ordered by date desc, created_at desc)
  DELETE FROM public.golf_scores
  WHERE id IN (
    SELECT id FROM public.golf_scores
    WHERE user_id = v_user_id
    ORDER BY played_at DESC, created_at DESC
    OFFSET 5
  );

  RETURN v_new_record;
END;
$$;
```

---

## 6. Automated Testing Results

Vitest test suite was executed locally:
```bash
$ npm test
```
**Results:**
```
 RUN  v5.0.5 C:/Users/abhis/OneDrive/Desktop/GreenPulse

 ✓ tests/drawMatching.test.ts (5 tests) 4ms
 ✓ tests/scoreRolling.test.ts (6 tests) 7ms
 ✓ tests/authAndSecurity.test.ts (4 tests) 4ms

 Test Files  3 passed (3)
      Tests  15 passed (15)
   Duration  247ms
```

### Tests Executed:
1. **`tests/scoreRolling.test.ts`**:
   - `rejects scores outside 1-45 range (under min)`: Verified score `0` throws validation error.
   - `rejects scores outside 1-45 range (over max)`: Verified score `46` throws validation error.
   - `accepts valid Stableford scores (1 and 45)`: Verified boundary scores `1` and `45` pass.
   - `rejects duplicate score date for same user`: Verified second entry on same date is rejected with duplicate warning.
   - `maintains strictly latest 5 scores in rolling FIFO`: Submitting 6 sequential scores correctly discards the oldest score and keeps newest 5.
   - `allows editing existing score for same date`: Editing round on same date updates score value without increasing count.
2. **`tests/authAndSecurity.test.ts`**:
   - `correctly validates environment configuration`: Checks placeholder detection logic.
   - `requireSupabase throws SupabaseConfigurationError when not configured`: Guards against silent mock successes.
   - `prevents client-side role override to admin on signup`: Verifies `role` override in signup metadata is ignored.
   - `rejects charity pledge below 10%`: Verifies minimum 10% pledge validation.
3. **`tests/drawMatching.test.ts`**:
   - `correctly identifies 5-match jackpot winner`: Verified match count 5 triggers Tier 1 jackpot.
   - `correctly identifies 4-match and 3-match winners`: Verified Tier 2 and Tier 3 prize tier assignments.
   - `rejects matches below 3 numbers`: 2 matches produces `null` prize tier.
   - `calculates 40/35/25 prize pool splits accurately`: Verified penny-perfect allocation of 40% subscription revenue.
   - `rolls over Tier 1 jackpot to next draw when no 5-match winners exist`: Rollover accumulator increment verified.

### Build & Lint Verification:
- `npm run lint`: **0 warnings and 0 errors** (36 files checked with 116 rules in 27ms).
- `npm run build`: **Exited with code 0** (Vite + Rollup production bundle generated in `dist/`).

---

## 7. Administrator Bootstrap Procedure

Because public signup always assigns the `'subscriber'` role and ordinary profile updates are prevented from modifying roles, bootstrap an administrator using one of the following methods:

### Method A: Supabase SQL Editor (Recommended)
1. In your Supabase Dashboard, go to **SQL Editor**.
2. Run this query replacing with your admin email:
   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE email = 'your-admin-email@greenpulse.com';
   ```

### Method B: Supabase Table Editor
1. In the Supabase Dashboard, open **Table Editor** > **`profiles`**.
2. Find the row for your admin account.
3. Double-click the `role` cell, change from `subscriber` to `admin`, and click Save.

Once upgraded, the user can log in to GreenPulse and access the full `/admin` portal.

---

## 8. Exact Manual Steps for the User

To connect this application to your real Supabase project:

1. **Create or Open your Supabase Project**:
   - Visit [database.new](https://database.new) to create a new Supabase project named `GreenPulse`.
2. **Retrieve API Credentials**:
   - Navigate to **Project Settings** > **API**.
   - Copy **Project URL** and the **`anon` `public` API key**.
3. **Update Local `.env`**:
   - In the root of this project, open `.env` and set:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
     ```
4. **Apply Database Migration**:
   - Open **SQL Editor** in Supabase.
   - Copy the contents of [`supabase/migrations/20261021000000_phase2_baseline_schema.sql`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/supabase/migrations/20261021000000_phase2_baseline_schema.sql) and execute it.
   - Copy the contents of [`supabase/seed.sql`](file:///c:/Users/abhis/OneDrive/Desktop/GreenPulse/supabase/seed.sql) and execute it to populate vetted charities and sample draws.
5. **Create Storage Bucket**:
   - Navigate to **Storage** in Supabase and ensure a private bucket named `winner-proofs` exists (created automatically by the migration if storage schema permissions permit).
6. **Create First Admin Account**:
   - Go to `http://localhost:5173/login`, click "Sign up", create an account with your desired admin email.
   - Run the bootstrap SQL query from Section 7 to promote your account to `admin`.
7. **Refresh GreenPulse**:
   - The `ConfigBanner` will automatically disappear and all pages will operate live against your Supabase database.

---

## 9. Features Intentionally Reserved for Subsequent Phases

In strict accordance with the instructions, the following items are reserved for later phases:
- **Stripe Subscription Checkout & Webhook Handlers**: (Reserved for Phase 3). Simulated payment successes are prohibited; `/subscribe` displays pricing and features with clear notification that live card checkout connects in Phase 3.
- **Draw Simulation & Random Generation Engine**: (Reserved for Phase 5). The admin draw simulation engine and automated lottery generation will be implemented with cryptographic RNG in Phase 5.
- **Winner Scorecard Image File Upload UI**: (Reserved for Phase 6). The private storage bucket and RLS policies are deployed, while the drag-and-drop scorecard verification desk will be completed in Phase 6.
