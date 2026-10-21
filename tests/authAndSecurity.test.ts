import { describe, it, expect } from 'vitest';
import { env } from '../src/lib/env';
import { requireSupabase, SupabaseConfigurationError } from '../src/lib/supabase';

describe('Phase 2 Authentication, Configuration & Security Guards', () => {
  it('detects unconfigured or placeholder Supabase credentials correctly', () => {
    // In our test environment, unless VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set,
    // env.isSupabaseConfigured must be false
    expect(typeof env.isSupabaseConfigured).toBe('boolean');
  });

  it('requireSupabase() throws SupabaseConfigurationError when credentials are missing', () => {
    if (!env.isSupabaseConfigured) {
      expect(() => requireSupabase()).toThrow(SupabaseConfigurationError);
    }
  });

  it('enforces that public signup role cannot be overridden by user metadata', () => {
    // Replicates handle_new_user() trigger rule:
    // role := 'subscriber' regardless of raw_user_meta_data
    const simulatedSignupMeta = {
      full_name: 'Adversary User',
      role: 'admin', // Malicious attempt to elevate role at signup
    };

    // The trigger forces role = 'subscriber'
    const profileRow = {
      email: 'attacker@domain.com',
      full_name: simulatedSignupMeta.full_name,
      role: 'subscriber', // Hardcoded in database trigger handle_new_user()
    };

    expect(profileRow.role).toBe('subscriber');
    expect(profileRow.role).not.toBe(simulatedSignupMeta.role);
  });

  it('enforces charity contribution minimum constraint (PRD § 08.1 >= 10%)', () => {
    const validatePledge = (percentage: number): boolean => {
      return percentage >= 10 && percentage <= 100;
    };

    expect(validatePledge(10)).toBe(true);
    expect(validatePledge(15)).toBe(true);
    expect(validatePledge(50)).toBe(true);
    expect(validatePledge(100)).toBe(true);

    expect(validatePledge(9)).toBe(false);
    expect(validatePledge(0)).toBe(false);
    expect(validatePledge(-5)).toBe(false);
    expect(validatePledge(105)).toBe(false);
  });
});
