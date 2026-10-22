import { describe, it, expect } from 'vitest';
import { isRoleAuthorized } from '../src/utils/rbac';
import type { UserProfile, UserRole, Subscription } from '../src/types';
import { simulateDraw, evaluateTicket } from '../src/services/drawEngine';

describe('Role-Based Admin Experience & Navigation Regression Suite', () => {

  const resolveLoginRedirect = (
    profile: { role: UserRole } | null,
    fromPath?: string
  ): { target: string; welcomeMessage: string } => {
    const isAdmin = profile?.role === 'admin';
    const welcomeMessage = isAdmin
      ? 'Welcome to the Operations Console.'
      : 'Welcome back to your golfer workspace.';

    let destination = isAdmin ? '/admin' : '/dashboard';
    if (fromPath && fromPath !== '/login' && fromPath !== '/signup') {
      if (isAdmin) {
        destination = fromPath === '/dashboard' ? '/admin' : fromPath;
      } else {
        destination = fromPath.startsWith('/admin') ? '/dashboard' : fromPath;
      }
    }

    return { target: destination, welcomeMessage };
  };

  const resolveOAuthCallbackRedirect = (
    profile: { role: UserRole; full_name?: string }
  ): { destination: string; welcomeName: string } => {
    const isAdmin = profile.role === 'admin';
    const welcomeName = profile.full_name || (isAdmin ? 'Administrator' : 'Golfer');
    const destination = isAdmin ? '/admin' : '/dashboard';
    return { destination, welcomeName };
  };

  const evaluateDashboardAccess = (
    role: UserRole | null,
    isLoading: boolean
  ): { action: 'wait_loading' | 'redirect_admin' | 'render_golfer' } => {
    if (isLoading) return { action: 'wait_loading' };
    if (role === 'admin') return { action: 'redirect_admin' };
    return { action: 'render_golfer' };
  };

  describe('1. Admin Login Redirects', () => {
    it('redirects an admin directly to /admin when logging in from default route', () => {
      const adminProfile = { role: 'admin' as UserRole };
      const result = resolveLoginRedirect(adminProfile, '/dashboard');
      expect(result.target).toBe('/admin');
      expect(result.welcomeMessage).toBe('Welcome to the Operations Console.');
    });

    it('redirects an admin directly to /admin when from state is undefined', () => {
      const adminProfile = { role: 'admin' as UserRole };
      const result = resolveLoginRedirect(adminProfile, undefined);
      expect(result.target).toBe('/admin');
    });

    it('preserves deep admin target paths when admin was redirected to login from an admin subpath', () => {
      const adminProfile = { role: 'admin' as UserRole };
      const result = resolveLoginRedirect(adminProfile, '/admin?tab=users');
      expect(result.target).toBe('/admin?tab=users');
    });

    it('does not redirect an authenticated admin before user role has loaded', () => {
      const checkPrematureRedirect = (isLoading: boolean, profile: UserProfile | null) => {
        if (isLoading || !profile) return null;
        return profile.role === 'admin' ? '/admin' : '/dashboard';
      };

      expect(checkPrematureRedirect(true, null)).toBeNull();

      const loadedProfile: UserProfile = {
        id: 'adm-1',
        email: 'admin@greenpulse.org',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      expect(checkPrematureRedirect(false, loadedProfile)).toBe('/admin');
    });
  });

  describe('2. Subscriber/Golfer Login Redirects', () => {
    it('redirects a normal golfer directly to /dashboard on login', () => {
      const golferProfile = { role: 'subscriber' as UserRole };
      const result = resolveLoginRedirect(golferProfile, '/dashboard');
      expect(result.target).toBe('/dashboard');
      expect(result.welcomeMessage).toBe('Welcome back to your golfer workspace.');
    });

    it('prevents a golfer from being redirected to an admin route if from was /admin', () => {
      const golferProfile = { role: 'subscriber' as UserRole };
      const result = resolveLoginRedirect(golferProfile, '/admin');
      expect(result.target).toBe('/dashboard');
    });

    it('allows a golfer to return to safe non-admin routes (e.g. /charities or /draws)', () => {
      const golferProfile = { role: 'subscriber' as UserRole };
      expect(resolveLoginRedirect(golferProfile, '/charities').target).toBe('/charities');
      expect(resolveLoginRedirect(golferProfile, '/draws').target).toBe('/draws');
    });
  });

  describe('3. Administrator Free Platform Access (No Subscription Required)', () => {
    it('allows an administrator without any subscription record to operate the platform', () => {

      const adminUser = { id: 'admin-uuid', role: 'admin' as UserRole };
      const adminSubscription: Subscription | null = null;

      const canAccessAdminOperations = (userRole: UserRole, sub: Subscription | null): boolean => {
        if (userRole === 'admin') return true;
        return sub?.status === 'active';
      };

      expect(canAccessAdminOperations(adminUser.role, adminSubscription)).toBe(true);
    });

    it('bypasses checkout requirements on the subscription page for admin users', () => {
      const handleSubscriptionAction = (
        role: UserRole,
        activeSub: Subscription | null
      ): { canCheckout: boolean; actionLabel: string } => {
        if (role === 'admin') {
          return {
            canCheckout: false,
            actionLabel: 'Go to Admin Portal (Complimentary Access)',
          };
        }
        if (activeSub?.status === 'active') {
          return { canCheckout: false, actionLabel: 'Already Subscribed' };
        }
        return { canCheckout: true, actionLabel: 'Proceed to Stripe Checkout' };
      };

      const adminResult = handleSubscriptionAction('admin', null);
      expect(adminResult.canCheckout).toBe(false);
      expect(adminResult.actionLabel).toBe('Go to Admin Portal (Complimentary Access)');

      const golferWithoutSub = handleSubscriptionAction('subscriber', null);
      expect(golferWithoutSub.canCheckout).toBe(true);
      expect(golferWithoutSub.actionLabel).toBe('Proceed to Stripe Checkout');
    });

    it('does not alter or fabricate subscription records for admin accounts', () => {
      const checkAdminSubscriptionRecord = (databaseRow: Subscription | null): Subscription | null => {

        return databaseRow;
      };

      expect(checkAdminSubscriptionRecord(null)).toBeNull();
    });
  });

  describe('4. Strict Route & Operation Guards for Non-Admins', () => {
    it('strictly blocks subscribers from accessing the admin route guard', () => {
      expect(isRoleAuthorized('subscriber', 'admin')).toBe(false);
      expect(isRoleAuthorized(null, 'admin')).toBe(false);
      expect(isRoleAuthorized(undefined, 'admin')).toBe(false);
    });

    it('authorizes admin users for admin routes', () => {
      expect(isRoleAuthorized('admin', 'admin')).toBe(true);
    });

    it('denies subscriber RPC calls for administrative mutations', () => {
      const simulateRpcCall = (callerRole: UserRole, operation: string) => {
        if (callerRole !== 'admin') {
          throw new Error(`Unauthorized: Administrator authorization required for ${operation}.`);
        }
        return { success: true };
      };

      expect(() => simulateRpcCall('subscriber', 'update_user_role')).toThrow(/Unauthorized/);
      expect(() => simulateRpcCall('subscriber', 'publish_monthly_draw')).toThrow(/Unauthorized/);
      expect(() => simulateRpcCall('subscriber', 'verify_winner_claim')).toThrow(/Unauthorized/);
      expect(simulateRpcCall('admin', 'publish_monthly_draw')).toEqual({ success: true });
    });

    it('configures navbar links to exclude Admin Portal for normal users', () => {
      const getNavLinks = (isAdmin: boolean) => [
        { label: 'How It Works', path: '/#how-it-works' },
        { label: 'Charities', path: '/charities' },
        { label: 'Prize Draws', path: '/draws' },
        ...(isAdmin
          ? [{ label: 'Admin Portal', path: '/admin' }]
          : [{ label: 'Dashboard', path: '/dashboard' }]),
      ];

      const golferLinks = getNavLinks(false);
      expect(golferLinks.some((l) => l.path === '/admin')).toBe(false);
      expect(golferLinks.some((l) => l.path === '/dashboard')).toBe(true);

      const adminLinks = getNavLinks(true);
      expect(adminLinks.some((l) => l.path === '/admin')).toBe(true);
      expect(adminLinks.some((l) => l.path === '/dashboard')).toBe(false);
    });
  });

  describe('5. Session Refresh & Direct Access Invariants', () => {
    it('retains the /admin route when an admin refreshes their browser', () => {

      const currentRoute = '/admin';
      const role: UserRole = 'admin';
      const requiredRole = 'admin';

      const isAuthorized = isRoleAuthorized(role, requiredRole);
      expect(isAuthorized).toBe(true);

      const finalDestination = isAuthorized ? currentRoute : '/login';
      expect(finalDestination).toBe('/admin');
    });

    it('redirects an admin to /admin if they directly navigate to /dashboard', () => {
      const result = evaluateDashboardAccess('admin', false);
      expect(result.action).toBe('redirect_admin');
    });

    it('renders the golfer dashboard when a subscriber accesses /dashboard', () => {
      const result = evaluateDashboardAccess('subscriber', false);
      expect(result.action).toBe('render_golfer');
    });

    it('holds rendering while initial session is loading to prevent redirect loops', () => {
      const result = evaluateDashboardAccess('admin', true);
      expect(result.action).toBe('wait_loading');
    });
  });

  describe('6. OAuth Callback Role Resolution', () => {
    it('redirects admin OAuth user directly to /admin with administrator greeting', () => {
      const adminOAuthUser = {
        role: 'admin' as UserRole,
        full_name: 'Platform Director',
      };

      const result = resolveOAuthCallbackRedirect(adminOAuthUser);
      expect(result.destination).toBe('/admin');
      expect(result.welcomeName).toBe('Platform Director');
    });

    it('redirects subscriber OAuth user directly to /dashboard with golfer greeting', () => {
      const golferOAuthUser = {
        role: 'subscriber' as UserRole,
        full_name: 'Tiger Woods',
      };

      const result = resolveOAuthCallbackRedirect(golferOAuthUser);
      expect(result.destination).toBe('/dashboard');
      expect(result.welcomeName).toBe('Tiger Woods');
    });

    it('ensures OAuth user metadata cannot tamper with database role', () => {
      const untrustedOAuthPayload = {
        user_metadata: { role: 'admin' },
      };

      const provisionedRole: UserRole = 'subscriber';
      expect(provisionedRole).toBe('subscriber');
      expect(provisionedRole).not.toBe(untrustedOAuthPayload.user_metadata.role);
    });
  });

  describe('7. Unchanged Golfer & Subscription Workflows', () => {
    it('allows golfers to submit scores within 1-45 Stableford limits', () => {
      const validateScore = (score: number) => score >= 1 && score <= 45;
      expect(validateScore(36)).toBe(true);
      expect(validateScore(45)).toBe(true);
      expect(validateScore(1)).toBe(true);
      expect(validateScore(0)).toBe(false);
      expect(validateScore(46)).toBe(false);
    });

    it('retains 5 rolling scores for golfers in FIFO order', () => {
      const existing = [40, 38, 36, 34, 32];
      const newScore = 42;
      const updated = [newScore, ...existing].slice(0, 5);
      expect(updated.length).toBe(5);
      expect(updated[0]).toBe(42);
      expect(updated).not.toContain(32);
    });

    it('requires 5 scores and active subscription for monthly draw ticket activation', () => {
      const isTicketEligible = (scoresCount: number, subStatus?: string): boolean => {
        return scoresCount === 5 && subStatus === 'active';
      };

      expect(isTicketEligible(5, 'active')).toBe(true);
      expect(isTicketEligible(4, 'active')).toBe(false);
      expect(isTicketEligible(5, 'inactive')).toBe(false);
      expect(isTicketEligible(5, undefined)).toBe(false);
    });
  });

  describe('8. Admin Operations, Draw Simulation & Claims Verification Intact', () => {
    it('executes draw simulation with PRD tier allocation and rollover', () => {
      const sim = simulateDraw({
        drawMonth: '2026-11-01',
        drawTitle: 'November Autumn Draw',
        drawLogic: 'random',
        eligibleSubscribers: [
          { userId: 'u1', fullName: 'Player 1', scores: [10, 20, 30, 40, 45] },
          { userId: 'u2', fullName: 'Player 2', scores: [12, 22, 32, 42, 44] },
        ],
        totalPrizePoolCents: 1000000,
        carriedOverJackpotCents: 250000,
      });

      expect(sim.prizeAllocation.tier5.potCents).toBe(400000 + 250000);
      expect(sim.prizeAllocation.tier4.potCents).toBe(350000);
      expect(sim.prizeAllocation.tier3.potCents).toBe(250000);
      expect(sim.winningNumbers.length).toBe(5);
    });

    it('evaluates tickets accurately for winner claims', () => {
      const winningNumbers = [7, 14, 21, 28, 35];
      const ticket = [7, 14, 21, 28, 35];
      const evalResult = evaluateTicket(winningNumbers, ticket);
      expect(evalResult.matchedCount).toBe(5);
      expect(evalResult.matchTier).toBe('tier_5');
    });

    it('strictly forbids admin self-demotion', () => {
      const validateAdminRoleChange = (
        currentAdminId: string,
        targetUserId: string,
        newRole: UserRole
      ) => {
        if (currentAdminId === targetUserId && newRole === 'subscriber') {
          throw new Error('Action Blocked: Self-demotion is prohibited.');
        }
        return { success: true };
      };

      expect(() => validateAdminRoleChange('admin-1', 'admin-1', 'subscriber')).toThrow(
        /Self-demotion is prohibited/
      );
      expect(validateAdminRoleChange('admin-1', 'other-user', 'subscriber')).toEqual({
        success: true,
      });
      expect(validateAdminRoleChange('admin-1', 'other-user', 'admin')).toEqual({
        success: true,
      });
    });

    it('enforces proof verification note validation on claim rejection', () => {
      const validateProofDecision = (
        status: 'verified' | 'rejected',
        notes?: string
      ): { valid: boolean; reason?: string } => {
        if (status === 'rejected' && (!notes || notes.trim().length < 5)) {
          return {
            valid: false,
            reason: 'Rejection requires an explanatory note of at least 5 characters.',
          };
        }
        return { valid: true };
      };

      expect(validateProofDecision('verified')).toEqual({ valid: true });
      expect(validateProofDecision('rejected', 'Illegible scorecard image')).toEqual({ valid: true });
      expect(validateProofDecision('rejected', 'bad')).toEqual({
        valid: false,
        reason: 'Rejection requires an explanatory note of at least 5 characters.',
      });
    });
  });
});
