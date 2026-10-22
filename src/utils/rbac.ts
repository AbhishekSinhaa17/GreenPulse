import type { UserRole } from '../types';

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
