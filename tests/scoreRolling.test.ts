import { describe, it, expect } from 'vitest';

interface GolfScoreRecord {
  id: string;
  user_id: string;
  score: number;
  played_at: string;
  course_name?: string;
  created_at: string;
}

/**
 * In-memory reference implementation of the PostgreSQL 5-score rolling engine
 * replicating the logic enforced by record_golf_score() and trg_score_rolling.
 */
class ScoreRollingEngine {
  private scores: GolfScoreRecord[] = [];

  submitScore(userId: string, score: number, playedAt: string, courseName?: string): GolfScoreRecord[] {
    // PRD § 05: Stableford format integer range 1-45
    if (!Number.isInteger(score) || score < 1 || score > 45) {
      throw new Error(`Score ${score} out of bounds. Stableford format requires 1 to 45 points.`);
    }

    // PRD § 05: One score entry permitted per date
    const exists = this.scores.some((s) => s.user_id === userId && s.played_at === playedAt);
    if (exists) {
      throw new Error(`A score entry already exists for date ${playedAt}. Duplicate scores are not allowed.`);
    }

    const newEntry: GolfScoreRecord = {
      id: Math.random().toString(36).substring(2, 9),
      user_id: userId,
      score,
      played_at: playedAt,
      course_name: courseName,
      created_at: new Date().toISOString(),
    };

    // Add new score
    this.scores.push(newEntry);

    // Retain only latest 5 sorted reverse-chronologically (newest first)
    this.scores.sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());

    if (this.scores.length > 5) {
      this.scores = this.scores.slice(0, 5);
    }

    return [...this.scores];
  }

  deleteScore(scoreId: string): void {
    this.scores = this.scores.filter((s) => s.id !== scoreId);
  }

  updateScore(scoreId: string, newScore: number, newCourse?: string): void {
    if (!Number.isInteger(newScore) || newScore < 1 || newScore > 45) {
      throw new Error(`Score ${newScore} out of bounds. Stableford format requires 1 to 45 points.`);
    }
    const idx = this.scores.findIndex((s) => s.id === scoreId);
    if (idx !== -1) {
      this.scores[idx].score = newScore;
      if (newCourse) this.scores[idx].course_name = newCourse;
    }
  }

  getScores(): GolfScoreRecord[] {
    return [...this.scores];
  }
}

describe('PRD § 05 Stableford Score Management & 5-Score Rolling Engine', () => {
  it('accepts valid Stableford scores within range 1 to 45', () => {
    const engine = new ScoreRollingEngine();
    const scores = engine.submitScore('u1', 36, '2026-10-01', 'St Andrews Links');
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(36);
  });

  it('rejects scores below 1 or above 45', () => {
    const engine = new ScoreRollingEngine();
    expect(() => engine.submitScore('u1', 0, '2026-10-01')).toThrow(/out of bounds/);
    expect(() => engine.submitScore('u1', 46, '2026-10-01')).toThrow(/out of bounds/);
    expect(() => engine.submitScore('u1', 36.5, '2026-10-01')).toThrow(/out of bounds/);
  });

  it('rejects duplicate scores on the same date (§ 05 constraint)', () => {
    const engine = new ScoreRollingEngine();
    engine.submitScore('u1', 36, '2026-10-15', 'Old Course');

    expect(() => {
      engine.submitScore('u1', 38, '2026-10-15', 'Jubilee Course');
    }).toThrow(/already exists for date 2026-10-15/);
  });

  it('enforces 5-score rolling FIFO: 6th sequential score automatically replaces oldest', () => {
    const engine = new ScoreRollingEngine();

    // Insert 5 rounds
    engine.submitScore('u1', 32, '2026-10-01'); // Oldest
    engine.submitScore('u1', 34, '2026-10-05');
    engine.submitScore('u1', 36, '2026-10-10');
    engine.submitScore('u1', 38, '2026-10-15');
    engine.submitScore('u1', 40, '2026-10-20');

    expect(engine.getScores()).toHaveLength(5);
    expect(engine.getScores().map((s) => s.played_at)).toEqual([
      '2026-10-20',
      '2026-10-15',
      '2026-10-10',
      '2026-10-05',
      '2026-10-01',
    ]);

    // Insert 6th round (newer)
    const after6th = engine.submitScore('u1', 42, '2026-10-25');

    // Exactly 5 remain; oldest ('2026-10-01') is dropped
    expect(after6th).toHaveLength(5);
    expect(after6th[0].played_at).toBe('2026-10-25');
    expect(after6th[0].score).toBe(42);
    expect(after6th.some((s) => s.played_at === '2026-10-01')).toBe(false);
    expect(after6th.map((s) => s.score)).toEqual([42, 40, 38, 36, 34]);
  });

  it('supports editing an existing round without violating date constraints', () => {
    const engine = new ScoreRollingEngine();
    const scores = engine.submitScore('u1', 34, '2026-10-12', 'Carnoustie');
    const id = scores[0].id;

    engine.updateScore(id, 39, 'Carnoustie Championship');
    const updated = engine.getScores();
    expect(updated[0].score).toBe(39);
    expect(updated[0].course_name).toBe('Carnoustie Championship');
  });

  it('supports deleting an existing round', () => {
    const engine = new ScoreRollingEngine();
    const scores = engine.submitScore('u1', 34, '2026-10-12');
    expect(engine.getScores()).toHaveLength(1);

    engine.deleteScore(scores[0].id);
    expect(engine.getScores()).toHaveLength(0);
  });
});
