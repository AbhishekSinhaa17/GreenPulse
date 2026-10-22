import { describe, it, expect, vi } from 'vitest';
import { isRoleAuthorized } from '../src/utils/rbac';
import type { UserRole } from '../src/types';

describe('Admin 403 Authorization Mismatch & RBAC Guards (Regression Suite)', () => {
  describe('Hierarchical Route Role Authorization (isRoleAuthorized)', () => {
    it('authorizes an admin for admin-protected routes', () => {
      const authorized = isRoleAuthorized('admin', 'admin');
      expect(authorized).toBe(true);
    });

    it('REGRESSION FIX: authorizes an admin for subscriber-protected routes (e.g. /dashboard)', () => {
      // Prior bug: ProtectedRoute checked `role !== requiredRole` ('admin' !== 'subscriber' -> true),
      // which caused admins to be served a 403 Access Denied on /dashboard while header showed Admin.
      const authorized = isRoleAuthorized('admin', 'subscriber');
      expect(authorized).toBe(true);
    });

    it('authorizes a subscriber for subscriber-protected routes', () => {
      const authorized = isRoleAuthorized('subscriber', 'subscriber');
      expect(authorized).toBe(true);
    });

    it('STRICT RBAC: strictly denies a subscriber access to admin-protected routes (/admin)', () => {
      const authorized = isRoleAuthorized('subscriber', 'admin');
      expect(authorized).toBe(false);
    });

    it('strictly denies unauthenticated / null role access to any protected route', () => {
      expect(isRoleAuthorized(null, 'admin')).toBe(false);
      expect(isRoleAuthorized(null, 'subscriber')).toBe(false);
      expect(isRoleAuthorized(undefined, 'admin')).toBe(false);
      expect(isRoleAuthorized(undefined, 'subscriber')).toBe(false);
    });

    it('allows access to unprotected routes (requiredRole is undefined)', () => {
      expect(isRoleAuthorized('admin', undefined)).toBe(true);
      expect(isRoleAuthorized('subscriber', undefined)).toBe(true);
      expect(isRoleAuthorized(null, undefined)).toBe(true);
    });

    it('denies unrecognized or arbitrary roles from accessing protected routes', () => {
      // Cast invalid role to simulate malformed client state or tampering
      const invalidRole = 'moderator' as unknown as UserRole;
      expect(isRoleAuthorized(invalidRole, 'admin')).toBe(false);
      expect(isRoleAuthorized(invalidRole, 'subscriber')).toBe(false);
    });
  });

  describe('UI Header & Protected Route Alignment', () => {
    it('ensures the admin header badge and route guard permissions are in sync', () => {
      const profile = {
        id: '99999999-0000-0000-0000-000000000001',
        email: 'verified.admin@greenpulse.org',
        full_name: 'Verified Admin',
        role: 'admin' as UserRole,
      };

      // Header state calculation
      const role = profile.role;
      const isAdmin = role === 'admin';
      expect(isAdmin).toBe(true);

      // Route guard checks for all platform routes:
      // 1. Dashboard route
      const canAccessDashboard = isRoleAuthorized(role, 'subscriber');
      expect(canAccessDashboard).toBe(true);

      // 2. Admin portal route
      const canAccessAdmin = isRoleAuthorized(role, 'admin');
      expect(canAccessAdmin).toBe(true);

      // Invariant: An admin who sees the "Admin" badge in the navbar
      // MUST NOT receive 403 on either /dashboard or /admin.
      expect(isAdmin && canAccessDashboard && canAccessAdmin).toBe(true);
    });

    it('ensures subscriber users are blocked from admin portal but allowed on dashboard', () => {
      const subscriberProfile = {
        id: '88888888-0000-0000-0000-000000000002',
        email: 'golfer@example.org',
        full_name: 'Regular Golfer',
        role: 'subscriber' as UserRole,
      };

      const role = subscriberProfile.role;
      const isAdmin = role === 'admin';
      expect(isAdmin).toBe(false);

      const canAccessDashboard = isRoleAuthorized(role, 'subscriber');
      const canAccessAdmin = isRoleAuthorized(role, 'admin');

      expect(canAccessDashboard).toBe(true);
      expect(canAccessAdmin).toBe(false);
    });
  });

  describe('Server-Side Admin Verification Invariant (public.is_admin simulation)', () => {
    // Simulates database public.is_admin() check:
    // SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    const simulateDatabaseIsAdmin = (
      authUid: string | null,
      profilesTable: Array<{ id: string; role: string }>
    ): boolean => {
      if (!authUid) return false;
      return profilesTable.some((p) => p.id === authUid && p.role === 'admin');
    };

    it('verifies that database is_admin returns true ONLY when auth.uid matches profiles.id with role admin', () => {
      const databaseProfiles = [
        { id: 'admin-uuid-1', role: 'admin' },
        { id: 'sub-uuid-2', role: 'subscriber' },
      ];

      expect(simulateDatabaseIsAdmin('admin-uuid-1', databaseProfiles)).toBe(true);
      expect(simulateDatabaseIsAdmin('sub-uuid-2', databaseProfiles)).toBe(false);
      expect(simulateDatabaseIsAdmin('unregistered-uuid', databaseProfiles)).toBe(false);
      expect(simulateDatabaseIsAdmin(null, databaseProfiles)).toBe(false);
    });

    it('simulates RPC authorization rejection for non-admin callers', () => {
      const databaseProfiles = [
        { id: 'admin-uuid-1', role: 'admin' },
        { id: 'sub-uuid-2', role: 'subscriber' },
      ];

      const callGetPlatformAnalyticsRpc = (callerUid: string) => {
        if (!simulateDatabaseIsAdmin(callerUid, databaseProfiles)) {
          throw new Error('Unauthorized: Only platform administrators can access analytics.');
        }
        return { total_users: 42, success: true };
      };

      // Admin execution succeeds
      expect(callGetPlatformAnalyticsRpc('admin-uuid-1')).toEqual({
        total_users: 42,
        success: true,
      });

      // Subscriber execution is strictly aborted with Unauthorized exception
      expect(() => callGetPlatformAnalyticsRpc('sub-uuid-2')).toThrow(
        'Unauthorized: Only platform administrators can access analytics.'
      );
    });
  });

  describe('Stale Session Profile Refresh Recovery', () => {
    it('updates authorization decision when profile is refreshed after database promotion', async () => {
      let currentDatabaseRole: UserRole = 'subscriber';

      // Mock user profile fetch from database
      const mockGetUserProfile = vi.fn().mockImplementation(async () => {
        return {
          id: 'upgraded-user-uuid',
          email: 'promoted@greenpulse.org',
          full_name: 'Promoted User',
          role: currentDatabaseRole,
        };
      });

      // Initial state: user is subscriber
      let clientRole: UserRole = 'subscriber';
      expect(isRoleAuthorized(clientRole, 'admin')).toBe(false);

      // Database role is changed to 'admin' (e.g. via bootstrap_initial_admin)
      currentDatabaseRole = 'admin';

      // Client performs refreshProfile()
      const refreshedProfile = await mockGetUserProfile('upgraded-user-uuid');
      clientRole = refreshedProfile.role;

      // Access is now successfully granted
      expect(isRoleAuthorized(clientRole, 'admin')).toBe(true);
      expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    });
  });
});
