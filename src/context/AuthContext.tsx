import React, { useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, env } from '../lib/supabase';
import { authService } from '../services/authService';
import type { UserProfile } from '../types';
import { AuthContext } from './AuthContextDefinition';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(env.isSupabaseConfigured));

  const fetchProfile = useCallback(async (u: User) => {
    try {
      const p = await authService.ensureUserProfile(u);
      setProfile(p);
    } catch (err) {
      console.error('[AuthContext] Failed to load/ensure profile:', err);
      // Fallback: try raw query
      try {
        const raw = await authService.getUserProfile(u.id);
        setProfile(raw);
      } catch {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!env.isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    // 1. Initial session restoration
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfile(initialSession.user).finally(() => {
          if (isMounted) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // 2. Auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: authedUser, session: newSession } = await authService.signIn(email, password);
      setUser(authedUser);
      setSession(newSession);
      if (authedUser) {
        await fetchProfile(authedUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const { user: newUser, session: newSession } = await authService.signUp(email, password, fullName);
      setUser(newUser);
      setSession(newSession);
      if (newUser) {
        await fetchProfile(newUser);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    setIsLoading(true);
    try {
      await authService.signInWithGoogle(redirectTo);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const role = profile?.role ?? null;
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        isLoading,
        isConfigured: env.isSupabaseConfigured,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
