import React, { useEffect, useRef, useState } from "react";
import { Card } from "../../../components/ui/Card";
import {
  Users,
  TrendingUp,
  DollarSign,
  Heart,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import type { PlatformAnalytics } from "../../../types";

interface AnalyticsSectionProps {
  analyticsData: PlatformAnalytics | null;
  totalUsers: number;
  totalDraws: number;
  totalCharities: number;
}

const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
};

const CountUp: React.FC<{ value: number; prefix?: string }> = ({
  value,
  prefix = "",
}) => {
  const animated = useCountUp(value);
  return (
    <>
      {prefix}
      {animated.toLocaleString()}
    </>
  );
};

interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  delay: number;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  prefix,
  sub,
  icon,
  accent,
  delay,
}) => (
  <div
    className="kpi-card"
    style={{ animationDelay: `${delay}ms`, ["--accent" as any]: accent }}
  >
    <div className="kpi-glow" />
    <div className="kpi-top">
      <span className="kpi-label">{label}</span>
      <span className="kpi-icon">{icon}</span>
    </div>
    <div className="kpi-value">
      <CountUp value={value} prefix={prefix} />
    </div>
    <span className="kpi-sub">{sub}</span>
  </div>
);

const BarRow: React.FC<{
  label: string;
  count: number;
  pct: number;
  color: string;
  delay: number;
}> = ({ label, count, pct, color, delay }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 80);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="bar-row" style={{ animationDelay: `${delay}ms` }}>
      <div className="bar-row-head">
        <span className="bar-label">{label.replace("_", " ")}</span>
        <span className="bar-meta">
          {count} <span className="bar-pct">({pct}%)</span>
        </span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
    </div>
  );
};

const PillStat: React.FC<{ label: string; count: number; delay: number }> = ({
  label,
  count,
  delay,
}) => (
  <div className="pill-stat" style={{ animationDelay: `${delay}ms` }}>
    <span className="pill-label">{label.replace("_", " ")}</span>
    <span className="pill-count">{count}</span>
  </div>
);

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  analyticsData,
  totalUsers,
  totalDraws,
  totalCharities,
}) => {
  if (!analyticsData) {
    return (
      <div className="analytics-wrap">
        <Card style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(230, 81, 0, 0.08)',
              border: '1px solid rgba(230, 81, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              color: '#e65100',
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ marginBottom: 'var(--space-2)', color: 'var(--forest-950)' }}>
            Live Platform Analytics Unavailable
          </h3>
          <p
            style={{
              maxWidth: '540px',
              margin: '0 auto',
              color: 'var(--charcoal-600)',
              fontSize: 'var(--text-sm)',
              lineHeight: 1.6,
            }}
          >
            Authoritative platform statistics and revenue aggregates cannot be verified at this time.
            GreenPulse does not fabricate zero values or estimate unverified statistics.
            Please verify database connection and administrator permissions.
          </p>
        </Card>
      </div>
    );
  }

  const subBreakdown = analyticsData.subscription_breakdown ?? {};
  const claimsStatus = analyticsData.claims_by_status ?? {};
  const claimsTier = analyticsData.claims_by_tier ?? {};

  return (
    <div className="analytics-wrap">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatGlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(6px, -6px) scale(1.08); }
        }
        @keyframes barGlint {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }

        .analytics-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4);
        }

        .kpi-card {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--border-default);
          border-radius: 16px;
          padding: 18px 18px 16px;
          background: linear-gradient(180deg, #fff, var(--bg-surface-warm, #fdf8f1));
          animation: fadeSlideUp 0.5s ease both;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }

        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 30px -12px var(--accent, rgba(0,0,0,0.25));
          border-color: var(--accent, var(--border-default));
        }

        .kpi-glow {
          position: absolute;
          top: -30px;
          right: -30px;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          background: var(--accent, transparent);
          opacity: 0.12;
          filter: blur(4px);
          animation: floatGlow 5s ease-in-out infinite;
          pointer-events: none;
        }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 1;
        }

        .kpi-label {
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        .kpi-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: var(--accent, #eee);
          color: #fff;
          transition: transform 0.3s ease;
        }

        .kpi-card:hover .kpi-icon {
          transform: scale(1.12) rotate(-6deg);
        }

        .kpi-value {
          font-size: var(--text-3xl);
          font-weight: 800;
          color: var(--forest-950);
          margin-top: 10px;
          letter-spacing: -0.02em;
          position: relative;
          z-index: 1;
          font-variant-numeric: tabular-nums;
        }

        .kpi-sub {
          font-size: var(--text-xs);
          color: var(--charcoal-600);
          position: relative;
          z-index: 1;
        }

        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
          gap: var(--space-6);
        }

        .section-card {
          animation: fadeSlideUp 0.55s ease both;
          transition: box-shadow 0.25s ease;
        }

        .section-card:hover {
          box-shadow: 0 10px 26px -16px rgba(0,0,0,0.3);
        }

        .section-title {
          color: var(--forest-950);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-desc {
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin-bottom: var(--space-4);
        }

        .bar-row {
          animation: fadeSlideUp 0.4s ease both;
        }

        .bar-row-head {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-sm);
          margin-bottom: 5px;
        }

        .bar-label {
          text-transform: capitalize;
          font-weight: 600;
          color: var(--forest-950);
        }

        .bar-meta {
          color: var(--text-muted);
        }

        .bar-pct {
          font-variant-numeric: tabular-nums;
        }

        .bar-track {
          position: relative;
          height: 9px;
          background: var(--bg-surface-warm);
          border-radius: 6px;
          overflow: hidden;
        }

        .bar-fill {
          position: relative;
          height: 100%;
          border-radius: 6px;
          transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
          overflow: hidden;
        }

        .bar-fill::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          animation: barGlint 2.4s ease-in-out infinite;
        }

        .empty-note {
          padding: var(--space-6);
          text-align: center;
          color: var(--text-muted);
          font-size: var(--text-sm);
          border: 1px dashed var(--border-default);
          border-radius: 10px;
        }

        .notice-box {
          margin-top: var(--space-6);
          padding: var(--space-3) var(--space-4);
          background: rgba(230, 81, 0, 0.08);
          border: 1px solid rgba(230, 81, 0, 0.3);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          color: var(--charcoal-900);
          display: flex;
          gap: 8px;
          align-items: flex-start;
          transition: background 0.25s ease;
        }

        .notice-box:hover {
          background: rgba(230, 81, 0, 0.13);
        }

        .notice-box svg {
          flex-shrink: 0;
          color: #e65100;
          margin-top: 1px;
        }

        .pipeline-block-label {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: var(--space-2);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pill-row {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }

        .pill-stat {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          background: var(--bg-surface-warm);
          border-radius: 999px;
          border: 1px solid var(--border-default);
          font-size: var(--text-xs);
          animation: fadeSlideUp 0.4s ease both;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .pill-stat:hover {
          transform: translateY(-2px);
          border-color: var(--forest-500, #4caf50);
        }

        .pill-label {
          text-transform: capitalize;
          font-weight: 600;
          color: var(--forest-950);
        }

        .pill-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          background: var(--forest-700, #2e7d32);
          color: #fff;
          border-radius: 999px;
          font-weight: 700;
          font-size: 11px;
        }

        .settlement-note {
          padding: var(--space-3) var(--space-4);
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          color: var(--text-muted);
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .settlement-note svg {
          flex-shrink: 0;
          color: var(--forest-600, #43a047);
          margin-top: 1px;
        }
      `}</style>

      <div className="kpi-grid">
        <KpiCard
          label="Total Registered Users"
          value={analyticsData?.total_users ?? totalUsers}
          sub="Across subscriber and administrator roles"
          icon={<Users size={15} />}
          accent="#2e7d32"
          delay={0}
        />
        <KpiCard
          label="Active Subscribers"
          value={analyticsData?.total_subscribers ?? 0}
          sub="Status = 'active' in subscriptions table"
          icon={<TrendingUp size={15} />}
          accent="#9ccc65"
          delay={80}
        />
        <KpiCard
          label="Total Prize Pool Generated"
          value={Math.round((analyticsData?.total_prize_pool_cents ?? 0) / 100)}
          prefix="₹"
          sub={`Across ${analyticsData?.total_draws ?? totalDraws} published official draws`}
          icon={<DollarSign size={15} />}
          accent="#2e7d32"
          delay={160}
        />
        <KpiCard
          label="Charity Ledger Totals"
          value={Math.round(
            (analyticsData?.total_donations_recorded_cents ?? 0) / 100,
          )}
          prefix="₹"
          sub={`Recorded donations across ${analyticsData?.total_charities ?? totalCharities} charity partners`}
          icon={<Heart size={15} />}
          accent="#e53935"
          delay={240}
        />
      </div>

      <div className="breakdown-grid">

        <Card className="section-card">
          <h4 className="section-title">Subscription Status Breakdown</h4>
          <p className="section-desc">
            Current distribution of member accounts in PostgreSQL subscriptions
            table.
          </p>

          {Object.keys(subBreakdown).length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
              }}
            >
              {Object.entries(subBreakdown).map(([status, count], i) => {
                const total = analyticsData?.total_users || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <BarRow
                    key={status}
                    label={status}
                    count={count}
                    pct={pct}
                    color={
                      status === "active"
                        ? "linear-gradient(90deg, #2e7d32, #43a047)"
                        : "linear-gradient(90deg, #9ccc65, #c5e1a5)"
                    }
                    delay={i * 90}
                  />
                );
              })}
            </div>
          ) : (
            <div className="empty-note">
              No subscription records found in active database.
            </div>
          )}

          <div className="notice-box">
            <AlertTriangle size={14} />
            <span>
              <strong>Payment Gateway Notice:</strong> Subscription metrics reflect
              authoritative records synchronized from Stripe billing webhooks.
              Unconfirmed checkouts are omitted from active revenue aggregates.
            </span>
          </div>
        </Card>

        <Card className="section-card">
          <h4 className="section-title">Winner Claims Verification Pipeline</h4>
          <p className="section-desc">
            Verification stages and prize tiers for all published draw winners.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <div>
              <div className="pipeline-block-label">Claims by Status</div>
              <div className="pill-row">
                {Object.keys(claimsStatus).length > 0 ? (
                  Object.entries(claimsStatus).map(([status, count], i) => (
                    <PillStat
                      key={status}
                      label={status}
                      count={count}
                      delay={i * 70}
                    />
                  ))
                ) : (
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                    }}
                  >
                    No claims recorded yet
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="pipeline-block-label">Claims by Match Tier</div>
              <div className="pill-row">
                {Object.keys(claimsTier).length > 0 ? (
                  Object.entries(claimsTier).map(([tier, count], i) => (
                    <PillStat
                      key={tier}
                      label={tier}
                      count={count}
                      delay={i * 70}
                    />
                  ))
                ) : (
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                    }}
                  >
                    No tier claims recorded
                  </span>
                )}
              </div>
            </div>

            <div className="settlement-note">
              <ShieldCheck size={14} />
              <span>
                <strong>Settlement Security:</strong> Verified claims represent
                confirmed golf round legitimacy. Payout disbursements are executed
                via the financial settlement gateway.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
