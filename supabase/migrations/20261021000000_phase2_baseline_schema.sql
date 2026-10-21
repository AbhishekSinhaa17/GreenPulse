-- ==============================================================================
-- GreenPulse — Phase 2 Baseline Database Migration
-- Source of Truth: Digital Heroes PRD (Level 1)
-- Stack: Supabase PostgreSQL, Auth, RLS, Storage
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. SCHEMAS & HELPER FUNCTIONS
-- ==============================================================================

-- Admin check helper function (SECURITY DEFINER to prevent RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Updated at timestamp helper
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABLES
-- ==============================================================================

-- 3.1 PROFILES (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
  handicap NUMERIC(4, 1),
  home_club TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 SUBSCRIPTIONS (PRD § 04)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- 3.3 GOLF SCORES (PRD § 05: 1-45 Stableford, max 5, one per date)
CREATE TABLE IF NOT EXISTS public.golf_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  played_at DATE NOT NULL,
  course_name TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_played_at UNIQUE (user_id, played_at)
);
CREATE INDEX IF NOT EXISTS idx_golf_scores_user_played ON public.golf_scores(user_id, played_at DESC);

-- 3.4 CHARITIES (PRD § 08)
CREATE TABLE IF NOT EXISTS public.charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tagline TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('environment', 'youth_sports', 'health', 'community')),
  logo_url TEXT,
  cover_image_url TEXT,
  website_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  total_raised_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_charities_category_featured ON public.charities(category, is_featured);

-- 3.5 CHARITY PREFERENCES (PRD § 08.1: min 10% contribution)
CREATE TABLE IF NOT EXISTS public.charity_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  percentage INTEGER NOT NULL DEFAULT 10 CHECK (percentage >= 10 AND percentage <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 CHARITY EVENTS (PRD § 08.2: Upcoming golf days, etc.)
CREATE TABLE IF NOT EXISTS public.charity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT NOT NULL,
  registration_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 DRAWS (PRD § 06, § 07: Monthly, Random vs Algorithmic, rollover jackpot)
CREATE TABLE IF NOT EXISTS public.draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_title TEXT NOT NULL,
  draw_month DATE NOT NULL UNIQUE,
  draw_logic TEXT NOT NULL CHECK (draw_logic IN ('random', 'algorithmic')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'simulated', 'published', 'closed')),
  winning_numbers INTEGER[] CHECK (winning_numbers IS NULL OR array_length(winning_numbers, 1) = 5),
  total_eligible_subscribers INTEGER NOT NULL DEFAULT 0,
  total_prize_pool_cents BIGINT NOT NULL DEFAULT 0,
  carried_over_jackpot_cents BIGINT NOT NULL DEFAULT 0,
  tier_5_pot_cents BIGINT NOT NULL DEFAULT 0,
  tier_4_pot_cents BIGINT NOT NULL DEFAULT 0,
  tier_3_pot_cents BIGINT NOT NULL DEFAULT 0,
  tier_5_winners_count INTEGER NOT NULL DEFAULT 0,
  tier_4_winners_count INTEGER NOT NULL DEFAULT 0,
  tier_3_winners_count INTEGER NOT NULL DEFAULT 0,
  jackpot_rolled_over BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 DRAW ENTRIES (PRD § 06: User distinct score snapshot per monthly draw)
CREATE TABLE IF NOT EXISTS public.draw_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  numbers_snapshot INTEGER[] NOT NULL,
  matched_count INTEGER,
  match_tier TEXT CHECK (match_tier IN ('tier_5', 'tier_4', 'tier_3', 'none')),
  prize_awarded_cents BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_draw_user UNIQUE (draw_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_draw_entries_draw_tier ON public.draw_entries(draw_id, match_tier);

-- 3.9 WINNER CLAIMS (PRD § 09: Proof upload and verification)
CREATE TABLE IF NOT EXISTS public.winner_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  draw_entry_id UUID NOT NULL REFERENCES public.draw_entries(id) ON DELETE CASCADE,
  prize_amount_cents BIGINT NOT NULL,
  match_tier TEXT NOT NULL CHECK (match_tier IN ('tier_5', 'tier_4', 'tier_3')),
  status TEXT NOT NULL DEFAULT 'pending_proof' CHECK (status IN ('pending_proof', 'under_review', 'verified', 'rejected', 'paid')),
  proof_image_path TEXT,
  golfer_notes TEXT,
  rejection_reason TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  payout_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_winner_claims_user_status ON public.winner_claims(user_id, status);

-- 3.10 DONATION LEDGER (PRD § 08.1: Independent donations and subscription splits)
CREATE TABLE IF NOT EXISTS public.donation_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  donation_type TEXT NOT NULL CHECK (donation_type IN ('subscription_split', 'independent_direct')),
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. DATABASE TRIGGERS & SECURITY CONSTRAINTS
-- ==============================================================================

-- 4.1 Auto-provision Profile on Auth Sign Up (Always default to 'subscriber')
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'subscriber' -- Never allow user to choose admin role during public signup
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4.2 Prevent Non-Admins from Altering the Role Column
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can change user roles.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_role_change();

-- 4.3 Five-Score Rolling FIFO Procedure (Transactionally Safe)
CREATE OR REPLACE FUNCTION public.record_golf_score(
  p_score INTEGER,
  p_played_at DATE,
  p_course_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_new_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to submit golf score.';
  END IF;

  -- Validate score range (PRD § 05)
  IF p_score < 1 OR p_score > 45 THEN
    RAISE EXCEPTION 'Score % is out of bounds. Stableford format requires 1 to 45 points.', p_score;
  END IF;

  -- Lock user profile to ensure serialized score entry
  PERFORM 1 FROM public.profiles WHERE id = v_user_id FOR UPDATE;

  -- Check duplicate date constraint (PRD § 05)
  IF EXISTS (SELECT 1 FROM public.golf_scores WHERE user_id = v_user_id AND played_at = p_played_at) THEN
    RAISE EXCEPTION 'A score entry already exists for date %. Existing entries may only be edited or deleted.', p_played_at;
  END IF;

  -- Insert new score
  INSERT INTO public.golf_scores (user_id, score, played_at, course_name)
  VALUES (v_user_id, p_score, p_played_at, p_course_name)
  RETURNING id INTO v_new_id;

  -- Transactionally drop scores beyond the latest 5 (ordered by date descending, then creation timestamp)
  DELETE FROM public.golf_scores
  WHERE id IN (
    SELECT id FROM public.golf_scores
    WHERE user_id = v_user_id
    ORDER BY played_at DESC, created_at DESC
    OFFSET 5
  );

  -- Return updated latest 5 scores as JSON
  SELECT jsonb_agg(to_jsonb(s)) INTO v_result
  FROM (
    SELECT id, score, played_at, course_name, verified, created_at
    FROM public.golf_scores
    WHERE user_id = v_user_id
    ORDER BY played_at DESC, created_at DESC
    LIMIT 5
  ) s;

  RETURN jsonb_build_object(
    'success', true,
    'inserted_id', v_new_id,
    'active_scores', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Defense-in-depth trigger for direct table inserts
CREATE OR REPLACE FUNCTION public.handle_score_rolling()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.golf_scores
  WHERE id IN (
    SELECT id FROM public.golf_scores
    WHERE user_id = NEW.user_id
    ORDER BY played_at DESC, created_at DESC
    OFFSET 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_score_rolling ON public.golf_scores;
CREATE TRIGGER trg_score_rolling
AFTER INSERT ON public.golf_scores
FOR EACH ROW EXECUTE FUNCTION public.handle_score_rolling();

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_charities_updated_at ON public.charities;
CREATE TRIGGER trg_charities_updated_at BEFORE UPDATE ON public.charities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_charity_pref_updated_at ON public.charity_preferences;
CREATE TRIGGER trg_charity_pref_updated_at BEFORE UPDATE ON public.charity_preferences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_winner_claims_updated_at ON public.winner_claims;
CREATE TRIGGER trg_winner_claims_updated_at BEFORE UPDATE ON public.winner_claims FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winner_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_ledger ENABLE ROW LEVEL SECURITY;

-- 5.1 PROFILES POLICIES (Zero-recursion using public.is_admin())
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5.2 SUBSCRIPTIONS POLICIES
CREATE POLICY "Users can read their own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins or service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 5.3 GOLF SCORES POLICIES
CREATE POLICY "Users can read their own golf scores"
  ON public.golf_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert their own golf scores"
  ON public.golf_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own golf scores"
  ON public.golf_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own golf scores"
  ON public.golf_scores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 5.4 CHARITIES POLICIES (Public read; Admin full control)
CREATE POLICY "Public can view charities"
  ON public.charities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage charities"
  ON public.charities FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.5 CHARITY PREFERENCES POLICIES
CREATE POLICY "Users manage their own charity preferences"
  ON public.charity_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 5.6 CHARITY EVENTS POLICIES
CREATE POLICY "Public can view charity events"
  ON public.charity_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage charity events"
  ON public.charity_events FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 5.7 DRAWS POLICIES
CREATE POLICY "Public can view published draws"
  ON public.draws FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins manage draws"
  ON public.draws FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.8 DRAW ENTRIES POLICIES
CREATE POLICY "Users view their own draw entries"
  ON public.draw_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins manage draw entries"
  ON public.draw_entries FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 5.9 WINNER CLAIMS POLICIES
CREATE POLICY "Users view their own winner claims"
  ON public.winner_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Winners can submit proof for their own claims"
  ON public.winner_claims FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending_proof', 'rejected'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins review and manage all winner claims"
  ON public.winner_claims FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 5.10 DONATION LEDGER POLICIES
CREATE POLICY "Users view their own donations"
  ON public.donation_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins view all donations"
  ON public.donation_ledger FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 6. STORAGE BUCKET CONFIGURATION (Winner Proofs)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('winner-proofs', 'winner-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Winners upload their own proof"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'winner-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Winners and Admins view proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'winner-proofs' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin())
  );
