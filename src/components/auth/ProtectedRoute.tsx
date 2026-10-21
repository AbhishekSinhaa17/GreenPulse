import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageContainer } from '../layout/PageContainer';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'subscriber' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, role, isLoading, isConfigured } = useAuth();
  const location = useLocation();

  // If Supabase is unconfigured, allow previewing routes with warning banner rather than locking the user out
  if (!isConfigured) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid var(--forest-100)',
              borderTopColor: 'var(--forest-800)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
            Verifying secure session...
          </p>
        </div>
      </PageContainer>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a specific role is required (e.g. 'admin') and user does not have it:
  if (requiredRole && role !== requiredRole) {
    return (
      <PageContainer narrow>
        <Card style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-error-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              color: 'var(--color-error)',
            }}
          >
            <ShieldAlert size={28} />
          </div>

          <Badge variant="error" style={{ marginBottom: 'var(--space-2)' }}>
            403 · Access Denied
          </Badge>
          <h2>Administrator Privilege Required</h2>
          <p style={{ maxWidth: '440px', margin: '0 auto var(--space-6)', fontSize: 'var(--text-sm)' }}>
            Your account ({user.email}) is registered as a <strong>{role || 'subscriber'}</strong>.
            Access to the platform operations and draw console requires administrator authorization.
          </p>

          <Link to="/dashboard">
            <Button variant="primary" leftIcon={<ArrowLeft size={16} />}>
              Return to Golfer Dashboard
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  return <>{children}</>;
};
