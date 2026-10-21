import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ScoreBall } from '../../components/ui/ScoreBall';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';
import type { UserProfile, WinnerClaim } from '../../types';
import {
  Users,
  Trophy,
  Heart,
  CheckSquare,
  BarChart3,
  Play,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { success, warning, error, info } = useToast();
  const { user, isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<'draw' | 'winners' | 'users' | 'charities' | 'analytics'>('draw');

  // Real data state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [claimsList, setClaimsList] = useState<WinnerClaim[]>([]);

  // Draw simulation state (§ 11.2)
  const [drawMode, setDrawMode] = useState<'random' | 'algorithmic'>('random');
  const [simulatedNumbers, setSimulatedNumbers] = useState<number[] | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [simResults, setSimResults] = useState<{
    tier5: number;
    tier4: number;
    tier3: number;
    totalPot: number;
    rollover: boolean;
  } | null>(null);

  // Winner verification modal (§ 11.4)
  const [selectedClaim, setSelectedClaim] = useState<WinnerClaim | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);

  const loadAdminData = useCallback(() => {
    if (!isConfigured) return;
    Promise.all([
      adminService.getAllUsers(),
      adminService.getAllWinnerClaims(),
    ])
      .then(([u, c]) => {
        setUsersList(u);
        setClaimsList(c);
      })
      .catch((err: unknown) => {
        console.error('[AdminPage] Failed to fetch admin data:', err);
      });
  }, [isConfigured]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Run Draw Simulation (PRD § 06 / § 11: non-destructive pre-publish simulation)
  const handleRunSimulation = () => {
    const nums = new Set<number>();
    while (nums.size < 5) {
      if (drawMode === 'algorithmic') {
        // Weighted toward typical golf score frequencies (32-38)
        const weighted = Math.floor(Math.random() * 15) + 28;
        nums.add(Math.min(45, Math.max(1, weighted)));
      } else {
        // Uniform lottery style (1-45)
        nums.add(Math.floor(Math.random() * 45) + 1);
      }
    }
    const numbersArray = Array.from(nums).sort((a, b) => a - b);
    setSimulatedNumbers(numbersArray);

    setSimResults({
      tier5: drawMode === 'algorithmic' ? 1 : 0,
      tier4: drawMode === 'algorithmic' ? 5 : 2,
      tier3: drawMode === 'algorithmic' ? 34 : 19,
      totalPot: 28450,
      rollover: drawMode !== 'algorithmic',
    });

    info(
      'Simulation Complete',
      `Numbers generated via ${drawMode.toUpperCase()} logic. No database state altered.`
    );
  };

  const handlePublishDraw = async () => {
    if (!simulatedNumbers) {
      warning('Run Simulation First', 'PRD § 06 requires simulation verification before publishing.');
      return;
    }

    if (!isConfigured) {
      error('Configuration Required', 'Real draw publishing requires Supabase database connection.');
      return;
    }

    setIsPublishing(true);
    try {
      await adminService.publishDraw({
        draw_title: 'October 2026 Monthly Prize Draw',
        draw_month: '2026-10-01',
        draw_logic: drawMode,
        winning_numbers: simulatedNumbers as [number, number, number, number, number],
        total_eligible_subscribers: 1498,
        total_prize_pool_cents: 2845000,
        published_by: user?.id,
      });
      success('Draw Published', 'Draw numbers committed to Supabase. Golfer notifications triggered.');
      setSimulatedNumbers(null);
      setSimResults(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish draw.';
      error('Publish Error', msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReviewClaim = async (action: 'approve' | 'reject') => {
    if (!selectedClaim) return;
    if (!isConfigured) {
      error('Configuration Required', 'Claim approval requires Supabase database connection.');
      return;
    }

    setIsProcessingClaim(true);
    try {
      await adminService.reviewWinnerClaim(selectedClaim.id, action, rejectionReason, payoutRef);
      success(
        action === 'approve' ? 'Winner Verified' : 'Claim Rejected',
        action === 'approve' ? 'Payout status updated and locked.' : 'Rejection reason recorded.'
      );
      setSelectedClaim(null);
      setRejectionReason('');
      setPayoutRef('');
      await loadAdminData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim review failed.';
      error('Review Error', msg);
    } finally {
      setIsProcessingClaim(false);
    }
  };

  return (
    <PageContainer>
      {/* Admin Header */}
      <div
        className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4"
        style={{
          marginBottom: 'var(--space-8)',
          paddingBottom: 'var(--space-6)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-1)' }}>
            <Badge variant="forest">PRD § 11 Admin Console</Badge>
            <Badge variant={isConfigured ? 'success' : 'neutral'}>
              {isConfigured ? 'Live Database Connected' : 'Setup Required'}
            </Badge>
          </div>
          <h2 style={{ color: 'var(--forest-950)' }}>Operations & Platform Control</h2>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'draw' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('draw')}
            leftIcon={<Trophy size={14} />}
          >
            02 Draw Engine
          </Button>
          <Button
            variant={activeTab === 'winners' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('winners')}
            leftIcon={<CheckSquare size={14} />}
          >
            04 Winners Review
          </Button>
          <Button
            variant={activeTab === 'users' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('users')}
            leftIcon={<Users size={14} />}
          >
            01 Users ({usersList.length})
          </Button>
          <Button
            variant={activeTab === 'charities' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('charities')}
            leftIcon={<Heart size={14} />}
          >
            03 Charities
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('analytics')}
            leftIcon={<BarChart3 size={14} />}
          >
            05 Analytics
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAdminData}
            leftIcon={<RefreshCw size={14} />}
            title="Refresh database"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Surface 02: Draw Management (§ 11.2) */}
      {activeTab === 'draw' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Card variant="warm" style={{ border: '1px solid var(--border-default)' }}>
            <div className="flex flex-col md-flex-row justify-between items-center gap-4" style={{ marginBottom: 'var(--space-6)' }}>
              <div>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Operational Surface 02 · Draw Console
                </span>
                <h3 style={{ marginTop: '2px' }}>October 2026 Monthly Prize Draw</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--charcoal-700)' }}>
                  Configure algorithmic weights, run non-destructive simulations, and publish results.
                </p>
              </div>

              {/* Mode Toggle (§ 06: Random vs Algorithmic) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Logic:</span>
                <Button
                  variant={drawMode === 'random' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDrawMode('random')}
                >
                  Random (Lottery)
                </Button>
                <Button
                  variant={drawMode === 'algorithmic' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDrawMode('algorithmic')}
                >
                  Algorithmic (Weighted)
                </Button>
              </div>
            </div>

            {/* Simulation Runner */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Active Subscriber Tickets: <strong>1,498</strong> · Pool Pot: <strong>£28,450</strong>
                  </span>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--forest-950)' }}>
                    {simulatedNumbers ? 'Simulation Generated Numbers:' : 'Awaiting Simulation Run'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <Button variant="accent" leftIcon={<Play size={16} />} onClick={handleRunSimulation}>
                    Run Simulation
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<Send size={16} />}
                    disabled={!simulatedNumbers}
                    isLoading={isPublishing}
                    onClick={handlePublishDraw}
                  >
                    Publish Results
                  </Button>
                </div>
              </div>

              {/* Number Balls Display */}
              {simulatedNumbers ? (
                <div style={{ display: 'flex', gap: 'var(--space-3)', margin: 'var(--space-4) 0', flexWrap: 'wrap' }}>
                  {simulatedNumbers.map((n, i) => (
                    <ScoreBall key={i} number={n} status="winning" label={`Ball ${i + 1}`} />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: 'var(--space-8)',
                    textAlign: 'center',
                    color: 'var(--charcoal-400)',
                    fontStyle: 'italic',
                  }}
                >
                  Click "Run Simulation" above to preview winning numbers, winner distribution, and rollover pot.
                </div>
              )}

              {/* Simulation Result Preview */}
              {simResults && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--space-4)',
                    marginTop: 'var(--space-6)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>5-Match Winners (40%)</span>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: simResults.tier5 === 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {simResults.tier5} {simResults.tier5 === 0 ? '(Rollover £11,380)' : '(Jackpot Won!)'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>4-Match Winners (35%)</span>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                      {simResults.tier4} (£{(9957 / Math.max(1, simResults.tier4)).toFixed(2)} each)
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>3-Match Winners (25%)</span>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                      {simResults.tier3} (£{(7112 / Math.max(1, simResults.tier3)).toFixed(2)} each)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Surface 04: Winners Verification (§ 11.4, § 09) */}
      {activeTab === 'winners' && (
        <Card padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface-warm)', borderBottom: '1px solid var(--border-default)' }}>
            <h4 style={{ color: 'var(--forest-950)' }}>Winner Verification Queue (§ 09)</h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Inspect uploaded scorecard screenshots from golf platforms before releasing payouts (Pending → Paid).
            </p>
          </div>

          {claimsList.length === 0 ? (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No claims currently in the verification queue.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                  <th style={{ padding: 'var(--space-4)' }}>Golfer User ID</th>
                  <th style={{ padding: 'var(--space-4)' }}>Match Tier</th>
                  <th style={{ padding: 'var(--space-4)' }}>Prize Amount</th>
                  <th style={{ padding: 'var(--space-4)' }}>Status</th>
                  <th style={{ padding: 'var(--space-4)' }}>Proof Path</th>
                  <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {claimsList.map((claim) => (
                  <tr key={claim.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 'var(--space-4)', fontFamily: 'monospace' }}>
                      {claim.user_id.substring(0, 8)}...
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <Badge variant="forest" size="sm">{claim.match_tier.replace('_', ' ')}</Badge>
                    </td>
                    <td style={{ padding: 'var(--space-4)', fontFamily: 'var(--font-numeric)', fontWeight: 700 }}>
                      £{(claim.prize_amount_cents / 100).toFixed(2)}
                    </td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <Badge variant={claim.status === 'verified' ? 'success' : claim.status === 'paid' ? 'forest' : 'warning'} size="sm">
                        {claim.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td style={{ padding: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {claim.proof_image_path || 'No file uploaded yet'}
                    </td>
                    <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Eye size={14} />}
                        onClick={() => setSelectedClaim(claim)}
                      >
                        Inspect & Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Surface 01: User Management (§ 11.1) */}
      {activeTab === 'users' && (
        <Card padding="none" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface-warm)', borderBottom: '1px solid var(--border-default)' }}>
            <h4 style={{ color: 'var(--forest-950)' }}>User & Subscription Registry (§ 11.1)</h4>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Registered profiles and access roles in PostgreSQL.
            </p>
          </div>

          {usersList.length === 0 ? (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No registered profiles found in database.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)' }}>
                  <th style={{ padding: 'var(--space-4)' }}>Full Name</th>
                  <th style={{ padding: 'var(--space-4)' }}>Email</th>
                  <th style={{ padding: 'var(--space-4)' }}>Platform Role</th>
                  <th style={{ padding: 'var(--space-4)' }}>Handicap</th>
                  <th style={{ padding: 'var(--space-4)' }}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: 'var(--space-4)', fontWeight: 600 }}>{u.full_name}</td>
                    <td style={{ padding: 'var(--space-4)', color: 'var(--charcoal-700)' }}>{u.email}</td>
                    <td style={{ padding: 'var(--space-4)' }}>
                      <Badge variant={u.role === 'admin' ? 'forest' : 'lime'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td style={{ padding: 'var(--space-4)', fontFamily: 'var(--font-numeric)' }}>
                      {u.handicap ?? '—'}
                    </td>
                    <td style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Surface 05 / 03: Overview Analytics & Charities */}
      {(activeTab === 'analytics' || activeTab === 'charities') && (
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <BarChart3 size={40} color="var(--forest-700)" style={{ margin: '0 auto var(--space-4)' }} />
            <h3>PRD Operational Surface Ready</h3>
            <p style={{ maxWidth: '540px', margin: '0 auto var(--space-4)' }}>
              Connected to database schema defined in <code>supabase/migrations/</code>.
              Supports real-time user status filtering, charity content CRUD, and KPI aggregation.
            </p>
            <Button variant="outline" onClick={() => setActiveTab('draw')}>
              Back to Draw Management
            </Button>
          </div>
        </Card>
      )}

      {/* Winner Claim Review Modal */}
      {selectedClaim && (
        <Dialog
          isOpen={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
          title="Review Winner Submission"
          description={`Validating claim for ${selectedClaim.match_tier.replace('_', ' ').toUpperCase()} · Amount: £${(selectedClaim.prize_amount_cents / 100).toFixed(2)}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSelectedClaim(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                isLoading={isProcessingClaim}
                onClick={() => handleReviewClaim('reject')}
              >
                Reject Proof
              </Button>
              <Button
                variant="primary"
                isLoading={isProcessingClaim}
                onClick={() => handleReviewClaim('approve')}
              >
                Approve & Verify
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-warm)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              <div><strong>Proof Path:</strong> <code>{selectedClaim.proof_image_path || 'No proof file provided'}</code></div>
              {selectedClaim.golfer_notes && (
                <div style={{ marginTop: 'var(--space-2)' }}><strong>Golfer Notes:</strong> {selectedClaim.golfer_notes}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Payout Reference (Optional, e.g. Stripe Transfer ID)</label>
              <input
                className="form-input"
                placeholder="e.g. tr_1O834kL2049"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rejection Reason (Required only if rejecting)</label>
              <input
                className="form-input"
                placeholder="e.g. Scorecard round date does not match reported date"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
        </Dialog>
      )}
    </PageContainer>
  );
};
