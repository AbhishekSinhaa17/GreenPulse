export type UserRole = 'subscriber' | 'admin';

export type SubscriptionPlan = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  handicap?: number;
  home_club?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan_tier: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface GolfScore {
  id: string;
  user_id: string;
  score: number; // Stableford points (1-45)
  played_at: string; // YYYY-MM-DD
  course_name?: string;
  verified: boolean;
  created_at: string;
}

export type CharityCategory = 'environment' | 'youth_sports' | 'health' | 'community';

export interface Charity {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  category: CharityCategory;
  logo_url?: string;
  cover_image_url?: string;
  website_url?: string;
  is_featured: boolean;
  total_raised_cents: number;
  created_at: string;
}

export interface CharityEvent {
  id: string;
  charity_id: string;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  registration_url?: string;
}

export interface CharityPreference {
  user_id: string;
  charity_id: string;
  percentage: number; // 10% to 100%
  charity?: Charity;
}

export type DrawLogic = 'random' | 'algorithmic';
export type DrawStatus = 'scheduled' | 'simulated' | 'published' | 'closed';
export type MatchTier = 'tier_5' | 'tier_4' | 'tier_3' | 'none';

export interface MonthlyDraw {
  id: string;
  draw_title: string;
  draw_month: string; // YYYY-MM
  draw_logic: DrawLogic;
  status: DrawStatus;
  winning_numbers?: [number, number, number, number, number];
  total_eligible_subscribers: number;
  total_prize_pool_cents: number;
  carried_over_jackpot_cents: number;
  tier_5_pot_cents: number;
  tier_4_pot_cents: number;
  tier_3_pot_cents: number;
  tier_5_winners_count: number;
  tier_4_winners_count: number;
  tier_3_winners_count: number;
  jackpot_rolled_over: boolean;
  published_at?: string;
  published_by?: string;
}

export interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  numbers_snapshot: number[]; // Distinct scores at time of draw
  matched_count?: number;
  match_tier?: MatchTier;
  prize_awarded_cents: number;
}

export type ClaimStatus =
  | 'pending_proof'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'paid';

export interface WinnerClaim {
  id: string;
  draw_id: string;
  user_id: string;
  draw_entry_id: string;
  prize_amount_cents: number;
  match_tier: 'tier_5' | 'tier_4' | 'tier_3';
  status: ClaimStatus;
  proof_image_path?: string;
  golfer_notes?: string;
  rejection_reason?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  payout_reference?: string;
  paid_at?: string;
  created_at: string;
  updated_at?: string;
}
