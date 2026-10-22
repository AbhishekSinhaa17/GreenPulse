import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../hooks/useAuth";
import {
  AlertCircle,
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";

interface AuthPageProps {
  mode: "login" | "signup" | "subscribe";
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const { success } = useToast();
  const {
    user,
    profile,
    isLoading: isAuthLoading,
    signIn,
    signUp,
    signInWithGoogle,
    isConfigured,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(location.search);
    const err = params.get("error_description") || params.get("error");
    if (!err) return null;
    return err === "access_denied"
      ? "Google sign-in was cancelled or access was denied."
      : decodeURIComponent(err.replace(/\+/g, " "));
  });

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    "/dashboard";

  // If already authenticated and profile has finished loading, redirect directly to role-appropriate route
  useEffect(() => {
    if (!isAuthLoading && user && profile) {
      const dest = profile.role === "admin" ? "/admin" : "/dashboard";
      navigate(dest, { replace: true });
    }
  }, [isAuthLoading, user, profile, navigate]);

  const handleGoogleSignIn = async () => {
    setFormError(null);
    if (!isConfigured) {
      setFormError(
        "Supabase credentials are not configured in .env. Please connect a Supabase project to perform real authentication.",
      );
      return;
    }

    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Supabase OAuth redirects the browser window
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred during Google sign in.";
      setFormError(message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Please enter both your email address and password.");
      return;
    }

    if (mode !== "login" && !fullName.trim()) {
      setFormError("Please enter your full name for membership registration.");
      return;
    }

    if (password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    if (!isConfigured) {
      setFormError(
        "Supabase credentials are not configured in .env. Please connect a Supabase project to perform real authentication.",
      );
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        const authedProfile = await signIn(email, password);
        const isAdmin = authedProfile?.role === "admin";
        success(
          "Signed In",
          isAdmin
            ? "Welcome to the Operations Console."
            : "Welcome back to your golfer workspace."
        );
        let destination = isAdmin ? "/admin" : "/dashboard";
        if (from && from !== "/login" && from !== "/signup") {
          if (isAdmin) {
            destination = from === "/dashboard" ? "/admin" : from;
          } else {
            destination = from.startsWith("/admin") ? "/dashboard" : from;
          }
        }
        navigate(destination, { replace: true });
      } else {
        await signUp(email, password, fullName);
        success(
          "Account Created",
          "Registration successful. Welcome to GreenPulse!",
        );
        const destination = from && !from.startsWith("/admin") ? from : "/dashboard";
        navigate(destination, { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An error occurred during authentication.";
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer narrow>
      <div className="ap-hero">
        <Badge variant="forest" className="ap-hero-badge">
          <Sparkles size={12} />
          {mode === "login" ? "Member Access" : "Join GreenPulse"}
        </Badge>
        <h2 className="ap-hero-title">
          {mode === "login"
            ? "Sign in to your golfer workspace"
            : "Play with purpose. Create lasting impact."}
        </h2>
        <p className="ap-hero-sub">
          {mode === "login"
            ? "Access your Stableford scores, draw participation, and charity impact."
            : "Select your membership plan and direct part of your fee to causes you care about."}
        </p>
      </div>

      <Card className="ap-card">
        {/* Membership Plan Switcher for Signup/Subscribe */}
        {mode !== "login" && (
          <div className="ap-plan-grid">
            <div
              onClick={() => setPlan("monthly")}
              className={`ap-plan-card ${plan === "monthly" ? "ap-plan-active" : ""}`}
            >
              <div className="ap-plan-name">Monthly Plan</div>
              <div className="ap-plan-price">
                ₹2,090 <span>/ mo</span>
              </div>
              <div className="ap-plan-note">Min 10% to Charity</div>
            </div>

            <div
              onClick={() => setPlan("yearly")}
              className={`ap-plan-card ${plan === "yearly" ? "ap-plan-active" : ""}`}
            >
              <Badge variant="lime" size="sm" className="ap-save-badge">
                Save 17%
              </Badge>
              <div className="ap-plan-name">Yearly Plan</div>
              <div className="ap-plan-price">
                ₹20,900 <span>/ yr</span>
              </div>
              <div className="ap-plan-note ap-plan-note-success">
                2 Months Free
              </div>
            </div>
          </div>
        )}

        {formError && (
          <div role="alert" className="ap-error-banner">
            <AlertCircle size={16} className="ap-error-icon" />
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
          className="w-full ap-google-btn"
          aria-label={
            mode === "login" ? "Sign in with Google" : "Sign up with Google"
          }
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
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
            {mode === "login" ? "Continue with Google" : "Sign up with Google"}
          </span>
        </Button>

        <div className="ap-divider">
          <div className="ap-divider-line" />
          <span className="ap-divider-label">Or with email</span>
          <div className="ap-divider-line" />
        </div>

        <form onSubmit={handleSubmit} className="ap-form">
          {mode !== "login" && (
            <div className="ap-field-wrap" style={{ animationDelay: "0ms" }}>
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Marcus Reid"
                required
              />
            </div>
          )}

          <div className="ap-field-wrap" style={{ animationDelay: "60ms" }}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@golfclub.com"
              required
            />
          </div>

          <div className="ap-field-wrap" style={{ animationDelay: "120ms" }}>
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              hint="Minimum 6 characters."
              required
            />
          </div>

          <Button
            variant="primary"
            type="submit"
            className="w-full ap-submit-btn"
            isLoading={isLoading}
          >
            {mode === "login" ? (
              <>
                Sign In to Workspace <ArrowRight size={16} />
              </>
            ) : (
              <>
                Create Account & Continue <ArrowRight size={16} />
              </>
            )}
          </Button>

          <div className="ap-secure-note">
            <Lock size={11} />
            <span>Secured with encrypted session handling</span>
          </div>
        </form>

        <div className="ap-footer">
          {mode === "login" ? (
            <span>
              Don't have an account yet?{" "}
              <Link to="/subscribe" className="ap-link">
                Join GreenPulse
              </Link>
            </span>
          ) : (
            <span>
              Already a subscriber?{" "}
              <Link to="/login" className="ap-link">
                Sign In
              </Link>
            </span>
          )}
        </div>
      </Card>

      <style>{`
        .ap-hero {
          text-align: center;
          margin-bottom: var(--space-8);
          animation: apFadeDown 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes apFadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ap-hero-badge {
          margin-bottom: var(--space-2);
          display: inline-flex !important;
          align-items: center;
          gap: 5px;
          animation: apPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
        }

        @keyframes apPop {
          from { opacity: 0; transform: scale(0.75); }
          to { opacity: 1; transform: scale(1); }
        }

        .ap-hero-title {
          background: linear-gradient(135deg, var(--forest-950, #0d2b14), var(--forest-700, #2e7d32));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .ap-hero-sub {
          color: var(--charcoal-600);
          max-width: 440px;
          margin-inline: auto;
        }

        .ap-card {
          position: relative;
          animation: apCardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
          overflow: hidden;
        }

        @keyframes apCardIn {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ap-plan-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
          margin-bottom: var(--space-6);
          padding: var(--space-1);
          background-color: var(--bg-surface-warm);
          border-radius: var(--radius-lg);
        }

        .ap-plan-card {
          position: relative;
          padding: var(--space-4);
          border-radius: var(--radius-md);
          background-color: transparent;
          box-shadow: none;
          cursor: pointer;
          text-align: center;
          transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          border: 1px solid transparent;
        }

        .ap-plan-card:hover {
          transform: translateY(-2px);
        }

        .ap-plan-active {
          background-color: var(--bg-surface);
          box-shadow: var(--shadow-sm), 0 0 0 1px rgba(46, 125, 50, 0.18);
        }

        .ap-plan-name {
          font-weight: 600;
          font-size: var(--text-sm);
          color: var(--charcoal-900);
        }

        .ap-plan-price {
          font-family: var(--font-numeric);
          font-weight: 700;
          font-size: var(--text-xl);
          color: var(--forest-800);
          transition: color 0.3s ease;
        }

        .ap-plan-active .ap-plan-price {
          background: linear-gradient(135deg, #2e7d32, #43a047, #2e7d32);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: apShimmer 2.5s linear infinite;
        }

        @keyframes apShimmer {
          to { background-position: 200% center; }
        }

        .ap-plan-price span {
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .ap-plan-note {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }

        .ap-plan-note-success {
          color: var(--color-success);
          font-weight: 500;
        }

        .ap-save-badge {
          position: absolute !important;
          top: -10px;
          right: 10px;
          animation: apBadgeFloat 2.4s ease-in-out infinite;
        }

        @keyframes apBadgeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .ap-error-banner {
          padding: var(--space-3) var(--space-4);
          background-color: var(--color-error-bg);
          border: 1px solid var(--color-error-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--color-error);
          font-size: var(--text-sm);
          animation: apShake 0.45s ease, apFadeIn 0.3s ease;
        }

        @keyframes apShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        @keyframes apFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .ap-error-icon {
          flex-shrink: 0;
          animation: apIconPulse 1.6s ease-in-out infinite;
        }

        @keyframes apIconPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        .ap-google-btn {
          display: flex !important;
          align-items: center;
          justify-content: center;
          gap: var(--space-3) !important;
          background-color: var(--bg-surface) !important;
          border: 1px solid var(--border-subtle) !important;
          color: var(--charcoal-900) !important;
          font-weight: 600;
          font-size: var(--text-sm);
          padding: var(--space-3) var(--space-4) !important;
          box-shadow: var(--shadow-sm);
          transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1) !important;
        }

        .ap-google-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.18);
          border-color: var(--border-default) !important;
        }

        .ap-divider {
          display: flex;
          align-items: center;
          margin: var(--space-5) 0;
          gap: var(--space-3);
        }

        .ap-divider-line {
          flex: 1;
          height: 1px;
          background-color: var(--border-subtle);
        }

        .ap-divider-label {
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--charcoal-500);
          font-weight: 600;
          white-space: nowrap;
        }

        .ap-form {
          display: flex;
          flex-direction: column;
        }

        .ap-field-wrap {
          animation: apFieldIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes apFieldIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ap-submit-btn {
          margin-top: var(--space-4) !important;
          display: flex !important;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: transform 0.25s ease, box-shadow 0.25s ease !important;
        }

        .ap-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px -8px rgba(46, 125, 50, 0.45);
        }

        .ap-submit-btn svg {
          transition: transform 0.25s ease;
        }

        .ap-submit-btn:hover:not(:disabled) svg {
          transform: translateX(3px);
        }

        .ap-secure-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: var(--space-3);
          font-size: var(--text-xs);
          color: var(--text-muted);
          opacity: 0.85;
        }

        .ap-footer {
          margin-top: var(--space-6);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
          text-align: center;
          font-size: var(--text-sm);
          color: var(--charcoal-600);
        }

        .ap-link {
          color: var(--forest-800);
          font-weight: 600;
          position: relative;
          text-decoration: none;
        }

        .ap-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -2px;
          width: 0;
          height: 1.5px;
          background: var(--forest-700);
          transition: width 0.25s ease;
        }

        .ap-link:hover::after {
          width: 100%;
        }

        @media (prefers-reduced-motion: reduce) {
          .ap-hero,
          .ap-hero-badge,
          .ap-card,
          .ap-plan-card,
          .ap-plan-price,
          .ap-save-badge,
          .ap-error-banner,
          .ap-error-icon,
          .ap-field-wrap,
          .ap-submit-btn,
          .ap-submit-btn svg {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </PageContainer>
  );
};
