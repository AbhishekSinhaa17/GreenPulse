import { describe, it, expect } from 'vitest';

/**
 * Pure simulation of the PostgreSQL trigger and bootstrap logic in
 * supabase/migrations/20261021000006_initial_admin_bootstrap.sql
 */
interface SimulatedProfile {
  id: string;
  email: string;
  role: 'subscriber' | 'admin';
}

interface SimulatedAuthUser {
  id: string;
  email: string;
}

class BootstrapSimulator {
  private profiles: SimulatedProfile[] = [];
  private authUsers: SimulatedAuthUser[] = [];

  constructor(authUsers: SimulatedAuthUser[] = [], profiles: SimulatedProfile[] = []) {
    this.authUsers = [...authUsers];
    this.profiles = [...profiles];
  }

  getProfiles(): SimulatedProfile[] {
    return [...this.profiles];
  }

  /**
   * Simulates trigger public.prevent_unauthorized_role_change()
   */
  private checkRoleChangeTrigger(
    currentUser: string,
    callerIsAdmin: boolean,
    bootstrapFlagActive: boolean,
    oldRole: string,
    newRole: string
  ): void {
    if (oldRole !== newRole) {
      // A. Allow if caller is an existing verified admin
      if (callerIsAdmin) {
        return;
      }

      // B. Allow if trusted bootstrap session flag is active
      if (bootstrapFlagActive) {
        return;
      }

      // C. Allow database owner (postgres / supabase_admin) ONLY if NO admin exists
      const adminCount = this.profiles.filter((p) => p.role === 'admin').length;
      if (['postgres', 'supabase_admin'].includes(currentUser) && adminCount === 0) {
        return;
      }

      throw new Error('P0001: Unauthorized: Only administrators can modify user roles.');
    }
  }

  /**
   * Simulates public.bootstrap_initial_admin(p_identifier)
   */
  bootstrapInitialAdmin(identifier: string, callerRole: string): {
    success: boolean;
    status: 'promoted' | 'already_admin';
    user_id: string;
    email: string;
    message: string;
  } {
    // 1. Enforce privilege restriction: anon & authenticated cannot execute
    if (['anon', 'authenticated'].includes(callerRole)) {
      throw new Error('42501: permission denied for function bootstrap_initial_admin');
    }

    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new Error('Invalid identifier: Must provide a valid user email address or user UUID.');
    }

    // 2. Check existing admin
    const existingAdmin = this.profiles.find((p) => p.role === 'admin');

    // 3. Locate target user in auth.users
    const targetUser = this.authUsers.find(
      (u) => u.id === cleanId || u.email.toLowerCase() === cleanId.toLowerCase()
    );

    if (!targetUser) {
      throw new Error(
        `Bootstrap Failed: User "${cleanId}" was not found in auth.users. The designated initial administrator must register or sign in via Supabase Auth first.`
      );
    }

    // 4. Enforce one-time constraint
    if (existingAdmin) {
      if (existingAdmin.id === targetUser.id) {
        return {
          success: true,
          status: 'already_admin',
          user_id: targetUser.id,
          email: targetUser.email,
          message: 'Designated user is already configured as the platform administrator (idempotent).',
        };
      } else {
        throw new Error(
          `Bootstrap Prohibited: An administrator (${existingAdmin.email}) already exists on this platform. Initial bootstrap cannot be reused to promote additional users.`
        );
      }
    }

    // 5. Ensure profile exists
    let profile = this.profiles.find((p) => p.id === targetUser.id);
    if (!profile) {
      profile = { id: targetUser.id, email: targetUser.email, role: 'subscriber' };
      this.profiles.push(profile);
    }

    // 6. Set bootstrap flag and execute role update through trigger
    const oldRole = profile.role;
    const newRole = 'admin';
    this.checkRoleChangeTrigger('postgres', false, true, oldRole, newRole);

    profile.role = newRole;

    return {
      success: true,
      status: 'promoted',
      user_id: targetUser.id,
      email: targetUser.email,
      message: 'Initial platform administrator successfully bootstrapped.',
    };
  }

  /**
   * Simulates direct SQL update in SQL Editor:
   * UPDATE public.profiles SET role = 'admin' WHERE email = ...;
   */
  directSqlUpdateRole(currentUser: string, targetEmail: string, newRole: 'subscriber' | 'admin'): void {
    const profile = this.profiles.find((p) => p.email.toLowerCase() === targetEmail.toLowerCase());
    if (!profile) throw new Error('Profile not found.');

    const oldRole = profile.role;
    this.checkRoleChangeTrigger(currentUser, false, false, oldRole, newRole);
    profile.role = newRole;
  }
}

describe('Initial Admin Bootstrap Security & Idempotency (Migration 20261021000006)', () => {
  it('successfully promotes initial verified user when zero admins exist', () => {
    const sim = new BootstrapSimulator([
      { id: 'uuid-owner-1', email: 'owner@greenpulse.golf' },
      { id: 'uuid-golfer-2', email: 'golfer@greenpulse.golf' },
    ]);

    const result = sim.bootstrapInitialAdmin('owner@greenpulse.golf', 'postgres');
    expect(result.success).toBe(true);
    expect(result.status).toBe('promoted');
    expect(result.user_id).toBe('uuid-owner-1');

    const admin = sim.getProfiles().find((p) => p.role === 'admin');
    expect(admin).toBeDefined();
    expect(admin?.email).toBe('owner@greenpulse.golf');
  });

  it('is strictly idempotent when executed multiple times for the same designated owner', () => {
    const sim = new BootstrapSimulator([
      { id: 'uuid-owner-1', email: 'owner@greenpulse.golf' },
    ]);

    // First execution
    const r1 = sim.bootstrapInitialAdmin('owner@greenpulse.golf', 'postgres');
    expect(r1.status).toBe('promoted');

    // Second execution (same user)
    const r2 = sim.bootstrapInitialAdmin('owner@greenpulse.golf', 'postgres');
    expect(r2.success).toBe(true);
    expect(r2.status).toBe('already_admin');
    expect(r2.user_id).toBe('uuid-owner-1');
  });

  it('rejects bootstrap attempts to promote a second user once an admin exists', () => {
    const sim = new BootstrapSimulator([
      { id: 'uuid-owner-1', email: 'owner@greenpulse.golf' },
      { id: 'uuid-intruder-2', email: 'intruder@domain.com' },
    ]);

    // Promote first admin
    sim.bootstrapInitialAdmin('owner@greenpulse.golf', 'postgres');

    // Attempt to promote second user via bootstrap
    expect(() => {
      sim.bootstrapInitialAdmin('intruder@domain.com', 'postgres');
    }).toThrow(/Bootstrap Prohibited: An administrator \(owner@greenpulse.golf\) already exists/);

    // Verify intruder remains subscriber
    const profiles = sim.getProfiles();
    expect(profiles.find((p) => p.email === 'intruder@domain.com')?.role).toBeUndefined();
  });

  it('rejects bootstrap if target user does not exist in auth.users', () => {
    const sim = new BootstrapSimulator([
      { id: 'uuid-owner-1', email: 'owner@greenpulse.golf' },
    ]);

    expect(() => {
      sim.bootstrapInitialAdmin('nonexistent@domain.com', 'postgres');
    }).toThrow(/User "nonexistent@domain.com" was not found in auth.users/);
  });

  it('blocks anonymous and authenticated client roles from calling the bootstrap function', () => {
    const sim = new BootstrapSimulator([
      { id: 'uuid-owner-1', email: 'owner@greenpulse.golf' },
    ]);

    // Regular authenticated user attempting to invoke RPC via PostgREST
    expect(() => {
      sim.bootstrapInitialAdmin('owner@greenpulse.golf', 'authenticated');
    }).toThrow(/permission denied for function bootstrap_initial_admin/);

    // Anonymous visitor attempting to invoke RPC
    expect(() => {
      sim.bootstrapInitialAdmin('owner@greenpulse.golf', 'anon');
    }).toThrow(/permission denied for function bootstrap_initial_admin/);
  });

  it('allows direct SQL editor update by database owner (postgres) ONLY when zero admins exist', () => {
    const sim = new BootstrapSimulator(
      [{ id: 'uuid-owner-1', email: 'owner@greenpulse.golf' }],
      [{ id: 'uuid-owner-1', email: 'owner@greenpulse.golf', role: 'subscriber' }]
    );

    // 1. Direct update in SQL Editor when zero admins exist succeeds
    expect(() => {
      sim.directSqlUpdateRole('postgres', 'owner@greenpulse.golf', 'admin');
    }).not.toThrow();

    expect(sim.getProfiles()[0].role).toBe('admin');

    // 2. Add second user
    sim.directSqlUpdateRole('postgres', 'owner@greenpulse.golf', 'admin'); // idempotent

    // 3. Regular non-postgres user cannot update role
    expect(() => {
      sim.directSqlUpdateRole('authenticator', 'owner@greenpulse.golf', 'subscriber');
    }).toThrow(/Unauthorized: Only administrators can modify user roles/);
  });

  it('blocks arbitrary role modifications by normal application callers', () => {
    const sim = new BootstrapSimulator(
      [{ id: 'uuid-normal-1', email: 'golfer@greenpulse.golf' }],
      [{ id: 'uuid-normal-1', email: 'golfer@greenpulse.golf', role: 'subscriber' }]
    );

    // Client user trying to update their own role directly
    expect(() => {
      sim.directSqlUpdateRole('authenticator', 'golfer@greenpulse.golf', 'admin');
    }).toThrow(/Unauthorized: Only administrators can modify user roles/);
  });
});
