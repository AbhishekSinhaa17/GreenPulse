import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';

export const AuthPage: React.FC<{ mode: 'login' | 'signup' | 'subscribe' }> = ({ mode }) => {
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Missing Fields', 'Please enter your email and password.');
      return;
    }
    success(
      mode === 'login' ? 'Signed In' : 'Account Created',
      `Welcome to GreenPulse. Redirecting to your golfer workspace.`
    );
    navigate('/dashboard');
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

        <form onSubmit={handleSubmit}>
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
            required
          />

          <Button variant="primary" type="submit" className="w-full" style={{ marginTop: 'var(--space-4)' }}>
            {mode === 'login' ? 'Sign In to Workspace' : 'Continue to Charity Selection'}
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
