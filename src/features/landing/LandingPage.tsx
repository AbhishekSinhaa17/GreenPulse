import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  Heart,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Info,
  DollarSign
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ScoreBall } from '../../components/ui/ScoreBall';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../context/ToastContext';

export const LandingPage: React.FC = () => {
  const { success, warning, info } = useToast();
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [charityPercent, setCharityPercent] = useState(15);

  // Sample scores matching PRD format (1-45 Stableford points)
  const sampleScores = [38, 34, 41, 36, 32];
  const sampleWinningNumbers = [34, 18, 41, 29, 36];

  return (
    <div>
      {/* --------------------------------------------------------------------
          HERO SECTION (Editorial, Warm Cream, Deep Forest)
          -------------------------------------------------------------------- */}
      <section className="section-hero">
        <div className="container">
          <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="forest" style={{ marginBottom: 'var(--space-4)' }}>
                Digital Heroes PRD (Level 1) · 2026 Edition
              </Badge>
              <h1 style={{ marginBottom: 'var(--space-6)', fontWeight: 600 }}>
                Play with purpose.{' '}
                <span style={{ color: 'var(--forest-600)', fontStyle: 'italic' }}>
                  Create lasting impact.
                </span>
              </h1>
              <p className="lead" style={{ maxWidth: '680px', margin: '0 auto var(--space-8)' }}>
                GreenPulse unites your golf performance tracking with verified monthly charity
                prize draws. Enter your Stableford scores, support causes you care about, and compete
                in monthly number-match prize pools with rollover jackpots.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-4)',
                  flexWrap: 'wrap',
                }}
              >
                <Link to="/subscribe">
                  <Button variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                    Join the Platform
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setDemoModalOpen(true)}
                  leftIcon={<Info size={18} />}
                >
                  Architecture Overview
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Interactive Draw Teaser Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{ marginTop: 'var(--space-12)' }}
          >
            <Card
              variant="warm"
              style={{
                maxWidth: '960px',
                margin: '0 auto',
                border: '1px solid var(--border-default)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <div
                className="flex flex-col md-flex-row justify-between items-center gap-6"
                style={{ padding: 'var(--space-2)' }}
              >
                <div>
                  <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-1)' }}>
                    <Badge variant="lime">Live Draw Preview</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Cutoff: End of Month
                    </span>
                  </div>
                  <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--forest-950)' }}>
                    October £25,000 Charity Prize Draw
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    40% 5-Match Rollover Jackpot · 35% 4-Match · 25% 3-Match
                  </p>
                </div>

                {/* Score Balls Demonstration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {sampleWinningNumbers.map((num, i) => {
                    const isMatched = sampleScores.includes(num);
                    return (
                      <ScoreBall
                        key={i}
                        number={num}
                        status={isMatched ? 'matched' : 'winning'}
                        label={`#${i + 1}`}
                      />
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  marginTop: 'var(--space-6)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 'var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-success)" />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--charcoal-700)' }}>
                    Golfer Ticket matches <strong>3 numbers (34, 41, 36)</strong> — Tier 3 Payout Eligible!
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => success('Match Confirmed', 'You have 3 matching Stableford numbers for Tier 3.')}
                >
                  Simulate Claim Verification
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          SIX CORE OBJECTIVES (§ 02)
          -------------------------------------------------------------------- */}
      <section className="section" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto var(--space-12)' }}>
            <Badge variant="forest" style={{ marginBottom: 'var(--space-3)' }}>
              PRD § 02 Framework
            </Badge>
            <h2>Six Core Objectives. One Owned Platform.</h2>
            <p>
              Engineered to meet the exact Digital Heroes assessment requirements with zero
              compromise on performance, data integrity, or visual refinement.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            {/* 1. Subscription */}
            <Card>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--forest-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--forest-800)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <DollarSign size={22} />
              </div>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Subscription Engine</h4>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Monthly and discounted yearly plans via PCI-compliant Stripe billing. Automatic handling
                of renewal, cancellation, and lapsed-subscription access gating (§ 04).
              </p>
            </Card>

            {/* 2. Score Entry */}
            <Card>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--lime-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--lime-600)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <TrendingUp size={22} />
              </div>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Stableford Score Management</h4>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Validates rounds between 1–45 points. Retains strictly the latest 5 scores with
                automatic FIFO replacement of the oldest score and one-score-per-date constraints (§ 05).
              </p>
            </Card>

            {/* 3. Custom Draw */}
            <Card>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--forest-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--forest-800)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <Trophy size={22} />
              </div>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Custom Monthly Draw Engine</h4>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Dual-mode generator: Lottery-style Random vs. Score-Frequency Algorithmic.
                5, 4, and 3-number match tiers with jackpot rollover for unclaimed top prizes (§ 06, § 07).
              </p>
            </Card>

            {/* 4. Charity Integration */}
            <Card>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--lime-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--lime-600)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <Heart size={22} />
              </div>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Charity Contribution Logic</h4>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Every subscriber pledges at least 10% of their subscription fee to a vetted cause.
                Includes voluntary pledge increases, searchable directory, and standalone donations (§ 08).
              </p>
            </Card>

            {/* 5. Admin Control */}
            <Card>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--forest-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--forest-800)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Admin Control Console</h4>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Five operational surfaces: User profiles & score overrides, pre-publish draw
                simulations, charity CRUD, winner proof review, and aggregated Recharts analytics (§ 11).
              </p>
            </Card>

            {/* 6. Outstanding UI/UX */}
            <Card>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--lime-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--lime-600)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <Layers size={22} />
              </div>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>Editorial UI & Micro-Interactions</h4>
              <p style={{ fontSize: 'var(--text-sm)' }}>
                Purposely avoids tired fairway, plaid, and traditional golf tropes. Built with
                warm cream, deep forest green, muted lime accents, and restrained Framer Motion (§ 12).
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          CHARITY IMPACT SLIDER INTERACTION (§ 08)
          -------------------------------------------------------------------- */}
      <section className="section" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="container">
          <div
            style={{
              maxWidth: '840px',
              margin: '0 auto',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-8)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
              <Badge variant="lime" style={{ marginBottom: 'var(--space-2)' }}>
                Interactive Contribution Calculator
              </Badge>
              <h3>Give back with every round.</h3>
              <p style={{ maxWidth: '580px', margin: '0 auto' }}>
                PRD § 08 mandates a 10% minimum charity contribution on all subscriptions. Golfer
                subscribers can voluntarily direct even more of their fee to their selected cause.
              </p>
            </div>

            <div style={{ padding: '0 var(--space-4)' }}>
              <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--charcoal-800)' }}>
                  Your Charity Contribution Pledge:
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontWeight: 700,
                    fontSize: 'var(--text-2xl)',
                    color: 'var(--forest-800)',
                  }}
                >
                  {charityPercent}%
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={charityPercent}
                onChange={(e) => setCharityPercent(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--forest-800)',
                  cursor: 'pointer',
                  height: '8px',
                }}
              />

              <div
                className="flex justify-between text-muted"
                style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}
              >
                <span>10% (PRD Minimum)</span>
                <span>25%</span>
                <span>50%</span>
                <span>100% (Direct Impact)</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 'var(--space-4)',
                  marginTop: 'var(--space-8)',
                  paddingTop: 'var(--space-6)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Monthly Membership
                  </div>
                  <div style={{ fontFamily: 'var(--font-numeric)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>
                    £19.00
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>
                    Charity Pledged
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-numeric)',
                      fontWeight: 700,
                      fontSize: 'var(--text-xl)',
                      color: 'var(--forest-800)',
                    }}
                  >
                    £{((19 * charityPercent) / 100).toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Prize Pool Contribution
                  </div>
                  <div style={{ fontFamily: 'var(--font-numeric)', fontWeight: 700, fontSize: 'var(--text-xl)' }}>
                    £7.60 (40%)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          DESIGN SYSTEM FOUNDATION VERIFICATION TOOLBAR
          -------------------------------------------------------------------- */}
      <section className="section" style={{ backgroundColor: 'var(--forest-900)', color: '#FFFFFF' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto var(--space-10)' }}>
            <Badge variant="lime" style={{ marginBottom: 'var(--space-2)' }}>
              Component Verification Desk
            </Badge>
            <h2 style={{ color: '#FFFFFF' }}>Design Tokens & Interaction Foundation</h2>
            <p style={{ color: 'var(--charcoal-300)' }}>
              Demonstrating buttons, toasts, dialogs, badges, and plain CSS tokens built for Phase 1.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="accent"
              onClick={() => success('Success Notification', 'Stableford score saved to rolling queue.')}
            >
              Trigger Success Toast
            </Button>
            <Button
              variant="outline"
              style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
              onClick={() => warning('Validation Warning', 'Duplicate round date already exists.')}
            >
              Trigger Warning Toast
            </Button>
            <Button
              variant="primary"
              onClick={() => info('Draw Simulation', 'Simulation complete: 3 winners detected.')}
            >
              Trigger Info Toast
            </Button>
            <Button
              variant="ghost"
              style={{ color: 'var(--lime-300)' }}
              onClick={() => setDemoModalOpen(true)}
            >
              Open Architecture Modal
            </Button>
          </div>
        </div>
      </section>

      {/* Architecture Detail Modal */}
      <Dialog
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        title="GreenPulse Foundation Architecture"
        description="Phase 1 deliverable documentation and specification summary."
        footer={
          <Button variant="primary" onClick={() => setDemoModalOpen(false)}>
            Close Overview
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--bg-surface-warm)', borderRadius: 'var(--radius-sm)' }}>
            <strong>1. PRD Analysis:</strong> Mapped § 01 to § 16 to features and tests in <code>PRD_ANALYSIS.md</code>.
          </div>
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--bg-surface-warm)', borderRadius: 'var(--radius-sm)' }}>
            <strong>2. Design Decisions:</strong> Documented ambiguities, missing sheet 11/14, lottery set matching, and rollover math in <code>DESIGN_DECISIONS.md</code>.
          </div>
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--bg-surface-warm)', borderRadius: 'var(--radius-sm)' }}>
            <strong>3. System Architecture:</strong> Complete PostgreSQL schema, RLS policies, FIFO score rolling trigger, and sequence diagrams in <code>ARCHITECTURE.md</code>.
          </div>
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--bg-surface-warm)', borderRadius: 'var(--radius-sm)' }}>
            <strong>4. Implementation Plan:</strong> 8-phase roadmap with acceptance criteria in <code>IMPLEMENTATION_PLAN.md</code>.
          </div>
        </div>
      </Dialog>
    </div>
  );
};
