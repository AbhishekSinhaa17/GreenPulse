import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../context/ToastContext';
import { adminService } from '../../../services/adminService';
import type { UserProfile, GolfScore } from '../../../types';

interface InspectScoresModalProps {
  userToInspect: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const InspectScoresModal: React.FC<InspectScoresModalProps> = ({
  userToInspect,
  isOpen,
  onClose,
}) => {
  const { success, warning, error } = useToast();
  const [scores, setScores] = useState<GolfScore[]>([]);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScorePoints, setEditScorePoints] = useState<number>(36);
  const [editScorePlayedAt, setEditScorePlayedAt] = useState<string>('');
  const [editScoreCourseName, setEditScoreCourseName] = useState<string>('');
  const [isSavingScore, setIsSavingScore] = useState(false);

  useEffect(() => {
    let isMounted = true;
    adminService
      .getUserScores(userToInspect.id)
      .then((s) => {
        if (isMounted) setScores(s);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load scores.';
        error('Error', msg);
      })
      .finally(() => {
        if (isMounted) setIsLoadingScores(false);
      });
    return () => {
      isMounted = false;
    };
  }, [userToInspect.id, error]);

  const handleStartEditScore = (score: GolfScore) => {
    setEditingScoreId(score.id);
    setEditScorePoints(score.score);
    setEditScorePlayedAt(score.played_at);
    setEditScoreCourseName(score.course_name || '');
  };

  const handleSaveScore = async (scoreId: string) => {
    if (editScorePoints < 1 || editScorePoints > 45) {
      warning('Invalid Score', 'Stableford points must be between 1 and 45.');
      return;
    }
    if (!editScorePlayedAt) {
      warning('Date Required', 'Please enter a played date.');
      return;
    }

    setIsSavingScore(true);
    try {
      await adminService.adminUpdateScore(scoreId, editScorePoints, editScorePlayedAt, editScoreCourseName);
      success('Score Updated', 'Golf round score updated successfully.');
      setEditingScoreId(null);
      const updated = await adminService.getUserScores(userToInspect.id);
      setScores(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update score.';
      error('Score Update Failed', msg);
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (!window.confirm('Are you sure you want to delete this recorded score?')) return;
    try {
      await adminService.adminDeleteScore(scoreId);
      success('Score Deleted', 'Round entry removed.');
      const updated = await adminService.getUserScores(userToInspect.id);
      setScores(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete score.';
      error('Deletion Failed', msg);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Score History: ${userToInspect.full_name || userToInspect.email}`}
      description="Auditing recorded Stableford round scores used in monthly draw entries."
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {isLoadingScores ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading golfer scores...
          </div>
        ) : scores.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
            No golf scores recorded for this player yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {scores.map((score) => {
              const isEditingThis = editingScoreId === score.id;
              return (
                <div
                  key={score.id}
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--bg-surface-warm)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {isEditingThis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '10px', fontWeight: 600 }}>Points (1-45):</label>
                          <input
                            type="number"
                            min={1}
                            max={45}
                            className="form-input"
                            value={editScorePoints}
                            onChange={(e) => setEditScorePoints(Number(e.target.value))}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '10px', fontWeight: 600 }}>Date:</label>
                          <input
                            type="date"
                            className="form-input"
                            value={editScorePlayedAt}
                            onChange={(e) => setEditScorePlayedAt(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', fontWeight: 600 }}>Course Name:</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editScoreCourseName}
                          onChange={(e) => setEditScoreCourseName(e.target.value)}
                          placeholder="e.g. Wentworth West Course"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingScoreId(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isSavingScore}
                          onClick={() => handleSaveScore(score.id)}
                        >
                          Save Score
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--forest-950)' }}>
                          {score.score} Stableford Points
                          {score.course_name && (
                            <span style={{ fontWeight: 400, color: 'var(--charcoal-600)', marginLeft: '6px' }}>
                              at {score.course_name}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          Played on {new Date(score.played_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEditScore(score)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ color: 'var(--color-error)' }}
                          onClick={() => handleDeleteScore(score.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
};
