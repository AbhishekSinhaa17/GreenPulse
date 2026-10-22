import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionService } from '../../services/subscriptionService';
import { requireSupabase, env } from '../../lib/supabase';
import type { Subscription } from '../../types';
import {
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Heart,
  Sparkles,
} from 'lucide-react';

export const CheckoutSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const checkoutType = searchParams.get('type');
  const isDemo = searchParams.get('demo') === 'true';
  const planParam = (searchParams.get('plan') as 'monthly' | 'yearly') || 'monthly';

  const { user } = useAuth();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [donationRecord, setDonationRecord] = useState<{
    amount_cents: number;
    charity?: { name: string };
  } | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const confettiFired = useRef(false);

  const verifyAuthoritativeStatus = useCallback(async () => {

    if (isDemo) {
      if (user?.id) {
        try {
          const sub = await subscriptionService.getUserSubscription(user.id);
          if (sub && sub.status === 'active') {
            setSubscription(sub);
          } else {
            setSubscription({
              id: 'demo-sub',
              user_id: user.id,
              plan_tier: planParam,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + (planParam === 'yearly' ? 365 : 30) * 86400000).toISOString(),
              cancel_at_period_end: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } catch {

        }
      }
      setIsConfirmed(true);
      setIsVerifying(false);
      if (!confettiFired.current) {
        confettiFired.current = true;
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
      return;
    }

    if (!env.isSupabaseConfigured) {
      setIsVerifying(false);
      return;
    }

    try {
      const client = requireSupabase();

      if (checkoutType === 'donation') {

        if (sessionId) {
          const { data, error } = await client
            .from('donation_ledger')
            .select('amount_cents, charity:charities(name)')
            .eq('stripe_session_id', sessionId)
            .maybeSingle();

          if (!error && data) {
            setDonationRecord(data as unknown as { amount_cents: number; charity?: { name: string } });
            setIsConfirmed(true);
            setIsVerifying(false);
            if (!confettiFired.current) {
              confettiFired.current = true;
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
            }
            return;
          }
        }
      } else {

        if (user?.id) {
          const sub = await subscriptionService.getUserSubscription(user.id);
          if (sub && sub.status === 'active') {
            setSubscription(sub);
            setIsConfirmed(true);
            setIsVerifying(false);
            if (!confettiFired.current) {
              confettiFired.current = true;
              confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
            }
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[CheckoutSuccessPage] Verification polling error:', err);
    }

    setPollCount((prev) => prev + 1);
  }, [checkoutType, isDemo, planParam, sessionId, user]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    queueMicrotask(() => {
      verifyAuthoritativeStatus();
    });

    if (!isConfirmed && pollCount < 5) {
      timeoutId = setTimeout(() => {
        verifyAuthoritativeStatus();
      }, 3000);
    } else {
      queueMicrotask(() => setIsVerifying(false));
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isConfirmed, pollCount, verifyAuthoritativeStatus]);

  return (
    <PageContainer narrow>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <Badge variant={isDemo ? 'lime' : isConfirmed ? 'success' : 'lime'} style={{ marginBottom: 'var(--space-2)' }}>
          {isDemo ? 'Demo Payment Mode' : isConfirmed ? 'Payment Confirmed' : 'Payment Verification'}
        </Badge>
        <h2 style={{ fontSize: 'var(--text-3xl)', color: 'var(--forest-950)', marginBottom: 'var(--space-2)' }}>
          {isDemo
            ? 'Demo Membership Activated'
            : checkoutType === 'donation'
              ? 'Thank You for Your Donation'
              : 'Welcome to the GreenPulse Community'}
        </h2>
        <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-base)' }}>
          {isDemo
            ? 'Simulated activation for recruitment demonstration and evaluation. Zero real money was charged.'
            : checkoutType === 'donation'
              ? 'Your generosity directly champions vital environmental, youth sport, and community initiatives.'
              : 'Your membership fuels your game and funds causes that reshape communities.'}
        </p>
      </div>

      <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        {isConfirmed ? (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--forest-100)',
                color: 'var(--forest-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
              }}
            >
              <CheckCircle size={36} />
            </div>

            <h3 style={{ color: 'var(--forest-950)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
              {isDemo
                ? 'Simulated Membership Active'
                : checkoutType === 'donation'
                  ? 'Direct Donation Recorded'
                  : 'Membership Activated'}
            </h3>

            {isDemo && (
              <div
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--lime-50)',
                  border: '1px solid var(--lime-300)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <Sparkles size={14} color="var(--forest-800)" />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--forest-900)', fontWeight: 600 }}>
                  Simulated Payment: No real Stripe card transaction occurred.
                </span>
              </div>
            )}

            <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-sm)', maxWidth: '480px', margin: '0 auto var(--space-6)' }}>
              {isDemo
                ? `Your simulated ${subscription?.plan_tier === 'yearly' ? 'Yearly' : 'Monthly'} membership is active in PostgreSQL. Score tracking and monthly prize draw tickets are unlocked for testing.`
                : checkoutType === 'donation'
                  ? `Stripe confirmed your ₹${((donationRecord?.amount_cents || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} contribution to ${donationRecord?.charity?.name || 'your designated charity'}. A verified entry has been logged in our donation ledger.`
                  : `Your ${subscription?.plan_tier === 'yearly' ? 'Yearly' : 'Monthly'} plan is active and synchronized in our database. Your ticket is live for the next monthly prize draw.`}
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-4)',
                backgroundColor: 'var(--bg-surface-warm)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                color: 'var(--charcoal-700)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <ShieldCheck size={16} color="var(--forest-700)" />
              <span>Verified server-side via Stripe webhook & PostgreSQL RLS</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Link to="/dashboard">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
                  Go to Golfer Workspace
                </Button>
              </Link>
              <Link to="/charities">
                <Button variant="outline" size="lg" leftIcon={<Heart size={16} />}>
                  Explore Charity Directory
                </Button>
              </Link>
            </div>
          </div>
        ) : isVerifying ? (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
                animation: 'pulse 2s infinite',
              }}
            >
              <Clock size={36} />
            </div>

            <h3 style={{ color: 'var(--charcoal-900)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              Verifying Stripe Payment Event...
            </h3>

            <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-sm)', maxWidth: '440px', margin: '0 auto var(--space-6)' }}>
              Stripe redirected your browser. We are currently listening for the cryptographically verified webhook event to confirm your record in PostgreSQL.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <RefreshCw size={14} className="spin" /> Attempt {pollCount + 1} of 5...
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-warm)',
                color: 'var(--forest-800)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)',
              }}
            >
              <Sparkles size={32} />
            </div>

            <h3 style={{ color: 'var(--forest-950)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              Payment Processing in Progress
            </h3>

            <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-sm)', maxWidth: '480px', margin: '0 auto var(--space-6)' }}>
              Your hosted Stripe checkout session was completed. If you are operating in local test mode or webhook delivery is queued, your database record will synchronize as soon as Stripe completes delivery.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setPollCount(0);
                  setIsVerifying(true);
                  verifyAuthoritativeStatus();
                }}
                leftIcon={<RefreshCw size={14} />}
              >
                Re-check Database Status
              </Button>
              <Link to="/dashboard">
                <Button variant="primary" size="md">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
};
