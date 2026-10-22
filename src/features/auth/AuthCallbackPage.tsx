import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, env } from "../../lib/supabase";
import { authService } from "../../services/authService";
import { useToast } from "../../context/ToastContext";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  LogIn,
  RefreshCw,
} from "lucide-react";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const processAuth = async () => {

      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const err = searchParams.get("error") || hashParams.get("error");
      const errDescription =
        searchParams.get("error_description") ||
        hashParams.get("error_description");

      if (err) {
        let friendlyMessage =
          "Google authentication was cancelled or could not be completed.";
        if (err === "access_denied") {
          friendlyMessage =
            "Google sign-in was cancelled or access was denied.";
        } else if (errDescription) {
          friendlyMessage = decodeURIComponent(
            errDescription.replace(/\+/g, " "),
          );
        }
        if (!isCancelled) {
          setErrorMessage(friendlyMessage);
          setIsProcessing(false);
          toastError("Authentication Failed", friendlyMessage);
        }
        return;
      }

      if (!env.isSupabaseConfigured) {
        if (!isCancelled) {
          setErrorMessage(
            "Supabase is not configured. Please check your environment variables.",
          );
          setIsProcessing(false);
        }
        return;
      }

      try {

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.user) {

          const profile = await authService.ensureUserProfile(session.user);
          if (!isCancelled) {
            const isAdminUser = profile.role === "admin";
            success(
              "Signed In",
              `Welcome, ${profile.full_name || (isAdminUser ? "Administrator" : "Golfer")}!`
            );
            navigate(isAdminUser ? "/admin" : "/dashboard", { replace: true });
          }
          return;
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === "SIGNED_IN" && newSession?.user) {
            subscription.unsubscribe();
            const profile = await authService.ensureUserProfile(
              newSession.user,
            );
            if (!isCancelled) {
              const isAdminUser = profile.role === "admin";
              success(
                "Signed In",
                `Welcome, ${profile.full_name || (isAdminUser ? "Administrator" : "Golfer")}!`
              );
              navigate(isAdminUser ? "/admin" : "/dashboard", { replace: true });
            }
          }
        });

        const timer = setTimeout(() => {
          if (!isCancelled && isProcessing) {
            subscription.unsubscribe();
            setErrorMessage(
              "Session exchange timed out. Please try signing in again.",
            );
            setIsProcessing(false);
          }
        }, 8000);

        return () => {
          clearTimeout(timer);
          subscription.unsubscribe();
        };
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "An error occurred during session verification.";
          setErrorMessage(msg);
          setIsProcessing(false);
          toastError("Authentication Error", msg);
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
      <div className="ac-wrapper">
        <div className="ac-bg-decor" aria-hidden="true">
          <div className="ac-orb ac-orb-1" />
          <div className="ac-orb ac-orb-2" />
          <div className="ac-grid-overlay" />
        </div>

        <Card className="ac-card">
          {isProcessing && !errorMessage ? (
            <div className="ac-state ac-state-processing">
              <div className="ac-icon-badge ac-icon-processing">
                <span className="ac-pulse-ring" />
                <span className="ac-pulse-ring ac-pulse-ring-delay" />
                <Loader2 size={30} className="ac-spin" />
              </div>

              <Badge variant="forest" className="ac-badge-pop">
                Authenticating
              </Badge>

              <h3 className="ac-title">
                Verifying your GreenPulse session
                <span className="ac-ellipsis">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </h3>

              <p className="ac-subtext">
                Please wait while we establish your secure golfer workspace and
                retrieve your profile.
              </p>

              <div className="ac-progress-track">
                <div className="ac-progress-fill" />
              </div>

              <div className="ac-steps">
                <div className="ac-step ac-step-active">
                  <ShieldCheck size={13} />
                  <span>Verify</span>
                </div>
                <div className="ac-step-sep" />
                <div className="ac-step ac-step-active">
                  <UserCheck size={13} />
                  <span>Provision</span>
                </div>
                <div className="ac-step-sep" />
                <div className="ac-step">
                  <ArrowRight size={13} />
                  <span>Redirect</span>
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="ac-state ac-state-error">
              <div className="ac-icon-badge ac-icon-error">
                <span className="ac-error-ring" />
                <AlertCircle size={30} />
              </div>

              <Badge variant="error" className="ac-badge-pop">
                Authentication Problem
              </Badge>

              <h3 className="ac-title-error">Sign-In Could Not Be Completed</h3>

              <p className="ac-error-text">{errorMessage}</p>

              <div className="ac-actions">
                <Button
                  variant="primary"
                  className="ac-btn-primary"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  <LogIn size={16} />
                  Return to Sign In
                </Button>
                <Button
                  variant="outline"
                  className="ac-btn-retry"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw size={16} />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="ac-state ac-state-success">
              <div className="ac-icon-badge ac-icon-success">
                <span className="ac-success-ring" />
                <span className="ac-success-ring ac-success-ring-delay" />
                <CheckCircle2 size={30} />
              </div>

              <h3 className="ac-title-success">Authentication Confirmed</h3>
              <p className="ac-subtext">
                Redirecting to your workspace...
              </p>

              <div className="ac-progress-track ac-progress-track-success">
                <div className="ac-progress-fill-success" />
              </div>
            </div>
          )}
        </Card>
      </div>

      <style>{`
        .ac-wrapper {
          position: relative;
          margin-top: var(--space-12);
          display: flex;
          justify-content: center;
          isolation: isolate;
        }

        .ac-bg-decor {
          position: absolute;
          inset: -60px -20px;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          border-radius: var(--radius-xl, 24px);
        }

        .ac-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(50px);
          opacity: 0.35;
          animation: acOrbFloat 9s ease-in-out infinite;
        }

        .ac-orb-1 {
          width: 220px;
          height: 220px;
          top: -60px;
          left: -40px;
          background: radial-gradient(circle, #43a047, transparent 70%);
          animation-delay: 0s;
        }

        .ac-orb-2 {
          width: 260px;
          height: 260px;
          bottom: -80px;
          right: -60px;
          background: radial-gradient(circle, #2e7d32, transparent 70%);
          animation-delay: 2.5s;
        }

        .ac-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(46, 125, 50, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(46, 125, 50, 0.04) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: radial-gradient(ellipse at center, black 40%, transparent 85%);
        }

        @keyframes acOrbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(12px, -14px) scale(1.08); }
        }

        .ac-card {
          position: relative;
          z-index: 1;
          padding: var(--space-8);
          text-align: center;
          width: 100%;
          max-width: 460px;
          border-radius: var(--radius-xl, 20px) !important;
          background: linear-gradient(180deg, var(--bg-surface-warm, #fff) 0%, rgba(255,255,255,0.9) 100%);
          backdrop-filter: blur(6px);
          box-shadow: 0 10px 40px -12px rgba(0,0,0,0.12), 0 0 0 1px var(--border-default, rgba(0,0,0,0.06));
          animation: acCardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes acCardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ac-state {
          animation: acFadeSwap 0.4s ease;
        }

        @keyframes acFadeSwap {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ac-icon-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          margin-bottom: var(--space-4);
        }

        .ac-icon-processing {
          background: linear-gradient(135deg, var(--forest-50, #e8f5e9), #d7ecd9);
          color: var(--forest-700, #2e7d32);
        }

        .ac-spin {
          animation: acSpin 1s linear infinite;
        }

        @keyframes acSpin {
          to { transform: rotate(360deg); }
        }

        .ac-pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid var(--forest-400, #66bb6a);
          animation: acPulseRing 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .ac-pulse-ring-delay {
          animation-delay: 1.1s;
        }

        @keyframes acPulseRing {
          0% { transform: scale(0.85); opacity: 0.7; }
          80% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .ac-badge-pop {
          margin-bottom: var(--space-3);
          animation: acBadgePop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }

        @keyframes acBadgePop {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }

        .ac-title {
          color: var(--forest-950);
          margin-bottom: var(--space-2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          flex-wrap: wrap;
        }

        .ac-ellipsis span {
          animation: acDotBlink 1.4s infinite;
          opacity: 0;
        }

        .ac-ellipsis span:nth-child(1) { animation-delay: 0s; }
        .ac-ellipsis span:nth-child(2) { animation-delay: 0.2s; }
        .ac-ellipsis span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes acDotBlink {
          0%, 20% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        .ac-subtext {
          color: var(--charcoal-600);
          font-size: var(--text-sm);
          max-width: 360px;
          margin-inline: auto;
        }

        .ac-progress-track {
          position: relative;
          height: 6px;
          border-radius: var(--radius-full);
          background: var(--forest-50, #e8f5e9);
          overflow: hidden;
          margin: var(--space-5) auto var(--space-4);
          max-width: 280px;
        }

        .ac-progress-fill {
          position: absolute;
          top: 0;
          left: -40%;
          height: 100%;
          width: 40%;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, #2e7d32, #43a047);
          animation: acProgressSlide 1.4s ease-in-out infinite;
        }

        @keyframes acProgressSlide {
          0% { left: -40%; }
          100% { left: 100%; }
        }

        .ac-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          flex-wrap: wrap;
        }

        .ac-step {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: var(--text-xs);
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: var(--bg-surface-warm);
          border: 1px solid var(--border-default);
          transition: all 0.3s ease;
        }

        .ac-step-active {
          color: var(--forest-700);
          background: var(--forest-50, #e8f5e9);
          border-color: rgba(46, 125, 50, 0.25);
        }

        .ac-step-sep {
          width: 14px;
          height: 1px;
          background: var(--border-default);
        }

        .ac-icon-error {
          background: var(--color-error-bg);
          color: var(--color-error);
          animation: acShake 0.5s ease 0.15s;
        }

        @keyframes acShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .ac-error-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid var(--color-error);
          opacity: 0.5;
          animation: acErrorRing 1.8s ease-out infinite;
        }

        @keyframes acErrorRing {
          0% { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        .ac-title-error {
          color: var(--charcoal-900);
          margin-bottom: var(--space-2);
        }

        .ac-error-text {
          color: var(--charcoal-600);
          font-size: var(--text-sm);
          margin-bottom: var(--space-6);
          max-width: 400px;
          margin-inline: auto;
        }

        .ac-actions {
          display: flex;
          gap: var(--space-3);
          justify-content: center;
          flex-wrap: wrap;
        }

        .ac-btn-primary,
        .ac-btn-retry {
          display: inline-flex !important;
          align-items: center;
          gap: 6px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .ac-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px -6px rgba(46, 125, 50, 0.45);
        }

        .ac-btn-retry:hover {
          transform: translateY(-2px) rotate(0.001deg);
        }

        .ac-btn-retry:hover svg {
          animation: acRetrySpin 0.6s ease;
        }

        @keyframes acRetrySpin {
          to { transform: rotate(180deg); }
        }

        .ac-icon-success {
          background: linear-gradient(135deg, var(--forest-50, #e8f5e9), #d7ecd9);
          color: var(--forest-700);
          animation: acSuccessPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes acSuccessPop {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .ac-success-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid var(--forest-400, #66bb6a);
          animation: acPulseRing 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        .ac-success-ring-delay {
          animation-delay: 0.9s;
        }

        .ac-title-success {
          color: var(--forest-950);
          margin-bottom: var(--space-2);
        }

        .ac-progress-track-success {
          max-width: 220px;
        }

        .ac-progress-fill-success {
          height: 100%;
          width: 100%;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, #2e7d32, #43a047);
          transform-origin: left;
          animation: acFillGrow 0.9s ease forwards;
        }

        @keyframes acFillGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ac-orb,
          .ac-spin,
          .ac-pulse-ring,
          .ac-ellipsis span,
          .ac-progress-fill,
          .ac-error-ring,
          .ac-success-ring,
          .ac-card,
          .ac-state {
            animation: none !important;
          }
        }
      `}</style>
    </PageContainer>
  );
};
