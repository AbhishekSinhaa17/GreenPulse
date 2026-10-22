import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ConfigBanner } from './components/ui/ConfigBanner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import { LandingPage } from './features/landing/LandingPage';
import { CharitiesPage } from './features/charities/CharitiesPage';
import { DrawsPage } from './features/draws/DrawsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AdminPage } from './features/admin/AdminPage';
import { AuthPage } from './features/auth/AuthPage';
import { AuthCallbackPage } from './features/auth/AuthCallbackPage';
import { SubscriptionPage } from './features/subscription/SubscriptionPage';
import { CheckoutSuccessPage } from './features/subscription/CheckoutSuccessPage';
import { CheckoutCancelPage } from './features/subscription/CheckoutCancelPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <ConfigBanner />
            <Navbar />
            <div style={{ flex: 1 }}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/charities" element={<CharitiesPage />} />
                <Route path="/draws" element={<DrawsPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requiredRole="subscriber">
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/signup" element={<AuthPage mode="signup" />} />
                <Route path="/subscribe" element={<SubscriptionPage />} />
                <Route path="/subscribe/success" element={<CheckoutSuccessPage />} />
                <Route path="/subscribe/cancel" element={<CheckoutCancelPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
