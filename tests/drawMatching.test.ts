import { describe, it, expect } from 'vitest';

interface DrawMatchResult {
  matchedCount: number;
  matchTier: 'tier_5' | 'tier_4' | 'tier_3' | 'none';
}

function evaluateDrawTicket(winningNumbers: number[], ticketScores: number[]): DrawMatchResult {
  const winSet = new Set(winningNumbers);
  const userSet = new Set(ticketScores);

  let matchCount = 0;
  for (const num of userSet) {
    if (winSet.has(num)) {
      matchCount++;
    }
  }

  let matchTier: 'tier_5' | 'tier_4' | 'tier_3' | 'none' = 'none';
  if (matchCount === 5) matchTier = 'tier_5';
  else if (matchCount === 4) matchTier = 'tier_4';
  else if (matchCount === 3) matchTier = 'tier_3';

  return { matchedCount: matchCount, matchTier };
}

function calculatePrizePool(totalSubscribers: number, monthlyFeePence: number, priorRolloverPence = 0) {
  const totalRevenuePence = totalSubscribers * monthlyFeePence;
  const prizePoolPence = Math.round(totalRevenuePence * 0.4); // 40% of subscription to prize pool

  const tier5Pot = Math.round(prizePoolPence * 0.4) + priorRolloverPence; // 40% of pool + rollover
  const tier4Pot = Math.round(prizePoolPence * 0.35); // 35% of pool
  const tier3Pot = Math.round(prizePoolPence * 0.25); // 25% of pool

  return {
    totalRevenuePence,
    prizePoolPence,
    tier5Pot,
    tier4Pot,
    tier3Pot,
  };
}

describe('PRD § 06 & § 07 Draw Engine & Prize Pool Allocations', () => {
  const winningNumbers = [12, 24, 32, 36, 41];

  it('accurately identifies 5-number match (Jackpot)', () => {
    const userScores = [12, 24, 32, 36, 41];
    const result = evaluateDrawTicket(winningNumbers, userScores);
    expect(result.matchedCount).toBe(5);
    expect(result.matchTier).toBe('tier_5');
  });

  it('accurately identifies 4-number match', () => {
    const userScores = [12, 24, 32, 36, 19]; // 19 does not match
    const result = evaluateDrawTicket(winningNumbers, userScores);
    expect(result.matchedCount).toBe(4);
    expect(result.matchTier).toBe('tier_4');
  });

  it('accurately identifies 3-number match', () => {
    const userScores = [12, 24, 32, 18, 22]; // 18, 22 do not match
    const result = evaluateDrawTicket(winningNumbers, userScores);
    expect(result.matchedCount).toBe(3);
    expect(result.matchTier).toBe('tier_3');
  });

  it('marks less than 3 matches as none', () => {
    const userScores = [12, 24, 15, 18, 22]; // 2 matches
    const result = evaluateDrawTicket(winningNumbers, userScores);
    expect(result.matchedCount).toBe(2);
    expect(result.matchTier).toBe('none');
  });

  it('correctly calculates 40/35/25 prize pool splits and carries forward unclaimed 5-match jackpot', () => {
    // 1,000 subscribers at £19.00 (1900 pence)
    const cycle1 = calculatePrizePool(1000, 1900, 0);
    expect(cycle1.totalRevenuePence).toBe(1900000); // £19,000
    expect(cycle1.prizePoolPence).toBe(760000); // £7,600 (40%)

    expect(cycle1.tier5Pot).toBe(304000); // £3,040 (40% of pool)
    expect(cycle1.tier4Pot).toBe(266000); // £2,660 (35% of pool)
    expect(cycle1.tier3Pot).toBe(190000); // £1,900 (25% of pool)
    expect(cycle1.tier5Pot + cycle1.tier4Pot + cycle1.tier3Pot).toBe(cycle1.prizePoolPence);

    // If 0 winners hit Tier 5, rollover carried forward into Month 2
    const unclaimedRollover = cycle1.tier5Pot; // £3,040
    const cycle2 = calculatePrizePool(1000, 1900, unclaimedRollover);

    // Month 2 Tier 5 jackpot increases by prior rollover
    expect(cycle2.tier5Pot).toBe(304000 + unclaimedRollover); // £6,080
    // Tiers 4 and 3 do not roll over
    expect(cycle2.tier4Pot).toBe(266000);
    expect(cycle2.tier3Pot).toBe(190000);
  });
});
