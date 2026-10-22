import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import { charityService } from "../../services/charityService";
import { subscriptionService } from "../../services/subscriptionService";
import { stripeService } from "../../services/stripeService";
import { env } from "../../lib/supabase";
import type { Charity, Subscription, SubscriptionPlan } from "../../types";
import {
  Check,
  Heart,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
  CircleDollarSign,
  Trophy,
  Loader2,
} from "lucide-react";

export const SubscriptionPage: React.FC = () => {
  const { user, isAdmin, role } = useAuth();
  const isAuthenticated = Boolean(user);
  const navigate = useNavigate();

  const [plan, setPlan] = useState<SubscriptionPlan>("monthly");
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selectedCharityId, setSelectedCharityId] = useState<string>("");
  const [charityPercentage, setCharityPercentage] = useState<number>(10);
  const [activeSubscription, setActiveSubscription] =
    useState<Subscription | null>(null);

  const [isLoadingCharities, setIsLoadingCharities] = useState(false);
  const [isCheckingSub, setIsCheckingSub] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // 1. Fetch user's existing subscription to prevent duplicates
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && user?.id) {
      queueMicrotask(() => setIsCheckingSub(true));
      subscriptionService
        .getUserSubscription(user.id)
        .then((sub) => {
          if (isMounted) {
            setActiveSubscription(sub && sub.status === "active" ? sub : null);
          }
        })
        .catch((err) => {
          console.warn("[SubscriptionPage] Error checking subscription:", err);
        })
        .finally(() => {
          if (isMounted) setIsCheckingSub(false);
        });
    } else {
      queueMicrotask(() => setIsCheckingSub(false));
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id]);

  // 2. Fetch Charities directory for beneficiary selection
  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => setIsLoadingCharities(true));
    charityService
      .getCharities()
      .then((data) => {
        if (isMounted && data.length > 0) {
          setCharities(data);
          setSelectedCharityId(data[0].id);
        }
      })
      .catch((err) => {
        console.warn("[SubscriptionPage] Failed to fetch charities:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCharities(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Handle Checkout Session Creation
  const handleProceedToCheckout = async () => {
    setCheckoutError(null);

    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/subscribe" } } });
      return;
    }

    if (isAdmin || role === "admin") {
      setCheckoutError(
        "Administrators have complimentary platform access and do not require a personal membership subscription.",
      );
      return;
    }

    if (activeSubscription) {
      setCheckoutError(
        "You already have an active subscription. Manage your membership in the dashboard.",
      );
      return;
    }

    setIsSubmitting(true);

    // Simulated Demo Payment Mode (Evaluation & Recruitment Preview)
    if (env.demoPayments) {
      try {
        const sub = await subscriptionService.activateDemoSubscription(
          plan,
          selectedCharityId || undefined,
          charityPercentage
        );
        setActiveSubscription(sub);
        navigate(`/subscribe/success?demo=true&plan=${plan}`);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to activate demo subscription.";
        setCheckoutError(msg);
        setIsSubmitting(false);
      }
      return;
    }

    // Canonical Real Stripe Checkout Flow
    try {
      const result = await stripeService.createSubscriptionCheckout(
        plan,
        selectedCharityId || undefined,
        charityPercentage,
      );

      // Redirect browser to hosted Stripe Checkout URL
      if (result.url) {
        window.location.assign(result.url);
      } else {
        throw new Error("No checkout URL received from server.");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to initialize Stripe checkout.";
      setCheckoutError(msg);
      setIsSubmitting(false);
    }
  };

  const selectedCharity = charities.find((c) => c.id === selectedCharityId);
  const monthlyFee = 2090;
  const yearlyFee = 20900;
  const baseFee = plan === "monthly" ? monthlyFee : yearlyFee;
  const charityAmount = (baseFee * (charityPercentage / 100)).toFixed(2);
  const prizePoolShare = (baseFee * 0.5).toFixed(2);

  return (
    <PageContainer>
      <div className="sp-wrapper">
        {/* Header */}
        <div className="sp-hero">
          <Badge variant="lime" className="sp-hero-badge">
            <Sparkles size={12} />
            Membership & Purpose
          </Badge>
          <h2 className="sp-hero-title">
            Play with Purpose. Create Lasting Impact.
          </h2>
          <p className="sp-hero-sub">
            Track your official Stableford scores, enter the monthly
            number-match prize pool, and direct at least 10% of every membership
            fee to a vetted charity of your choice.
          </p>
        </div>

        {/* Demo Payment Mode Notice Banner */}
        {env.demoPayments && (
          <div
            className="sp-demo-banner"
            style={{
              padding: "var(--space-4) var(--space-5)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--lime-500)",
              background: "linear-gradient(135deg, rgba(234, 244, 211, 0.75), rgba(210, 235, 180, 0.45))",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginBottom: "var(--space-6)",
            }}
          >
            <Badge variant="lime" size="sm">
              <Sparkles size={12} /> DEMO PAYMENT MODE
            </Badge>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--forest-950)", fontWeight: 500 }}>
              Evaluation & Recruitment Demo: Simulated payments are active. Clicking checkout will safely provision your subscription without charging real money.
            </span>
          </div>
        )}

        {(isAdmin || role === "admin") && (
          <div
            className="sp-active-banner"
            style={{
              borderColor: "var(--forest-600)",
              background: "linear-gradient(135deg, var(--forest-50), #dceddb)",
              marginBottom: "var(--space-6)",
            }}
          >
            <div className="sp-active-left">
              <div
                className="sp-active-icon-badge"
                style={{
                  background: "var(--forest-100)",
                  color: "var(--forest-800)",
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <div
                  className="sp-active-title"
                  style={{ color: "var(--forest-950)" }}
                >
                  Administrator Complimentary Access
                </div>
                <div
                  className="sp-active-sub"
                  style={{ color: "var(--forest-900)" }}
                >
                  You are authenticated as a verified platform administrator. You have
                  full, unrestricted access to manage draw cycles, audit scores, review
                  winner claims, and manage charities without requiring a personal membership subscription.
                </div>
              </div>
            </div>
            <Link to="/admin">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<ShieldCheck size={16} />}
              >
                Go to Admin Portal
              </Button>
            </Link>
          </div>
        )}

        {/* Existing Active Subscription Banner */}
        {!isCheckingSub && activeSubscription && (
          <div className="sp-active-banner">
            <div className="sp-active-left">
              <div className="sp-active-icon-badge">
                <span className="sp-pulse-ring" />
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="sp-active-title">
                  Active Membership Detected
                </div>
                <div className="sp-active-sub">
                  You are currently enrolled in the{" "}
                  {activeSubscription.plan_tier === "yearly"
                    ? "Yearly"
                    : "Monthly"}{" "}
                  Membership plan.
                </div>
              </div>
            </div>
            <Link to="/dashboard">
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight size={14} />}
                className="sp-active-cta"
              >
                Go to Golfer Workspace
              </Button>
            </Link>
          </div>
        )}

        {checkoutError && (
          <div role="alert" className="sp-error-banner">
            <AlertCircle size={18} className="sp-error-icon" />
            <div>
              <div className="sp-error-title">Checkout Request Notice</div>
              <div>{checkoutError}</div>
              {checkoutError.includes("STRIPE") && (
                <div className="sp-error-tip">
                  Tip: Check <code>docs/STRIPE_SETUP.md</code> in the repository for
                  instructions on deploying Edge Functions and configuring
                  Stripe test mode credentials.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Choose Your Membership Plan */}
        <div className="sp-step">
          <h3 className="sp-step-title">
            <span className="sp-step-num">1</span>
            Select Your Membership Plan
          </h3>

          <div className="sp-plan-grid">
            {/* Monthly Plan Card */}
            <div
              onClick={() => setPlan("monthly")}
              className={`sp-plan-card ${plan === "monthly" ? "sp-plan-active" : ""}`}
            >
              <div className="sp-plan-head">
                <span className="sp-plan-name">Monthly Membership</span>
                <input
                  type="radio"
                  name="membership-plan"
                  checked={plan === "monthly"}
                  onChange={() => setPlan("monthly")}
                  aria-label="Monthly Membership"
                  className="sp-radio"
                />
              </div>

              <div className="sp-plan-price-row">
                <span className="sp-plan-price">₹2,090</span>
                <span className="sp-plan-period">/ month</span>
              </div>

              <p className="sp-plan-desc">
                Full golfer workspace access, rolling 5 Stableford score
                tracking, monthly draw ticket, and min 10% charity contribution.
              </p>

              <div className="sp-plan-features">
                <div className="sp-plan-feature">
                  <Check size={14} /> Cancel anytime with no long-term lock-in
                </div>
                <div className="sp-plan-feature">
                  <Check size={14} /> 1 automatic entry into each monthly prize
                  draw
                </div>
              </div>
            </div>

            {/* Yearly Plan Card */}
            <div
              onClick={() => setPlan("yearly")}
              className={`sp-plan-card ${plan === "yearly" ? "sp-plan-active" : ""}`}
            >
              <Badge variant="lime" size="sm" className="sp-value-badge">
                <Sparkles size={12} /> Best Value · 2 Months Free
              </Badge>

              <div className="sp-plan-head">
                <span className="sp-plan-name">Yearly Membership</span>
                <input
                  type="radio"
                  name="membership-plan"
                  checked={plan === "yearly"}
                  onChange={() => setPlan("yearly")}
                  aria-label="Yearly Membership"
                  className="sp-radio"
                />
              </div>

              <div className="sp-plan-price-row">
                <span className="sp-plan-price">₹20,900</span>
                <span className="sp-plan-period">/ year</span>
              </div>

              <p className="sp-plan-desc">
                Year-round play and community impact. Equivalent to ₹1,741.67/month
                with ₹4,180 in annual membership savings.
              </p>

              <div className="sp-plan-features">
                <div className="sp-plan-feature">
                  <Check size={14} /> 12 consecutive monthly draw tickets
                  included
                </div>
                <div className="sp-plan-feature">
                  <Check size={14} /> Sustained annual funding for your chosen
                  cause
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Choose Your Cause & Impact Pledge */}
        <Card className="sp-charity-card">
          <div className="sp-charity-head">
            <div className="sp-charity-icon-badge">
              <Heart size={18} />
            </div>
            <h3 className="sp-charity-title">
              2. Designate Your Charitable Cause
            </h3>
          </div>
          <p className="sp-charity-note">
            Every GreenPulse member contributes at least 10% of their
            subscription directly to a vetted partner charity. You may
            voluntarily increase this proportion.
          </p>

          {/* Charity Selection Dropdown / Selector */}
          <div className="sp-field-block">
            <label htmlFor="charity-select" className="sp-field-label">
              Choose Partner Charity
            </label>
            {isLoadingCharities ? (
              <div className="sp-loading-row">
                <Loader2 size={14} className="sp-spin" /> Loading vetted
                charities...
              </div>
            ) : (
              <select
                id="charity-select"
                value={selectedCharityId}
                onChange={(e) => setSelectedCharityId(e.target.value)}
                className="sp-select"
              >
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category.replace("_", " ")})
                  </option>
                ))}
              </select>
            )}

            {selectedCharity && (
              <div className="sp-charity-mission">
                <strong>Mission:</strong>{" "}
                {selectedCharity.tagline || selectedCharity.description}
              </div>
            )}
          </div>

          {/* Percentage Slider (min 10%, max 100%) */}
          <div className="sp-field-block">
            <div className="sp-slider-head">
              <label
                htmlFor="charity-slider"
                className="sp-field-label"
                style={{ marginBottom: 0 }}
              >
                Charity Contribution:{" "}
                <span className="sp-slider-value">{charityPercentage}%</span>
              </label>
              <Badge
                variant={charityPercentage > 10 ? "lime" : "neutral"}
                size="sm"
              >
                {charityPercentage === 10
                  ? "Platform Standard (10%)"
                  : `Supporter Boost (+${charityPercentage - 10}%)`}
              </Badge>
            </div>

            <input
              id="charity-slider"
              type="range"
              min={10}
              max={100}
              step={5}
              value={charityPercentage}
              onChange={(e) => setCharityPercentage(Number(e.target.value))}
              className="sp-slider"
              style={{
                background: `linear-gradient(to right, #2e7d32 0%, #43a047 ${((charityPercentage - 10) / 90) * 100}%, var(--border-default) ${((charityPercentage - 10) / 90) * 100}%, var(--border-default) 100%)`,
              }}
            />
            <div className="sp-slider-scale">
              <span>10% (Minimum)</span>
              <span>50%</span>
              <span>100% (Pure Charity)</span>
            </div>
          </div>

          {/* Transparent Allocation Breakdown */}
          <div className="sp-breakdown">
            <div className="sp-breakdown-title">
              Transparent Allocation Breakdown (
              {plan === "monthly" ? "Monthly" : "Annual"})
            </div>
            <div className="sp-breakdown-row">
              <span>
                <Heart size={13} /> Charity Donation (
                {selectedCharity?.name || "Selected Cause"}):
              </span>
              <strong className="sp-breakdown-charity">₹{charityAmount}</strong>
            </div>
            <div className="sp-breakdown-row">
              <span>
                <Trophy size={13} /> Draw Prize Pool Fund (50%):
              </span>
              <span className="sp-breakdown-pool">₹{prizePoolShare}</span>
            </div>
            <div className="sp-breakdown-row sp-breakdown-total">
              <span>
                <CircleDollarSign size={13} /> Total Billed:
              </span>
              <span className="sp-breakdown-total-amount">
                ₹{baseFee.toLocaleString('en-IN')}.00 / {plan === "monthly" ? "month" : "year"}
              </span>
            </div>
          </div>
        </Card>

        {/* Action Button & Security Assurance */}
        <div className="sp-action">
          {isAuthenticated ? (
            isAdmin || role === "admin" ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate("/admin")}
                leftIcon={<ShieldCheck size={18} />}
                className="sp-checkout-btn"
              >
                Go to Admin Portal (Complimentary Access)
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleProceedToCheckout}
                isLoading={isSubmitting}
                disabled={isSubmitting || Boolean(activeSubscription)}
                leftIcon={env.demoPayments ? <Sparkles size={18} /> : <CreditCard size={18} />}
                className="sp-checkout-btn"
              >
                {activeSubscription
                  ? "Already Subscribed"
                  : env.demoPayments
                    ? `Simulate Demo Payment · Activate (₹${baseFee.toLocaleString('en-IN')})`
                    : `Proceed to Stripe Checkout (₹${baseFee.toLocaleString('en-IN')})`}
              </Button>
            )
          ) : (
            <div className="sp-guest-cta">
              <Button
                variant="primary"
                size="lg"
                onClick={() =>
                  navigate("/login", {
                    state: { from: { pathname: "/subscribe" } },
                  })
                }
                rightIcon={<ArrowRight size={16} />}
                className="sp-signin-btn"
              >
                Sign In to Join GreenPulse
              </Button>
              <span className="sp-guest-note">
                Don't have an account yet?{" "}
                <Link to="/signup" className="sp-link">
                  Create Golfer Account
                </Link>
              </span>
            </div>
          )}

          <div className="sp-trust-row">
            {env.demoPayments ? (
              <>
                <span className="sp-trust-item">
                  <ShieldCheck size={14} /> Demo Payment Mode Active
                </span>
                <span className="sp-trust-dot">•</span>
                <span className="sp-trust-item">
                  Zero Real Money Charged
                </span>
                <span className="sp-trust-dot">•</span>
                <span className="sp-trust-item">Instant Simulated Activation</span>
              </>
            ) : (
              <>
                <span className="sp-trust-item">
                  <ShieldCheck size={14} /> 256-Bit Encrypted via Stripe
                </span>
                <span className="sp-trust-dot">•</span>
                <span className="sp-trust-item">
                  Zero Card Data Stored on GreenPulse
                </span>
                <span className="sp-trust-dot">•</span>
                <span className="sp-trust-item">Cancel Anytime</span>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .sp-wrapper {
          max-width: 840px;
          margin: 0 auto;
          padding-bottom: var(--space-12);
        }

        .sp-hero {
          text-align: center;
          margin-bottom: var(--space-8);
          animation: spFadeDown 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes spFadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sp-hero-badge {
          margin-bottom: var(--space-2);
          display: inline-flex !important;
          align-items: center;
          gap: 5px;
          animation: spPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both;
        }

        @keyframes spPop {
          from { opacity: 0; transform: scale(0.75); }
          to { opacity: 1; transform: scale(1); }
        }

        .sp-hero-title {
          font-size: var(--text-3xl);
          margin-bottom: var(--space-2);
          background: linear-gradient(135deg, var(--forest-950, #0d2b14), var(--forest-700, #2e7d32));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .sp-hero-sub {
          color: var(--charcoal-600);
          font-size: var(--text-base);
          max-width: 640px;
          margin: 0 auto;
        }

        .sp-active-banner {
          padding: var(--space-5);
          background: linear-gradient(135deg, var(--forest-50), #ecf7ed);
          border: 1px solid var(--forest-200);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-8);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-4);
          animation: spFadeIn 0.5s ease;
          box-shadow: var(--shadow-sm);
        }

        @keyframes spFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sp-active-left {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .sp-active-icon-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(46, 125, 50, 0.12);
          color: var(--forest-800);
          flex-shrink: 0;
        }

        .sp-pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid var(--forest-400, #66bb6a);
          animation: spPulseRing 2.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        @keyframes spPulseRing {
          0% { transform: scale(0.85); opacity: 0.7; }
          80%, 100% { transform: scale(1.5); opacity: 0; }
        }

        .sp-active-title {
          font-weight: 700;
          color: var(--forest-950);
          font-size: var(--text-base);
        }

        .sp-active-sub {
          font-size: var(--text-sm);
          color: var(--charcoal-600);
        }

        .sp-active-cta {
          transition: transform 0.25s ease, box-shadow 0.25s ease !important;
        }

        .sp-active-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 18px -8px rgba(46, 125, 50, 0.45);
        }

        .sp-error-banner {
          padding: var(--space-4);
          background-color: var(--color-error-bg);
          border: 1px solid var(--color-error-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-6);
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          color: var(--color-error);
          font-size: var(--text-sm);
          animation: spShake 0.45s ease, spFadeIn 0.3s ease;
        }

        @keyframes spShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        .sp-error-icon {
          flex-shrink: 0;
          margin-top: 2px;
          animation: spIconPulse 1.6s ease-in-out infinite;
        }

        @keyframes spIconPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        .sp-error-title {
          font-weight: 600;
          margin-bottom: 2px;
        }

        .sp-error-tip {
          margin-top: var(--space-2);
          font-size: var(--text-xs);
          color: var(--charcoal-700);
        }

        .sp-step {
          margin-bottom: var(--space-8);
          animation: spFadeIn 0.5s ease 0.05s both;
        }

        .sp-step-title {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--charcoal-900);
          margin-bottom: var(--space-4);
        }

        .sp-step-num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          color: white;
          font-size: var(--text-xs);
          font-weight: 700;
        }

        .sp-plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: var(--space-4);
        }

        .sp-plan-card {
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-default);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          transition: all 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          position: relative;
        }

        .sp-plan-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
        }

        .sp-plan-active {
          border: 2px solid var(--forest-800);
          box-shadow: 0 8px 24px -10px rgba(46, 125, 50, 0.35);
        }

        .sp-plan-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .sp-plan-name {
          font-weight: 600;
          font-size: var(--text-base);
          color: var(--charcoal-900);
        }

        .sp-radio {
          accent-color: var(--forest-800);
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .sp-plan-price-row {
          display: flex;
          align-items: baseline;
          gap: var(--space-1);
          margin-bottom: var(--space-3);
        }

        .sp-plan-price {
          font-family: var(--font-numeric);
          font-size: var(--text-3xl);
          font-weight: 800;
          transition: all 0.3s ease;
        }

        .sp-plan-active .sp-plan-price {
          background: linear-gradient(135deg, #2e7d32, #43a047, #2e7d32);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: spShimmer 2.5s linear infinite;
        }

        .sp-plan-card:not(.sp-plan-active) .sp-plan-price {
          color: var(--forest-900);
        }

        @keyframes spShimmer {
          to { background-position: 200% center; }
        }

        .sp-plan-period {
          font-size: var(--text-sm);
          color: var(--text-muted);
        }

        .sp-plan-desc {
          font-size: var(--text-xs);
          color: var(--charcoal-600);
          margin-bottom: var(--space-4);
        }

        .sp-plan-features {
          font-size: var(--text-xs);
          color: var(--charcoal-700);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .sp-plan-feature {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .sp-plan-feature svg {
          color: var(--forest-700);
          flex-shrink: 0;
        }

        .sp-value-badge {
          position: absolute !important;
          top: -10px;
          right: 16px;
          display: flex !important;
          align-items: center;
          gap: 4px;
          animation: spBadgeFloat 2.4s ease-in-out infinite;
        }

        @keyframes spBadgeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .sp-charity-card {
          margin-bottom: var(--space-8);
          animation: spFadeIn 0.5s ease 0.1s both;
        }

        .sp-charity-head {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }

        .sp-charity-icon-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(46, 125, 50, 0.1);
          color: var(--forest-800);
        }

        .sp-charity-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--charcoal-900);
          margin: 0;
        }

        .sp-charity-note {
          font-size: var(--text-sm);
          color: var(--charcoal-600);
          margin-bottom: var(--space-6);
        }

        .sp-field-block {
          margin-bottom: var(--space-6);
        }

        .sp-field-label {
          display: block;
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--charcoal-700);
          margin-bottom: var(--space-2);
        }

        .sp-loading-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-sm);
          color: var(--text-muted);
        }

        .sp-spin {
          animation: spSpin 1s linear infinite;
        }

        @keyframes spSpin {
          to { transform: rotate(360deg); }
        }

        .sp-select {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-default);
          background-color: var(--bg-surface);
          font-size: var(--text-sm);
          color: var(--charcoal-900);
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
        }

        .sp-select:focus {
          border-color: var(--forest-500);
          box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.14);
        }

        .sp-charity-mission {
          margin-top: var(--space-3);
          padding: var(--space-3);
          background-color: var(--bg-surface-warm);
          border-radius: var(--radius-md);
          font-size: var(--text-xs);
          color: var(--charcoal-700);
          animation: spFadeIn 0.3s ease;
          border-left: 2px solid var(--forest-400);
        }

        .sp-slider-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-2);
        }

        .sp-slider-value {
          color: var(--forest-800);
          font-weight: 700;
        }

        .sp-slider {
          width: 100%;
          cursor: pointer;
          appearance: none;
          height: 6px;
          border-radius: var(--radius-full);
          outline: none;
        }

        .sp-slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          border: 2px solid white;
          box-shadow: 0 1px 6px rgba(0,0,0,0.25);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .sp-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }

        .sp-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2e7d32, #43a047);
          border: 2px solid white;
          box-shadow: 0 1px 6px rgba(0,0,0,0.25);
          cursor: pointer;
        }

        .sp-slider-scale {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin-top: var(--space-1);
        }

        .sp-breakdown {
          padding: var(--space-4);
          background-color: var(--bg-surface-warm);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .sp-breakdown-title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--charcoal-800);
          margin-bottom: var(--space-2);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sp-breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--text-sm);
          margin-bottom: var(--space-1);
        }

        .sp-breakdown-row span:first-child {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--charcoal-700);
        }

        .sp-breakdown-row svg {
          color: var(--forest-600);
          flex-shrink: 0;
        }

        .sp-breakdown-charity {
          color: var(--forest-800);
          font-weight: 700;
        }

        .sp-breakdown-pool {
          color: var(--charcoal-700);
        }

        .sp-breakdown-total {
          padding-top: var(--space-2);
          margin-top: var(--space-1);
          border-top: 1px solid var(--border-subtle);
        }

        .sp-breakdown-total span:first-child {
          font-weight: 600;
          color: var(--charcoal-800);
        }

        .sp-breakdown-total-amount {
          font-family: var(--font-numeric);
          font-weight: 700;
          background: linear-gradient(135deg, var(--forest-950, #0d2b14), #2e7d32, var(--forest-950, #0d2b14));
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: spShimmer 3s linear infinite;
        }

        .sp-action {
          text-align: center;
          animation: spFadeIn 0.5s ease 0.15s both;
        }

        .sp-checkout-btn {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          transition: transform 0.25s ease, box-shadow 0.25s ease !important;
        }

        .sp-checkout-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px -8px rgba(46, 125, 50, 0.45);
        }

        .sp-guest-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .sp-signin-btn {
          width: 100%;
          max-width: 400px;
          transition: transform 0.25s ease, box-shadow 0.25s ease !important;
        }

        .sp-signin-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px -8px rgba(46, 125, 50, 0.45);
        }

        .sp-guest-note {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }

        .sp-link {
          color: var(--forest-800);
          font-weight: 600;
          position: relative;
          text-decoration: none;
        }

        .sp-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -2px;
          width: 0;
          height: 1.5px;
          background: var(--forest-700);
          transition: width 0.25s ease;
        }

        .sp-link:hover::after {
          width: 100%;
        }

        .sp-trust-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-4);
          margin-top: var(--space-4);
          font-size: var(--text-xs);
          color: var(--text-muted);
          flex-wrap: wrap;
        }

        .sp-trust-item {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }

        .sp-trust-item svg {
          color: var(--forest-700);
        }

        .sp-trust-dot {
          opacity: 0.5;
        }

        @media (prefers-reduced-motion: reduce) {
          .sp-hero, .sp-hero-badge, .sp-active-banner, .sp-pulse-ring,
          .sp-error-banner, .sp-error-icon, .sp-step, .sp-plan-card,
          .sp-plan-price, .sp-value-badge, .sp-charity-card, .sp-charity-mission,
          .sp-spin, .sp-breakdown-total-amount, .sp-action,
          .sp-checkout-btn, .sp-signin-btn {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </PageContainer>
  );
};
