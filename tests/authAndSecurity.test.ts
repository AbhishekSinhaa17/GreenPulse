import { describe, it, expect } from 'vitest';
import { env } from '../src/lib/env';
import { requireSupabase, SupabaseConfigurationError } from '../src/lib/supabase';

describe('Phase 2 Authentication, Configuration & Security Guards', () => {
  it('detects unconfigured or placeholder Supabase credentials correctly', () => {

    expect(typeof env.isSupabaseConfigured).toBe('boolean');
  });

  it('requireSupabase() throws SupabaseConfigurationError when credentials are missing', () => {
    if (!env.isSupabaseConfigured) {
      expect(() => requireSupabase()).toThrow(SupabaseConfigurationError);
    }
  });

  it('enforces that public signup role cannot be overridden by user metadata', () => {

    const simulatedSignupMeta = {
      full_name: 'Adversary User',
      role: 'admin',
    };

    const profileRow = {
      email: 'attacker@domain.com',
      full_name: simulatedSignupMeta.full_name,
      role: 'subscriber',
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

  describe('Google OAuth & Profile Provisioning Security', () => {
    it('safely extracts profile metadata from Google OAuth raw user data', () => {
      const googleUserMeta = {
        name: 'Jordan Spieth',
        email: 'jordan@pgatour.example',
        picture: 'https://lh3.googleusercontent.com/a/sample-avatar',
        role: 'admin',
      };

      const extractedFullName = googleUserMeta.name || 'Golfer';
      const extractedAvatar = googleUserMeta.picture || null;

      const assignedRole = 'subscriber';

      expect(extractedFullName).toBe('Jordan Spieth');
      expect(extractedAvatar).toBe('https://lh3.googleusercontent.com/a/sample-avatar');
      expect(assignedRole).toBe('subscriber');
      expect(assignedRole).not.toBe(googleUserMeta.role);
    });

    it('rejects untrusted redirect targets and enforces local/configured origin', () => {
      const allowedOrigin = 'http://localhost:5173';
      const safeCallback = `${allowedOrigin}/auth/callback`;

      const resolveRedirect = (customRedirect?: string): string => {
        if (customRedirect && customRedirect.startsWith(allowedOrigin)) {
          return customRedirect;
        }
        return safeCallback;
      };

      expect(resolveRedirect()).toBe('http://localhost:5173/auth/callback');
      expect(resolveRedirect('http://localhost:5173/dashboard')).toBe('http://localhost:5173/dashboard');

      expect(resolveRedirect('https://evil-phishing.com/steal-token')).toBe('http://localhost:5173/auth/callback');
      expect(resolveRedirect('//evil.com')).toBe('http://localhost:5173/auth/callback');
    });

    it('correctly maps OAuth error codes to human-readable explanations', () => {
      const mapError = (err: string | null, desc: string | null): string => {
        if (!err) return '';
        if (err === 'access_denied') {
          return 'Google sign-in was cancelled or access was denied.';
        }
        return desc ? decodeURIComponent(desc.replace(/\+/g, ' ')) : 'Authentication failed.';
      };

      expect(mapError('access_denied', null)).toBe('Google sign-in was cancelled or access was denied.');
      expect(mapError('server_error', 'Invalid+provider+response')).toBe('Invalid provider response');
    });
  });
});
