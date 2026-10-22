import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { PageContainer } from '../layout/PageContainer';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { isRoleAuthorized } from '../../utils/rbac';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'subscriber' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, role, isLoading, isConfigured, refreshProfile } = useAuth();
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasAutoRefreshed = React.useRef(false);

  // Auto-refresh profile if an admin role is required but current role is not admin yet,
  // protecting against stale sessions right after an admin promotion.
  useEffect(() => {
    let isMounted = true;
    if (isConfigured && user && requiredRole === 'admin' && role !== 'admin' && !hasAutoRefreshed.current) {
      hasAutoRefreshed.current = true;
      setIsRefreshing(true);
      refreshProfile().finally(() => {
        if (isMounted) setIsRefreshing(false);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isConfigured, user, requiredRole, role, refreshProfile]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setIsRefreshing(false);
    }
  };

  // If Supabase is unconfigured, fail closed for admin routes to prevent unauthorized access
  if (!isConfigured) {
    if (requiredRole === 'admin') {
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
              Configuration Required · Access Locked
            </Badge>
            <h2>Admin Console Locked</h2>
            <p style={{ maxWidth: '440px', margin: '0 auto var(--space-6)', fontSize: 'var(--text-sm)' }}>
              Administrative operations cannot be accessed while Supabase connection is unconfigured.
              Role resolution and database-level authorization must be verifiable before administrator access can be granted.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <Link to="/">
                <Button variant="primary" leftIcon={<ArrowLeft size={16} />}>
                  Return to Home
                </Button>
              </Link>
            </div>
          </Card>
        </PageContainer>
      );
    }
    return <>{children}</>;
  }

  if (isLoading || isRefreshing) {
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
            {isRefreshing ? 'Refreshing permissions...' : 'Verifying secure session...'}
          </p>
        </div>
      </PageContainer>
    );
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Hierarchical authorization check
  const authorized = isRoleAuthorized(role, requiredRole);

  if (!authorized) {
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
            Your account ({user.email}) is currently registered as a <strong>{role || 'subscriber'}</strong>.
            Access to this operations console requires verified administrator authorization.
          </p>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard">
              <Button variant="primary" leftIcon={<ArrowLeft size={16} />}>
                Return to Golfer Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              leftIcon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
              disabled={isRefreshing}
            >
              Re-check Permissions
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return <>{children}</>;
};
