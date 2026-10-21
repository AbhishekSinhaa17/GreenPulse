-- ==============================================================================
-- GreenPulse — Initial Seed Data
-- ==============================================================================

-- 1. Insert Initial Vetted Charities (PRD § 08)
INSERT INTO public.charities (name, slug, tagline, description, category, is_featured, total_raised_cents, website_url)
VALUES
  (
    'Fairway Green Youth Foundation',
    'fairway-green-youth',
    'Opening golf and mentorship to underprivileged young athletes.',
    'Provides equipment, PGA junior coaching, and character-building mentorship programs to young golfers from disadvantaged communities across Scotland and northern England.',
    'youth_sports',
    true,
    1420000,
    'https://example.org/fairway-youth'
  ),
  (
    'Open Course Conservation Trust',
    'open-course-conservation',
    'Rewilding coastal links and protecting native pollinators.',
    'Collaborates with coastal and parkland golf courses to restore natural habitats, seed wild pollinator corridors, and manage wetland reserves along coastal roughs.',
    'environment',
    true,
    2850000,
    'https://example.org/opencourse-conservation'
  ),
  (
    'Veterans on the Green',
    'veterans-on-the-green',
    'Rehabilitation, community, and mental health through adaptive golf.',
    'Supports wounded and transitioning military veterans through adaptive swing equipment, PTSD peer counseling, and regional inclusive golf tournaments.',
    'health',
    false,
    980000,
    'https://example.org/veterans-golf'
  ),
  (
    'Local Parkland Initiative',
    'local-parkland-initiative',
    'Preserving municipal green spaces and public recreation courses.',
    'Safeguards municipal golf courses from urban commercial redevelopment, preserving accessible public fairways and community recreation grounds.',
    'community',
    false,
    640000,
    'https://example.org/local-parklands'
  )
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Charity Upcoming Events (PRD § 08.2)
INSERT INTO public.charity_events (charity_id, title, description, event_date, location)
SELECT id, 'Autumn Junior Invitational Pro-Am', '18-hole charity team scramble pairing junior trainees with European Tour professionals.', '2026-11-14', 'Gleneagles PGA Centenary Course'
FROM public.charities WHERE slug = 'fairway-green-youth'
ON CONFLICT DO NOTHING;

INSERT INTO public.charity_events (charity_id, title, description, event_date, location)
SELECT id, 'Coastal Links Wildflower Planting Day', 'Community conservation volunteer day planting indigenous maritime grasses on outer roughs.', '2026-11-22', 'North Berwick Golf Club'
FROM public.charities WHERE slug = 'open-course-conservation'
ON CONFLICT DO NOTHING;

-- 3. Insert Previous Published Draw (PRD § 06, § 07)
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
  published_at
)
VALUES (
  'September 2026 Autumn Kickoff Draw',
  '2026-09-01',
  'random',
  'published',
  ARRAY[14, 27, 33, 38, 42],
  1380,
  2484000, -- £24,840.00
  0,
  993600,  -- £9,936.00 (40%)
  869400,  -- £8,694.00 (35%)
  621000,  -- £6,210.00 (25%)
  0,       -- 0 winners in Tier 5 -> rolled over!
  3,       -- 3 winners in Tier 4
  28,      -- 28 winners in Tier 3
  true,    -- Jackpot rolled over
  '2026-09-30 20:00:00+00'
)
ON CONFLICT (draw_month) DO NOTHING;
