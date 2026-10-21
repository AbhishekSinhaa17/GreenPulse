import React, { useState, useEffect, useCallback } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ScoreBall } from '../../components/ui/ScoreBall';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { scoreService } from '../../services/scoreService';
import { charityService } from '../../services/charityService';
import { drawService } from '../../services/drawService';
import { subscriptionService } from '../../services/subscriptionService';
import { authService } from '../../services/authService';
import type { GolfScore, CharityPreference, WinnerClaim, Subscription } from '../../types';
import {
  Plus,
  Trash2,
  Upload,
  CreditCard,
  AlertCircle,
  RefreshCw,
  UserCheck
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { success, error, warning } = useToast();
  const { user, profile, refreshProfile, isConfigured } = useAuth();

  // State
  const [scores, setScores] = useState<GolfScore[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [charityPref, setCharityPref] = useState<CharityPreference | null>(null);
  const [winnerClaims, setWinnerClaims] = useState<WinnerClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Profile Edit Modal (§ 10: Golfer Handicap & Home Club)
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || '');
  const [editHandicap, setEditHandicap] = useState<string>(profile?.handicap ? String(profile.handicap) : '');
  const [editHomeClub, setEditHomeClub] = useState(profile?.home_club || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Score Entry Modal
  const [isAddScoreOpen, setIsAddScoreOpen] = useState(false);
  const [newScoreVal, setNewScoreVal] = useState<number | ''>(36);
  const [newScoreDate, setNewScoreDate] = useState<string>('');
  const [newScoreCourse, setNewScoreCourse] = useState<string>('');
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);

  // Proof Upload Modal
  const [isUploadProofOpen, setIsUploadProofOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<WinnerClaim | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [golferNotes, setGolferNotes] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const loadDashboardData = useCallback(() => {
    if (!isConfigured || !user) {
      return;
    }

    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    Promise.all([
      scoreService.getScores(user.id),
      subscriptionService.getUserSubscription(user.id),
      charityService.getUserCharityPreference(user.id),
      drawService.getUserWinnerClaims(user.id),
    ])
      .then(([fetchedScores, fetchedSub, fetchedPref, fetchedClaims]) => {
        setScores(fetchedScores);
        setSubscription(fetchedSub);
        setCharityPref(fetchedPref);
        setWinnerClaims(fetchedClaims);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data from Supabase.';
        setLoadError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user, isConfigured]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle Score Submission with Real Database Enforcement
  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfigured) {
      error(
        'Database Required',
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to record real rounds.'
      );
      return;
    }

    if (newScoreVal === '' || newScoreVal < 1 || newScoreVal > 45) {
      error('Invalid Score', 'Stableford score must be between 1 and 45 points.');
      return;
    }

    if (!newScoreDate) {
      error('Missing Date', 'Please select a date for the round.');
      return;
    }

    setIsSubmittingScore(true);
    try {
      const updated = await scoreService.submitScore(Number(newScoreVal), newScoreDate, newScoreCourse);
      setScores(updated);
      setIsAddScoreOpen(false);
      setNewScoreVal(36);
      setNewScoreDate('');
      setNewScoreCourse('');
      success('Score Recorded', `Added ${newScoreVal} pts. 5-score rolling queue updated automatically in database.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record score.';
      error('Score Error', msg);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleDeleteScore = async (id: string) => {
    if (!isConfigured) {
      warning('Offline Mode', 'Cannot delete from database when Supabase is unconfigured.');
      return;
    }
    try {
      await scoreService.deleteScore(id);
      setScores((prev) => prev.filter((s) => s.id !== id));
      warning('Score Removed', 'Score deleted from your active 5-round ticket.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete score.';
      error('Delete Error', msg);
    }
  };

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim || !proofFile || !user) {
      error('Missing File', 'Please select a scorecard image file.');
      return;
    }

    setIsUploadingProof(true);
    try {
      await drawService.submitWinnerProof(selectedClaim.id, user.id, proofFile, golferNotes);
      success('Proof Submitted', 'Your scorecard proof has been uploaded for admin review.');
      setIsUploadProofOpen(false);
      setProofFile(null);
      setGolferNotes('');
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Proof upload failed.';
      error('Upload Error', msg);
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const parsedHandicap = editHandicap.trim() !== '' ? Number(editHandicap) : undefined;
      await authService.updateProfile(user.id, {
        full_name: editFullName.trim() || profile?.full_name,
        handicap: parsedHandicap,
        home_club: editHomeClub.trim() || undefined,
      });
      await refreshProfile();
      success('Profile Updated', 'Your golfer details have been saved to PostgreSQL.');
      setIsEditProfileOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      error('Update Error', msg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <PageContainer>
      {/* 1. Header: Real Subscription Status (§ 10: "active / inactive / renewal date") */}
      <div
        className="flex flex-col md-flex-row justify-between items-start md-items-center gap-4"
        style={{
          marginBottom: 'var(--space-8)',
          paddingBottom: 'var(--space-6)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Golfer Workspace · {user?.email || 'Guest Mode'}
          </span>
          <h2 style={{ color: 'var(--forest-950)' }}>
            Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'Golfer'}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--charcoal-700)' }}>
            <span>Handicap: <strong style={{ color: 'var(--forest-800)' }}>{profile?.handicap !== undefined && profile?.handicap !== null ? profile.handicap : 'Unassigned'}</strong></span>
            <span>•</span>
            <span>Home Club: <strong style={{ color: 'var(--forest-800)' }}>{profile?.home_club || 'Not set'}</strong></span>
            <span>•</span>
            <button
              onClick={() => {
                setEditFullName(profile?.full_name || '');
                setEditHandicap(profile?.handicap !== undefined && profile?.handicap !== null ? String(profile.handicap) : '');
                setEditHomeClub(profile?.home_club || '');
                setIsEditProfileOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--forest-700)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0,
              }}
            >
              Edit Golfer Profile
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Membership:</span>
              {subscription && subscription.status === 'active' ? (
                <Badge variant="success">Active Member</Badge>
              ) : (
                <Badge variant="neutral">No Active Plan</Badge>
              )}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--charcoal-600)', display: 'block', marginTop: '2px' }}>
              {subscription && subscription.status === 'active'
                ? `${subscription.plan_tier === 'yearly' ? 'Yearly Plan (£190/yr)' : 'Monthly Plan (£19/mo)'} · Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : 'Subscribe to activate monthly draw ticket'}
            </span>
          </div>

          {subscription && subscription.status === 'active' ? (
            <Button variant="outline" size="sm" leftIcon={<CreditCard size={14} />}>
              Manage Billing
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.location.assign('/subscribe')}
              leftIcon={<CreditCard size={14} />}
            >
              Join Membership
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={loadDashboardData}
            leftIcon={<RefreshCw size={14} />}
            title="Refresh database records"
          >
            Refresh
          </Button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-error-bg)',
            border: '1px solid var(--color-error-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            color: 'var(--color-error)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{loadError}</span>
        </div>
      )}

      {/* Grid: Selected Charity & Participation / Winnings Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-8)',
        }}
      >
        {/* Module A: Selected Charity (§ 10) */}
        <Card>
          <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-4)' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Designated Cause (§ 08)
              </span>
              <h4 style={{ marginTop: '2px' }}>
                {charityPref?.charity?.name || 'No Charity Selected Yet'}
              </h4>
            </div>
            <Badge variant="lime">{charityPref ? `${charityPref.percentage}% Pledged` : '10% Minimum'}</Badge>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--charcoal-600)', marginBottom: 'var(--space-4)' }}>
            {charityPref?.charity?.description ||
              'Select a verified charity partner to receive a portion of your subscription fee with each draw cycle.'}
          </p>
          <div
            style={{
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Lifetime Contribution: <strong>£0.00</strong>
            </span>
            <Button variant="ghost" size="sm" style={{ color: 'var(--forest-800)' }}>
              Browse Charities
            </Button>
          </div>
        </Card>

        {/* Module B: Winnings & Verification Status (§ 09, § 10) */}
        <Card variant="warm" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Winnings & Verification (§ 09)
              </span>
              <h4 style={{ marginTop: '2px' }}>
                {winnerClaims.length > 0 ? 'Pending Prize Claim' : 'No Active Prize Claims'}
              </h4>
            </div>
            {winnerClaims.length > 0 && (
              <Badge variant={winnerClaims[0].status === 'verified' ? 'success' : 'warning'}>
                {winnerClaims[0].status.replace('_', ' ')}
              </Badge>
            )}
          </div>

          {winnerClaims.length > 0 ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--forest-800)' }}>
                  £{(winnerClaims[0].prize_amount_cents / 100).toFixed(2)}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  ({winnerClaims[0].match_tier.replace('_', ' ').toUpperCase()})
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--charcoal-700)', marginBottom: 'var(--space-4)' }}>
                Upload scorecard screenshot from your golf platform before payout release.
              </p>
              {winnerClaims[0].status === 'pending_proof' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  leftIcon={<Upload size={14} />}
                  onClick={() => {
                    setSelectedClaim(winnerClaims[0]);
                    setIsUploadProofOpen(true);
                  }}
                >
                  Upload Scorecard Proof
                </Button>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--charcoal-600)', marginTop: 'var(--space-2)' }}>
              Scores matching 3, 4, or 5 numbers in the monthly draw will generate prize claims here.
            </p>
          )}
        </Card>

        {/* Module C: Participation Summary (§ 10) */}
        <Card>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Draw Participation
          </span>
          <h4 style={{ marginTop: '2px', marginBottom: 'var(--space-4)' }}>Active Ticket Snapshot</h4>
          {scores.length > 0 ? (
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              {scores.map((s, i) => (
                <ScoreBall key={s.id} number={s.score} label={`#${i + 1}`} size="sm" />
              ))}
            </div>
          ) : (
            <div style={{ padding: 'var(--space-4) 0', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No scores recorded yet. Add 5 rounds below to activate your monthly draw ticket.
            </div>
          )}
          <div
            style={{
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 'var(--text-xs)',
              color: 'var(--charcoal-600)',
            }}
          >
            <span>Active Rounds: <strong>{scores.length}/5</strong></span>
            <span>Ticket Status: <strong>{scores.length === 5 ? 'Active' : 'Needs 5 Rounds'}</strong></span>
          </div>
        </Card>
      </div>

      {/* 2. Score Management Interface (§ 05: 5 rolling scores, reverse chronological, one per date) */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-2xl)' }}>Latest 5 Golf Scores (Stableford)</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Scores between 1–45 points. Automatic rolling FIFO retention — newest replaces oldest.
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsAddScoreOpen(true)}
          >
            Add Golf Round
          </Button>
        </div>

        <Card padding="none" style={{ overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading scores from database...
            </div>
          ) : scores.length === 0 ? (
            <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
              <p style={{ color: 'var(--charcoal-500)', marginBottom: 'var(--space-4)' }}>
                No Stableford rounds logged yet.
              </p>
              <Button variant="outline" size="sm" onClick={() => setIsAddScoreOpen(true)}>
                Record Your First Round
              </Button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-warm)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Stableford Score</th>
                    <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Date Played</th>
                    <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Course / Club</th>
                    <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Verification</th>
                    <th style={{ padding: 'var(--space-4)', textAlign: 'right', fontWeight: 600, color: 'var(--forest-900)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((s, index) => (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: index < scores.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        backgroundColor: index % 2 === 0 ? 'var(--bg-surface)' : 'rgba(251, 249, 244, 0.4)',
                      }}
                    >
                      <td style={{ padding: 'var(--space-4)' }}>
                        <div className="flex items-center gap-3">
                          <ScoreBall number={s.score} size="sm" />
                          <span style={{ fontWeight: 600, color: 'var(--forest-950)' }}>
                            {s.score} pts
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--space-4)', color: 'var(--charcoal-700)' }}>
                        {s.played_at}
                      </td>
                      <td style={{ padding: 'var(--space-4)', color: 'var(--charcoal-800)', fontWeight: 500 }}>
                        {s.course_name || 'Home Course'}
                      </td>
                      <td style={{ padding: 'var(--space-4)' }}>
                        {s.verified ? (
                          <Badge variant="success" size="sm">Verified</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Self-Reported</Badge>
                        )}
                      </td>
                      <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteScore(s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            padding: 'var(--space-1)',
                          }}
                          title="Delete round"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal 1: Add Score Dialog (§ 05) */}
      <Dialog
        isOpen={isAddScoreOpen}
        onClose={() => setIsAddScoreOpen(false)}
        title="Record New Golf Round"
        description="Enter your latest Stableford score (1–45) and the round date."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddScoreOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isSubmittingScore} onClick={handleAddScore}>
              Save to Active Scores
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddScore}>
          <Input
            label="Stableford Points (1–45)"
            type="number"
            min="1"
            max="45"
            value={newScoreVal}
            onChange={(e) => setNewScoreVal(e.target.value === '' ? '' : Number(e.target.value))}
            hint="Valid range is strictly 1 to 45 according to PRD § 05."
            required
          />

          <Input
            label="Round Date"
            type="date"
            value={newScoreDate}
            onChange={(e) => setNewScoreDate(e.target.value)}
            hint="Only one entry per date permitted (§ 05). Duplicate dates are rejected."
            required
          />

          <Input
            label="Course / Golf Club Name"
            type="text"
            value={newScoreCourse}
            onChange={(e) => setNewScoreCourse(e.target.value)}
            placeholder="e.g. St Andrews Old Course"
          />
        </form>
      </Dialog>

      {/* Modal 2: Upload Winner Proof Dialog (§ 09) */}
      <Dialog
        isOpen={isUploadProofOpen}
        onClose={() => setIsUploadProofOpen(false)}
        title="Submit Winner Verification Proof"
        description="Upload a screenshot of your score from Golf Genius, HowDidiDo, or your WHS app."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsUploadProofOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isUploadingProof}
              onClick={handleUploadProof}
            >
              Submit for Verification
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadProof} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Scorecard Screenshot File"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) setProofFile(e.target.files[0]);
            }}
            required
          />

          <Input
            label="Golfer Notes (Optional)"
            type="text"
            value={golferNotes}
            onChange={(e) => setGolferNotes(e.target.value)}
            placeholder="e.g. Round played at club championship"
          />

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--charcoal-600)' }}>
            Uploaded to private Supabase storage. Admin reviews round date and score authenticity before payout release (§ 09).
          </p>
        </form>
      </Dialog>

      {/* Modal 3: Edit Golfer Profile Dialog (§ 10) */}
      <Dialog
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Golfer Profile Details"
        description="Update your display name, current WHS handicap, and home golf club."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditProfileOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isUpdatingProfile}
              onClick={handleUpdateProfile}
              leftIcon={<UserCheck size={14} />}
            >
              Save Profile
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Full Name"
            type="text"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            placeholder="e.g. Marcus Reid"
            required
          />

          <Input
            label="Handicap Index (e.g. 14.2)"
            type="number"
            step="0.1"
            min="-10"
            max="54"
            value={editHandicap}
            onChange={(e) => setEditHandicap(e.target.value)}
            placeholder="e.g. 14.2"
            hint="Official WHS handicap index (between -10 and 54)."
          />

          <Input
            label="Home Golf Club / Course"
            type="text"
            value={editHomeClub}
            onChange={(e) => setEditHomeClub(e.target.value)}
            placeholder="e.g. St Andrews Links, Scotland"
          />
        </form>
      </Dialog>
    </PageContainer>
  );
};
