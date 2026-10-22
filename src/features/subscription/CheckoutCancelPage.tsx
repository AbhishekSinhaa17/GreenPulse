import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { XCircle, ArrowLeft, Heart, RotateCcw } from 'lucide-react';

export const CheckoutCancelPage: React.FC = () => {
  return (
    <PageContainer narrow>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <Badge variant="neutral" style={{ marginBottom: 'var(--space-2)' }}>
          Checkout Session Ended
        </Badge>
        <h2 style={{ fontSize: 'var(--text-3xl)', color: 'var(--charcoal-900)', marginBottom: 'var(--space-2)' }}>
          Checkout Was Cancelled
        </h2>
        <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-base)' }}>
          No funds were charged and no changes were made to your membership or donation records.
        </p>
      </div>

      <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--charcoal-100)',
            color: 'var(--charcoal-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto var(--space-4)',
          }}
        >
          <XCircle size={36} />
        </div>

        <h3 style={{ color: 'var(--charcoal-900)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>
          Payment Incomplete
        </h3>

        <p style={{ color: 'var(--charcoal-600)', fontSize: 'var(--text-sm)', maxWidth: '440px', margin: '0 auto var(--space-6)' }}>
          You exited the hosted Stripe payment gateway before finalizing your transaction. You can return whenever you are ready to join or contribute.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/subscribe">
            <Button variant="primary" size="md" leftIcon={<RotateCcw size={16} />}>
              Try Membership Checkout Again
            </Button>
          </Link>
          <Link to="/charities">
            <Button variant="outline" size="md" leftIcon={<Heart size={16} />}>
              Browse Partner Charities
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="ghost" size="md" leftIcon={<ArrowLeft size={16} />}>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
};
