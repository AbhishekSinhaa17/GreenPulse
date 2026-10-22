import type { UserRole } from '../types';

/**
 * Evaluates whether a user's role satisfies the required route role.
 * Role Hierarchy: 'admin' is a superset of 'subscriber'.
 * - An 'admin' satisfies both 'admin' and 'subscriber' requirements.
 * - A 'subscriber' satisfies 'subscriber' requirements only.
 */
export const isRoleAuthorized = (
  userRole: UserRole | null | undefined,
  requiredRole?: 'subscriber' | 'admin'
): boolean => {
  if (!requiredRole) return true;
  if (!userRole) return false;
  if (requiredRole === 'admin') {
    return userRole === 'admin';
  }
  if (requiredRole === 'subscriber') {
    return userRole === 'subscriber' || userRole === 'admin';
  }
  return false;
};
