import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ScoreBall } from '../../components/ui/ScoreBall';
import { Dialog } from '../../components/ui/Dialog';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Trash2,
  Upload,
  CreditCard
} from 'lucide-react';
import type { GolfScore } from '../../types';

export const DashboardPage: React.FC = () => {
  const { success, error, warning } = useToast();

  // Mock User State matching PRD § 10
  const [scores, setScores] = useState<GolfScore[]>([
    { id: '1', user_id: 'u1', score: 38, played_at: '2026-10-18', course_name: 'St Andrews Links', verified: true, created_at: '' },
    { id: '2', user_id: 'u1', score: 34, played_at: '2026-10-12', course_name: 'Carnoustie Golf Club', verified: true, created_at: '' },
    { id: '3', user_id: 'u1', score: 41, played_at: '2026-10-04', course_name: 'Kingsbarns Golf Links', verified: false, created_at: '' },
    { id: '4', user_id: 'u1', score: 36, played_at: '2026-09-27', course_name: 'Gleneagles PGA Centenary', verified: true, created_at: '' },
    { id: '5', user_id: 'u1', score: 32, played_at: '2026-09-19', course_name: 'Muirfield', verified: true, created_at: '' },
  ]);

  // Score Entry Modal
  const [isAddScoreOpen, setIsAddScoreOpen] = useState(false);
  const [newScoreVal, setNewScoreVal] = useState<number | ''>(36);
  const [newScoreDate, setNewScoreDate] = useState<string>('2026-10-21');
  const [newScoreCourse, setNewScoreCourse] = useState<string>('Royal Troon');

  // Proof Upload Modal (§ 09)
  const [isUploadProofOpen, setIsUploadProofOpen] = useState(false);

  // Handle Score Addition with 5-score rolling logic & duplicate date check (§ 05)
  const handleAddScore = (e: React.FormEvent) => {
    e.preventDefault();

    if (newScoreVal === '' || newScoreVal < 1 || newScoreVal > 45) {
      error('Invalid Score', 'Stableford score must be between 1 and 45 points.');
      return;
    }

    // Check duplicate date constraint (§ 05: "Only one score entry is permitted per date")
    const dateExists = scores.some((s) => s.played_at === newScoreDate);
    if (dateExists) {
      warning('Duplicate Date Error', `A score for ${newScoreDate} already exists. Please edit or delete that entry.`);
      return;
    }

    const newEntry: GolfScore = {
      id: Math.random().toString(36).substring(2, 9),
      user_id: 'u1',
      score: Number(newScoreVal),
      played_at: newScoreDate,
      course_name: newScoreCourse,
      verified: false,
      created_at: new Date().toISOString(),
    };

    // Automatically retain only latest 5 scores sorted descending by date
    const updated = [newEntry, ...scores]
      .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
      .slice(0, 5);

    setScores(updated);
    setIsAddScoreOpen(false);
    success('Score Recorded', `Added ${newScoreVal} pts. 5-score rolling queue updated automatically.`);
  };

  const handleDeleteScore = (id: string) => {
    setScores((prev) => prev.filter((s) => s.id !== id));
    warning('Score Removed', 'Score deleted from your active 5-round ticket.');
  };

  return (
    <PageContainer>
      {/* 1. Header: Subscription Status (§ 10: "active / inactive / renewal date") */}
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
            Golfer Portal · Member #GP-8421
          </span>
          <h2 style={{ color: 'var(--forest-950)' }}>Welcome back, Marcus Reid</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Status:</span>
              <Badge variant="success">Active Member</Badge>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--charcoal-600)', display: 'block', marginTop: '2px' }}>
              Renews Nov 21, 2026 · Monthly Plan (£19/mo)
            </span>
          </div>
          <Button variant="outline" size="sm" leftIcon={<CreditCard size={14} />}>
            Manage Billing
          </Button>
        </div>
      </div>

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
              <h4 style={{ marginTop: '2px' }}>Fairway Green Youth Foundation</h4>
            </div>
            <Badge variant="lime">15% Pledged</Badge>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--charcoal-600)', marginBottom: 'var(--space-4)' }}>
            Providing mentorship, club access, and junior coaching to young golfers in Glasgow.
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
              Your Lifetime Contribution: <strong>£51.30</strong>
            </span>
            <Button variant="ghost" size="sm" style={{ color: 'var(--forest-800)' }}>
              Adjust Pledge
            </Button>
          </div>
        </Card>

        {/* Module B: Winnings & Verification Status (§ 09, § 10) */}
        <Card variant="warm" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Winnings Overview
              </span>
              <h4 style={{ marginTop: '2px' }}>September Draw: Tier 3 Winner!</h4>
            </div>
            <Badge variant="warning">Verification Pending</Badge>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontFamily: 'var(--font-numeric)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--forest-800)' }}>
              £190.00
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              (3-Number Match · Payout Pending Proof)
            </span>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--charcoal-700)', marginBottom: 'var(--space-4)' }}>
            PRD § 09 requires scorecard screenshot proof from your golf platform before payout release.
          </p>

          <Button
            variant="primary"
            size="sm"
            className="w-full"
            leftIcon={<Upload size={14} />}
            onClick={() => setIsUploadProofOpen(true)}
          >
            Upload Scorecard Proof
          </Button>
        </Card>

        {/* Module C: Participation Summary (§ 10) */}
        <Card>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Draw Participation
          </span>
          <h4 style={{ marginTop: '2px', marginBottom: 'var(--space-4)' }}>Active Ticket Snapshot</h4>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {scores.map((s, i) => (
              <ScoreBall key={s.id} number={s.score} label={`#${i + 1}`} size="sm" />
            ))}
          </div>
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
            <span>Total Draws Entered: <strong>4</strong></span>
            <span>Upcoming: <strong>Oct 31, 2026</strong></span>
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-warm)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Stableford Score</th>
                  <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Date Played</th>
                  <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Course / Club</th>
                  <th style={{ padding: 'var(--space-4)', fontWeight: 600, color: 'var(--forest-900)' }}>Status</th>
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
            <Button variant="primary" onClick={handleAddScore}>
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
            hint="Only one entry per date permitted (§ 05)."
            required
          />

          <Input
            label="Course / Golf Club Name"
            type="text"
            value={newScoreCourse}
            onChange={(e) => setNewScoreCourse(e.target.value)}
            placeholder="e.g. Royal Troon Old Course"
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
              onClick={() => {
                setIsUploadProofOpen(false);
                success('Proof Submitted', 'Your scorecard proof is under admin review. Payment released upon approval.');
              }}
            >
              Submit for Verification
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              border: '2px dashed var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-8)',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface-warm)',
              cursor: 'pointer',
            }}
          >
            <Upload size={32} color="var(--forest-700)" style={{ margin: '0 auto var(--space-2)' }} />
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
              Click or drag scorecard screenshot here
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
              PNG, JPG, or PDF up to 5MB
            </div>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--charcoal-600)' }}>
            Note: Admin verifies the date and Stableford points match your registered profile rounds.
          </p>
        </div>
      </Dialog>
    </PageContainer>
  );
};
