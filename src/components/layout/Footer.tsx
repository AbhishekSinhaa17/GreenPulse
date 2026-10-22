import React from "react";
import { Link } from "react-router-dom";
import { Heart, Trophy, ShieldCheck, Flag } from "lucide-react";

const currentYear = new Date().getFullYear();

export const Footer: React.FC = () => {
  return (
    <footer className="gp-footer">
      <div className="gp-footer-glow" aria-hidden="true" />
      <div className="container">
        <div className="gp-footer-grid">
          {/* Brand & Mission */}
          <div className="gp-footer-brand">
            <div className="flex items-center gap-3 gp-brand-row">
              <div className="gp-brand-mark">
                <span>G</span>
              </div>
              <span className="gp-brand-name">GreenPulse</span>
            </div>
            <p className="gp-brand-desc">
              Play with purpose. Create lasting impact. A golf performance
              tracking and monthly draw engine directing subscriber revenue to
              vetted causes.
            </p>
            <div className="gp-audit-pill">
              <Heart size={14} className="gp-heart-beat" />
              <span>100% of charity pledges audited &amp; distributed</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="gp-footer-col">
            <h4 className="gp-col-title">Platform</h4>
            <ul className="gp-link-list">
              <li>
                <Link to="/#how-it-works" className="gp-footer-link">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/charities" className="gp-footer-link">
                  Charity Directory
                </Link>
              </li>
              <li>
                <Link to="/draws" className="gp-footer-link">
                  Monthly Prize Draws
                </Link>
              </li>
              <li>
                <Link to="/subscribe" className="gp-footer-link">
                  Membership Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Golfer Portal */}
          <div className="gp-footer-col">
            <h4 className="gp-col-title">Golfer Workspace</h4>
            <ul className="gp-link-list">
              <li>
                <Link to="/dashboard" className="gp-footer-link">
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="gp-footer-link">
                  Score Entry (Stableford)
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="gp-footer-link">
                  Winner Verification
                </Link>
              </li>
              <li>
                <Link to="/admin" className="gp-footer-link">
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Compliance */}
          <div className="gp-footer-col">
            <h4 className="gp-col-title">Trust &amp; Integrity</h4>
            <p className="gp-trust-desc">
              All prize draws are powered by verifiable cryptographic
              algorithms. Winners submit platform handicap scorecards reviewed
              manually prior to payout release.
            </p>
            <div className="flex items-center gap-3 gp-trust-chips">
              <div className="gp-trust-chip">
                <Trophy size={14} />
                <span>40% Rollover Jackpot</span>
              </div>
              <div className="gp-trust-chip">
                <ShieldCheck size={14} />
                <span>PCI-Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="gp-footer-bottom flex flex-col md-flex-row justify-between items-center gap-4">
          <div className="gp-copyright">
            © {currentYear} GreenPulse Platform Ltd. All rights reserved.
          </div>
          <div className="flex gap-4 gp-tagline-row">
            <span className="gp-tagline">
              <Flag size={12} />
              Play With Purpose · Empowering Golfers &amp; Communities
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .gp-footer {
          position: relative;
          background-color: var(--forest-950);
          color: #FFFFFF;
          padding-top: var(--space-16);
          padding-bottom: var(--space-12);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .gp-footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #43a047, #81c784, #43a047, transparent);
          background-size: 200% auto;
          animation: gpTopSweep 6s linear infinite;
        }

        @keyframes gpTopSweep {
          to { background-position: 200% center; }
        }

        .gp-footer-glow {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 520px;
          height: 300px;
          background: radial-gradient(ellipse, rgba(67, 160, 71, 0.16), transparent 70%);
          pointer-events: none;
          filter: blur(10px);
        }

        .gp-footer-grid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-12);
          padding-bottom: var(--space-12);
          border-bottom: 1px solid rgba(255, 255, 255, 0.10);
        }

        .gp-footer-brand,
        .gp-footer-col {
          animation: gpColFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .gp-footer-grid > div:nth-child(1) { animation-delay: 0ms; }
        .gp-footer-grid > div:nth-child(2) { animation-delay: 60ms; }
        .gp-footer-grid > div:nth-child(3) { animation-delay: 120ms; }
        .gp-footer-grid > div:nth-child(4) { animation-delay: 180ms; }

        @keyframes gpColFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .gp-brand-row {
          margin-bottom: var(--space-4);
        }

        .gp-brand-mark {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background-color: var(--lime-500);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--forest-950);
          box-shadow: 0 0 0 0 rgba(174, 213, 129, 0.5);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .gp-brand-mark:hover {
          transform: scale(1.08) rotate(-4deg);
          box-shadow: 0 0 0 6px rgba(174, 213, 129, 0.12);
        }

        .gp-brand-mark span {
          font-family: var(--font-editorial);
          font-weight: 700;
          font-size: 1.2rem;
        }

        .gp-brand-name {
          font-family: var(--font-editorial);
          font-weight: 700;
          font-size: 1.5rem;
          letter-spacing: -0.02em;
          color: #FFFFFF;
        }

        .gp-brand-desc {
          color: var(--charcoal-300);
          font-size: var(--text-sm);
          line-height: 1.6;
        }

        .gp-audit-pill {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          margin-top: var(--space-4);
          color: var(--lime-300);
          font-size: var(--text-xs);
          font-weight: 600;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          background: rgba(174, 213, 129, 0.08);
          border: 1px solid rgba(174, 213, 129, 0.18);
          transition: background 0.25s ease, transform 0.25s ease;
        }

        .gp-audit-pill:hover {
          background: rgba(174, 213, 129, 0.14);
          transform: translateY(-1px);
        }

        .gp-heart-beat {
          animation: gpHeartBeat 1.8s ease-in-out infinite;
        }

        @keyframes gpHeartBeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.22); }
          30% { transform: scale(1); }
          45% { transform: scale(1.14); }
          60% { transform: scale(1); }
        }

        .gp-col-title {
          color: #FFFFFF;
          font-size: var(--text-base);
          margin-bottom: var(--space-4);
          position: relative;
          display: inline-block;
        }

        .gp-col-title::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -6px;
          width: 24px;
          height: 2px;
          background: linear-gradient(90deg, #43a047, #81c784);
          border-radius: var(--radius-full);
        }

        .gp-link-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .gp-footer-link {
          position: relative;
          color: var(--charcoal-300);
          font-size: var(--text-sm);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
          transition: color 0.25s ease, padding-left 0.25s ease;
        }

        .gp-footer-link::before {
          content: '';
          position: absolute;
          left: -14px;
          top: 50%;
          transform: translateY(-50%) scale(0);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #81c784;
          transition: transform 0.25s ease;
        }

        .gp-footer-link:hover {
          color: #FFFFFF;
          padding-left: 4px;
        }

        .gp-footer-link:hover::before {
          transform: translateY(-50%) scale(1);
        }

        .gp-trust-desc {
          color: var(--charcoal-400);
          font-size: var(--text-xs);
          line-height: 1.6;
        }

        .gp-trust-chips {
          margin-top: var(--space-4);
          flex-wrap: wrap;
        }

        .gp-trust-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--lime-400);
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: rgba(174, 213, 129, 0.08);
          border: 1px solid rgba(174, 213, 129, 0.16);
          transition: background 0.25s ease, transform 0.25s ease;
        }

        .gp-trust-chip:hover {
          background: rgba(174, 213, 129, 0.16);
          transform: translateY(-2px);
        }

        .gp-footer-bottom {
          padding-top: var(--space-8);
          font-size: var(--text-xs);
          color: var(--charcoal-500);
          animation: gpColFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
        }

        .gp-copyright {
          opacity: 0.85;
        }

        .gp-tagline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--charcoal-400);
        }

        .gp-tagline svg {
          color: var(--lime-400);
        }

        @media (prefers-reduced-motion: reduce) {
          .gp-footer::before,
          .gp-footer-brand,
          .gp-footer-col,
          .gp-footer-bottom,
          .gp-heart-beat,
          .gp-brand-mark,
          .gp-audit-pill,
          .gp-trust-chip,
          .gp-footer-link {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </footer>
  );
};
