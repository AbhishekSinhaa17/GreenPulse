import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { AlertCircle } from 'lucide-react';

interface AuthPageProps {
  mode: 'login' | 'signup' | 'subscribe';
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const { success } = useToast();
  const { signIn, signUp, signInWithGoogle, isConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(location.search);
    const err = params.get('error_description') || params.get('error');
    if (!err) return null;
    return err === 'access_denied'
      ? 'Google sign-in was cancelled or access was denied.'
      : decodeURIComponent(err.replace(/\+/g, ' '));
  });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleGoogleSignIn = async () => {
    setFormError(null);
    if (!isConfigured) {
      setFormError(
        'Supabase credentials are not configured in .env. Please connect a Supabase project to perform real authentication.'
      );
      return;
    }

    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Supabase OAuth redirects the browser window
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      const message = err instanceof Error ? err.message : 'An error occurred during Google sign in.';
      setFormError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    if (mode !== 'login' && !fullName.trim()) {
      setFormError('Please enter your full name for membership registration.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    if (!isConfigured) {
      setFormError(
        'Supabase credentials are not configured in .env. Please connect a Supabase project to perform real authentication.'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        success('Signed In', 'Welcome back to your golfer workspace.');
        navigate(from, { replace: true });
      } else {
        await signUp(email, password, fullName);
        success('Account Created', 'Registration successful. Welcome to GreenPulse!');
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer narrow>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <Badge variant="forest" style={{ marginBottom: 'var(--space-2)' }}>
          {mode === 'login' ? 'Member Access' : 'Join GreenPulse'}
        </Badge>
        <h2>
          {mode === 'login'
            ? 'Sign in to your golfer workspace'
            : 'Play with purpose. Create lasting impact.'}
        </h2>
        <p>
          {mode === 'login'
            ? 'Access your Stableford scores, draw participation, and charity impact.'
            : 'Select your membership plan and direct part of your fee to causes you care about.'}
        </p>
      </div>

      <Card>
        {/* Membership Plan Switcher for Signup/Subscribe (§ 04) */}
        {mode !== 'login' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-6)',
              padding: 'var(--space-1)',
              backgroundColor: 'var(--bg-surface-warm)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div
              onClick={() => setPlan('monthly')}
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: plan === 'monthly' ? 'var(--bg-surface)' : 'transparent',
                boxShadow: plan === 'monthly' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--charcoal-900)' }}>
                Monthly Plan
              </div>
              <div style={{ fontFamily: 'var(--font-numeric)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--forest-800)' }}>
                £19 / mo
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Min 10% to Charity
              </div>
            </div>

            <div
              onClick={() => setPlan('yearly')}
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: plan === 'yearly' ? 'var(--bg-surface)' : 'transparent',
                boxShadow: plan === 'yearly' ? 'var(--shadow-sm)' : 'none',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all var(--transition-fast)',
                position: 'relative',
              }}
            >
              <Badge variant="lime" size="sm" style={{ position: 'absolute', top: '-10px', right: '10px' }}>
                Save 17%
              </Badge>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--charcoal-900)' }}>
                Yearly Plan
              </div>
              <div style={{ fontFamily: 'var(--font-numeric)', fontWeight: 700, fontSize: 'var(--text-xl)', color: 'var(--forest-800)' }}>
                £190 / yr
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 500 }}>
                2 Months Free
              </div>
            </div>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-error-bg)',
              border: '1px solid var(--color-error-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: 'var(--color-error)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        {/* Google OAuth Login Button */}
        <Button
          variant="outline"
          type="button"
          onClick={handleGoogleSignIn}
          isLoading={isGoogleLoading}
          disabled={isLoading || isGoogleLoading}
          className="w-full"
          aria-label={mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--charcoal-900)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-3) var(--space-4)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition-fast)',
            cursor: isLoading || isGoogleLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>
            {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
          </span>
        </Button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: 'var(--space-5) 0',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          <span
            style={{
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--charcoal-500)',
              fontWeight: 600,
            }}
          >
            Or with email
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          {mode !== 'login' && (
            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Marcus Reid"
              required
            />
          )}

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@golfclub.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            hint="Minimum 6 characters."
            required
          />

          <Button
            variant="primary"
            type="submit"
            className="w-full"
            isLoading={isLoading}
            style={{ marginTop: 'var(--space-4)' }}
          >
            {mode === 'login' ? 'Sign In to Workspace' : 'Create Account & Continue'}
          </Button>
        </form>

        <div
          style={{
            marginTop: 'var(--space-6)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: 'var(--text-sm)',
            color: 'var(--charcoal-600)',
          }}
        >
          {mode === 'login' ? (
            <span>
              Don't have an account yet?{' '}
              <Link to="/subscribe" style={{ color: 'var(--forest-800)', fontWeight: 600 }}>
                Join GreenPulse
              </Link>
            </span>
          ) : (
            <span>
              Already a subscriber?{' '}
              <Link to="/login" style={{ color: 'var(--forest-800)', fontWeight: 600 }}>
                Sign In
              </Link>
            </span>
          )}
        </div>
      </Card>
    </PageContainer>
  );
};
