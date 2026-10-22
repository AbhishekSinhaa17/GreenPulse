import { describe, it, expect } from 'vitest';
import {
  generateRandomWinningNumbers,
  generateAlgorithmicWinningNumbers,
  generateWinningNumbers,
  evaluateTicket,
  calculatePrizeAllocation,
  simulateDraw,
  type EligibleSubscriberEntry,
} from '../src/services/drawEngine';

describe('PRD § 06 Cryptographically Secure Winning Number Generation', () => {
  it('generates exactly 5 unique integers between 1 and 45 inclusive', () => {
    for (let run = 0; run < 50; run++) {
      const numbers = generateRandomWinningNumbers();
      expect(numbers).toHaveLength(5);

      // Verify all numbers in bounds [1, 45]
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(45);
        expect(Number.isInteger(n)).toBe(true);
      }

      // Verify uniqueness
      const unique = new Set(numbers);
      expect(unique.size).toBe(5);

      // Verify sorted ascending
      const sorted = [...numbers].sort((a, b) => a - b);
      expect(numbers).toEqual(sorted);
    }
  });

  it('respects deterministic cryptographic injection for reliable test runs', () => {
    // Inject mock sequence
    let counter = 0;
    const mockCryptoSource = (arr: Uint32Array) => {
      // Return deterministically varying numbers
      arr[0] = counter++;
    };

    const numbers = generateRandomWinningNumbers(mockCryptoSource);
    expect(numbers).toHaveLength(5);
    expect(new Set(numbers).size).toBe(5);
  });

  it('generates algorithmic winning numbers respecting score frequency weights', () => {
    // Heavily bias subscribers with score 36
    const subscriberScores: number[][] = [
      [36, 36, 36, 36, 36],
      [36, 36, 36, 36, 36],
      [36, 36, 36, 36, 36],
      [10, 20, 30, 40, 45],
    ];

    const numbers = generateAlgorithmicWinningNumbers(subscriberScores);
    expect(numbers).toHaveLength(5);
    expect(new Set(numbers).size).toBe(5);
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(45);
    }
  });

  it('dispatches between random and algorithmic modes properly', () => {
    const randomNums = generateWinningNumbers('random');
    expect(randomNums).toHaveLength(5);

    const scores = [[32, 34, 36, 38, 40]];
    const algoNums = generateWinningNumbers('algorithmic', scores);
    expect(algoNums).toHaveLength(5);
  });
});

describe('PRD § 06 Golfer Ticket Evaluation & Unordered Set Matching', () => {
  const winningNumbers: [number, number, number, number, number] = [7, 14, 21, 28, 35];

  it('identifies 5-number match (Jackpot tier_5)', () => {
    const golferScores = [7, 14, 21, 28, 35];
    const evaluation = evaluateTicket(winningNumbers, golferScores, 'user-1');
    expect(evaluation.matchedCount).toBe(5);
    expect(evaluation.matchTier).toBe('tier_5');
    expect(evaluation.matchedNumbers).toEqual([7, 14, 21, 28, 35]);
  });

  it('identifies 4-number match (tier_4)', () => {
    const golferScores = [7, 14, 21, 28, 42]; // 42 is not drawn
    const evaluation = evaluateTicket(winningNumbers, golferScores, 'user-2');
    expect(evaluation.matchedCount).toBe(4);
    expect(evaluation.matchTier).toBe('tier_4');
    expect(evaluation.matchedNumbers).toEqual([7, 14, 21, 28]);
  });

  it('identifies 3-number match (tier_3)', () => {
    const golferScores = [7, 14, 21, 30, 42]; // 30, 42 are not drawn
    const evaluation = evaluateTicket(winningNumbers, golferScores, 'user-3');
    expect(evaluation.matchedCount).toBe(3);
    expect(evaluation.matchTier).toBe('tier_3');
    expect(evaluation.matchedNumbers).toEqual([7, 14, 21]);
  });

  it('marks 2 or fewer matches as none', () => {
    const golferScores = [7, 14, 18, 30, 42]; // only 7, 14 match
    const evaluation = evaluateTicket(winningNumbers, golferScores, 'user-4');
    expect(evaluation.matchedCount).toBe(2);
    expect(evaluation.matchTier).toBe('none');
  });

  it('correctly de-duplicates identical scores in user round history (golf reality)', () => {
    // Golfer shot 21 twice and 28 twice
    const golferScores = [7, 21, 21, 28, 28];
    const evaluation = evaluateTicket(winningNumbers, golferScores, 'user-5');
    // Unique distinct numbers are [7, 21, 28] -> 3 matches
    expect(evaluation.numbersSnapshot).toEqual([7, 21, 28]);
    expect(evaluation.matchedCount).toBe(3);
    expect(evaluation.matchTier).toBe('tier_3');
  });

  it('filters out any scores outside bounds 1-45', () => {
    const golferScores = [7, 14, 21, 0, 50, 99];
    const evaluation = evaluateTicket(winningNumbers, golferScores, 'user-6');
    expect(evaluation.numbersSnapshot).toEqual([7, 14, 21]);
    expect(evaluation.matchedCount).toBe(3);
    expect(evaluation.matchTier).toBe('tier_3');
  });
});

describe('PRD § 07 Prize Pool Allocations & Rollover Mechanics', () => {
  it('correctly calculates 40% (Tier 1) / 35% (Tier 2) / 25% (Tier 3) without remainder loss', () => {
    // Pool of £10,000 (1,000,000 cents)
    const poolCents = 1000000;
    const allocation = calculatePrizeAllocation(poolCents, 0, {
      tier5: 1,
      tier4: 2,
      tier3: 10,
    });

    expect(allocation.tier5.potCents).toBe(400000); // 40% = £4,000
    expect(allocation.tier4.potCents).toBe(350000); // 35% = £3,500
    expect(allocation.tier3.potCents).toBe(250000); // 25% = £2,500

    expect(allocation.tier5.potCents + allocation.tier4.potCents + allocation.tier3.potCents).toBe(poolCents);

    // Payout splits
    expect(allocation.tier5.payoutPerWinnerCents).toBe(400000);
    expect(allocation.tier4.payoutPerWinnerCents).toBe(175000); // £1,750 each
    expect(allocation.tier3.payoutPerWinnerCents).toBe(25000); // £250 each

    expect(allocation.jackpotRolledOver).toBe(false);
    expect(allocation.nextJackpotSeedCents).toBe(0);
  });

  it('rolls over Tier 1 jackpot when 0 winners achieve 5 matches', () => {
    const poolCents = 1000000; // £10,000
    const priorRolloverCents = 250000; // £2,500 previous rollover

    const allocation = calculatePrizeAllocation(poolCents, priorRolloverCents, {
      tier5: 0, // Unclaimed jackpot!
      tier4: 4,
      tier3: 20,
    });

    // Total Tier 5 pot includes 40% of current pool (£4,000) + prior rollover (£2,500) = £6,500
    expect(allocation.tier5.potCents).toBe(650000);
    expect(allocation.tier5.winnersCount).toBe(0);
    expect(allocation.tier5.payoutPerWinnerCents).toBe(0);

    // Jackpot rollover triggered
    expect(allocation.jackpotRolledOver).toBe(true);
    expect(allocation.nextJackpotSeedCents).toBe(650000); // Carries forward to next draw!
  });

  it('does NOT roll over unclaimed Tier 4 and Tier 3 funds (retained in charity reserve)', () => {
    const poolCents = 1000000;

    const allocation = calculatePrizeAllocation(poolCents, 0, {
      tier5: 1,
      tier4: 0, // No winners in Tier 4
      tier3: 0, // No winners in Tier 3
    });

    expect(allocation.tier4.winnersCount).toBe(0);
    expect(allocation.tier3.winnersCount).toBe(0);

    // Only Tier 5 rolls over per PRD § 07; Tier 4 and 3 are retained in platform charity reserve
    expect(allocation.jackpotRolledOver).toBe(false);
    expect(allocation.nextJackpotSeedCents).toBe(0);
    expect(allocation.charityReserveRetainedCents).toBe(allocation.tier4.potCents + allocation.tier3.potCents);
  });

  it('handles division remainders (cents) safely without floating point drift', () => {
    // 3 winners sharing a pot of £100.00 (10000 cents)
    const poolCents = 25000; // 40% = 10000
    const allocation = calculatePrizeAllocation(poolCents, 0, {
      tier5: 3,
      tier4: 0,
      tier3: 0,
    });

    // 10000 / 3 = 3333 cents each, remainder 1 cent
    expect(allocation.tier5.payoutPerWinnerCents).toBe(3333);
    expect(allocation.tier5.totalPaidCents).toBe(9999);
    expect(allocation.tier5.remainderCents).toBe(1);
  });
});

describe('PRD § 06 & § 11 Draw Simulation Suite', () => {
  it('runs a complete non-destructive simulation against multiple participants', () => {
    const eligibleSubscribers: EligibleSubscriberEntry[] = [
      { userId: 'u1', fullName: 'Alice', scores: [10, 20, 30, 40, 45] },
      { userId: 'u2', fullName: 'Bob', scores: [10, 20, 30, 40, 15] },
      { userId: 'u3', fullName: 'Charlie', scores: [10, 20, 30, 12, 16] },
      { userId: 'u4', fullName: 'David', scores: [1, 2, 3, 4, 5] },
    ];

    // Force winning numbers [10, 20, 30, 40, 45]
    const customWinningNumbers: [number, number, number, number, number] = [10, 20, 30, 40, 45];

    const result = simulateDraw({
      drawMonth: '2026-10-01',
      drawLogic: 'random',
      eligibleSubscribers,
      totalPrizePoolCents: 1000000,
      carriedOverJackpotCents: 50000,
      customWinningNumbers,
    });

    expect(result.drawMonth).toBe('2026-10-01');
    expect(result.winningNumbers).toEqual(customWinningNumbers);
    expect(result.totalEligibleSubscribers).toBe(4);

    // Alice has 5 matches (Tier 5)
    expect(result.winners.tier5).toHaveLength(1);
    expect(result.winners.tier5[0].userId).toBe('u1');

    // Bob has 4 matches (Tier 4)
    expect(result.winners.tier4).toHaveLength(1);
    expect(result.winners.tier4[0].userId).toBe('u2');

    // Charlie has 3 matches (Tier 3)
    expect(result.winners.tier3).toHaveLength(1);
    expect(result.winners.tier3[0].userId).toBe('u3');

    // David has 0 matches
    const davidEval = result.evaluations.find((e) => e.userId === 'u4');
    expect(davidEval?.matchedCount).toBe(0);
    expect(davidEval?.matchTier).toBe('none');

    // Prize allocations check
    expect(result.prizeAllocation.jackpotRolledOver).toBe(false);
    expect(result.prizeAllocation.tier5.payoutPerWinnerCents).toBe(450000); // 400,000 + 50,000 rollover
    expect(result.prizeAllocation.tier4.payoutPerWinnerCents).toBe(350000);
    expect(result.prizeAllocation.tier3.payoutPerWinnerCents).toBe(250000);
  });

  it('handles empty participant pool gracefully with zero divide errors', () => {
    const result = simulateDraw({
      drawMonth: '2026-11-01',
      drawLogic: 'random',
      eligibleSubscribers: [],
      totalPrizePoolCents: 500000,
      carriedOverJackpotCents: 0,
    });

    expect(result.totalEligibleSubscribers).toBe(0);
    expect(result.evaluations).toHaveLength(0);
    expect(result.winners.tier5).toHaveLength(0);
    expect(result.winners.tier4).toHaveLength(0);
    expect(result.winners.tier3).toHaveLength(0);

    // Entire Tier 1 rolls over
    expect(result.prizeAllocation.jackpotRolledOver).toBe(true);
    expect(result.prizeAllocation.nextJackpotSeedCents).toBe(200000); // 40% of 500,000
    expect(result.prizeAllocation.tier5.payoutPerWinnerCents).toBe(0);
  });
});
