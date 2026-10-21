import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trophy, ShieldCheck } from 'lucide-react';

const currentYear = new Date().getFullYear();

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--forest-950)',
        color: '#FFFFFF',
        paddingTop: 'var(--space-16)',
        paddingBottom: 'var(--space-12)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-12)',
            paddingBottom: 'var(--space-12)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
          }}
        >
          {/* Brand & Mission */}
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-4)' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--lime-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--forest-950)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-editorial)', fontWeight: 700, fontSize: '1.2rem' }}>
                  G
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-editorial)',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                }}
              >
                GreenPulse
              </span>
            </div>
            <p style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              Play with purpose. Create lasting impact. A golf performance tracking and monthly
              draw engine directing subscriber revenue to vetted causes.
            </p>
            <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-4)', color: 'var(--lime-300)' }}>
              <Heart size={16} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                100% of charity pledges audited & distributed
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
              Platform
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <li>
                <Link to="/#how-it-works" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/charities" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  Charity Directory
                </Link>
              </li>
              <li>
                <Link to="/draws" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  Monthly Prize Draws
                </Link>
              </li>
              <li>
                <Link to="/subscribe" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  Membership Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Golfer Portal */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
              Golfer Workspace
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <li>
                <Link to="/dashboard" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  My Dashboard
                </Link>
              </li>
              <li>
                <Link to="/dashboard" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  Score Entry (Stableford)
                </Link>
              </li>
              <li>
                <Link to="/dashboard" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  Winner Verification
                </Link>
              </li>
              <li>
                <Link to="/admin" style={{ color: 'var(--charcoal-300)', fontSize: 'var(--text-sm)' }}>
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Compliance */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
              Trust & Integrity
            </h4>
            <p style={{ color: 'var(--charcoal-400)', fontSize: 'var(--text-xs)', lineHeight: 1.6 }}>
              All prize draws are powered by verifiable cryptographic algorithms. Winners submit
              platform handicap scorecards reviewed manually prior to payout release.
            </p>
            <div className="flex items-center gap-3" style={{ marginTop: 'var(--space-4)' }}>
              <div className="flex items-center gap-1" style={{ color: 'var(--lime-400)', fontSize: '0.75rem' }}>
                <Trophy size={14} />
                <span>40% Rollover Jackpot</span>
              </div>
              <div className="flex items-center gap-1" style={{ color: 'var(--lime-400)', fontSize: '0.75rem' }}>
                <ShieldCheck size={14} />
                <span>PCI-Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div
          className="flex flex-col md-flex-row justify-between items-center gap-4"
          style={{ paddingTop: 'var(--space-8)', fontSize: 'var(--text-xs)', color: 'var(--charcoal-500)' }}
        >
          <div>
            © {currentYear} GreenPulse Platform Ltd. All rights reserved. Built for Digital Heroes Recruitment Assignment.
          </div>
          <div className="flex gap-4">
            <span style={{ color: 'var(--charcoal-400)' }}>Digital Heroes PRD Level 1 Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
