import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, env } from '../../lib/supabase';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const processAuth = async () => {
      // 1. Check for errors in query params or URL hash
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const err = searchParams.get('error') || hashParams.get('error');
      const errDescription = searchParams.get('error_description') || hashParams.get('error_description');

      if (err) {
        let friendlyMessage = 'Google authentication was cancelled or could not be completed.';
        if (err === 'access_denied') {
          friendlyMessage = 'Google sign-in was cancelled or access was denied.';
        } else if (errDescription) {
          friendlyMessage = decodeURIComponent(errDescription.replace(/\+/g, ' '));
        }
        if (!isCancelled) {
          setErrorMessage(friendlyMessage);
          setIsProcessing(false);
          toastError('Authentication Failed', friendlyMessage);
        }
        return;
      }

      if (!env.isSupabaseConfigured) {
        if (!isCancelled) {
          setErrorMessage('Supabase is not configured. Please check your environment variables.');
          setIsProcessing(false);
        }
        return;
      }

      try {
        // 2. Retrieve session from Supabase client
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.user) {
          // 3. Ensure profile is provisioned idempotently
          const profile = await authService.ensureUserProfile(session.user);
          if (!isCancelled) {
            success('Signed In', `Welcome, ${profile.full_name || 'Golfer'}!`);
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        // 4. If getSession didn't resolve immediately, listen for onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            subscription.unsubscribe();
            const profile = await authService.ensureUserProfile(newSession.user);
            if (!isCancelled) {
              success('Signed In', `Welcome, ${profile.full_name || 'Golfer'}!`);
              navigate('/dashboard', { replace: true });
            }
          }
        });

        // 5. Timeout safety fallback after 8 seconds
        const timer = setTimeout(() => {
          if (!isCancelled && isProcessing) {
            subscription.unsubscribe();
            setErrorMessage('Session exchange timed out. Please try signing in again.');
            setIsProcessing(false);
          }
        }, 8000);

        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : 'An error occurred during session verification.';
          setErrorMessage(msg);
          setIsProcessing(false);
          toastError('Authentication Error', msg);
        }
      }
    };

    processAuth();

    return () => {
      isCancelled = true;
    };
  }, [navigate, success, toastError, isProcessing]);

  return (
    <PageContainer narrow>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-12)' }}>
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          {isProcessing && !errorMessage ? (
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--forest-50)',
                  color: 'var(--forest-700)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <Loader2 size={32} className="animate-spin" />
              </div>
              <Badge variant="forest" style={{ marginBottom: 'var(--space-3)' }}>
                Authenticating
              </Badge>
              <h3 style={{ color: 'var(--forest-950)', marginBottom: 'var(--space-2)' }}>
                Verifying your GreenPulse session...
              </h3>
              <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-sm)' }}>
                Please wait while we establish your secure golfer workspace and retrieve your profile.
              </p>
            </div>
          ) : errorMessage ? (
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-error-bg)',
                  color: 'var(--color-error)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <AlertCircle size={32} />
              </div>
              <Badge variant="error" style={{ marginBottom: 'var(--space-3)' }}>
                Authentication Problem
              </Badge>
              <h3 style={{ color: 'var(--charcoal-900)', marginBottom: 'var(--space-2)' }}>
                Sign-In Could Not Be Completed
              </h3>
              <p
                style={{
                  color: 'var(--charcoal-600)',
                  fontSize: 'var(--text-sm)',
                  marginBottom: 'var(--space-6)',
                  maxWidth: '420px',
                  marginInline: 'auto',
                }}
              >
                {errorMessage}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => navigate('/login', { replace: true })}>
                  Return to Sign In
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--forest-50)',
                  color: 'var(--forest-700)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ color: 'var(--forest-950)', marginBottom: 'var(--space-2)' }}>
                Authentication Confirmed
              </h3>
              <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-sm)' }}>
                Redirecting to your golfer dashboard...
              </p>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
