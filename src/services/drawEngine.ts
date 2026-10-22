export type DrawLogicMode = 'random' | 'algorithmic';
export type MatchTier = 'tier_5' | 'tier_4' | 'tier_3' | 'none';

export interface TicketEvaluation {
  userId: string;
  numbersSnapshot: number[];
  matchedCount: number;
  matchTier: MatchTier;
  matchedNumbers: number[];
}

export interface PrizeTierAllocation {
  potCents: number;
  winnersCount: number;
  payoutPerWinnerCents: number;
  totalPaidCents: number;
  remainderCents: number;
}

export interface DrawPrizeAllocation {
  totalPrizePoolCents: number;
  carriedOverJackpotCents: number;
  effectiveTotalPoolCents: number;
  tier5: PrizeTierAllocation;
  tier4: PrizeTierAllocation;
  tier3: PrizeTierAllocation;
  jackpotRolledOver: boolean;
  nextJackpotSeedCents: number;
  charityReserveRetainedCents: number;
}

export interface EligibleSubscriberEntry {
  userId: string;
  fullName?: string;
  scores: number[];
}

export interface DrawSimulationResult {
  drawMonth: string;
  drawTitle: string;
  drawLogic: DrawLogicMode;
  winningNumbers: [number, number, number, number, number];
  totalEligibleSubscribers: number;
  evaluations: TicketEvaluation[];
  prizeAllocation: DrawPrizeAllocation;
  winners: {
    tier5: TicketEvaluation[];
    tier4: TicketEvaluation[];
    tier3: TicketEvaluation[];
  };
}

export function generateRandomWinningNumbers(
  cryptoSource?: (array: Uint32Array) => void
): [number, number, number, number, number] {
  const selected = new Set<number>();
  const getRandomUint32 = (): number => {
    if (cryptoSource) {
      const arr = new Uint32Array(1);
      cryptoSource(arr);
      return arr[0];
    }
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      const arr = new Uint32Array(1);
      globalThis.crypto.getRandomValues(arr);
      return arr[0];
    }
    throw new Error('Cryptographically secure randomness source unavailable. Production draw generation requires Web Crypto API.');
  };

  while (selected.size < 5) {
    const rawVal = getRandomUint32();

    const num = (rawVal % 45) + 1;
    selected.add(num);
  }

  const sorted = Array.from(selected).sort((a, b) => a - b);
  return sorted as [number, number, number, number, number];
}

export function generateAlgorithmicWinningNumbers(
  subscriberScores: number[][],
  cryptoSource?: (array: Uint32Array) => void
): [number, number, number, number, number] {

  const weights: number[] = new Array(46).fill(1);

  for (const scoreList of subscriberScores) {
    for (const score of scoreList) {
      if (score >= 1 && score <= 45) {
        weights[score] += 3;
      }
    }
  }

  const getRandomFloat = (): number => {
    if (cryptoSource) {
      const arr = new Uint32Array(1);
      cryptoSource(arr);
      return arr[0] / 0x100000000;
    }
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
      const arr = new Uint32Array(1);
      globalThis.crypto.getRandomValues(arr);
      return arr[0] / 0x100000000;
    }
    throw new Error('Cryptographically secure randomness source unavailable. Production draw generation requires Web Crypto API.');
  };

  const selected = new Set<number>();
  const available = Array.from({ length: 45 }, (_, i) => i + 1);

  while (selected.size < 5 && available.length > 0) {
    const totalWeight = available.reduce((acc, num) => acc + weights[num], 0);
    let randomThreshold = getRandomFloat() * totalWeight;

    let chosen = available[0];
    for (const num of available) {
      randomThreshold -= weights[num];
      if (randomThreshold <= 0) {
        chosen = num;
        break;
      }
    }

    selected.add(chosen);
    const idx = available.indexOf(chosen);
    if (idx !== -1) {
      available.splice(idx, 1);
    }
  }

  const sorted = Array.from(selected).sort((a, b) => a - b);
  return sorted as [number, number, number, number, number];
}

export function generateWinningNumbers(
  mode: DrawLogicMode,
  subscriberScores: number[][] = [],
  cryptoSource?: (array: Uint32Array) => void
): [number, number, number, number, number] {
  if (mode === 'algorithmic' && subscriberScores.length > 0) {
    return generateAlgorithmicWinningNumbers(subscriberScores, cryptoSource);
  }
  return generateRandomWinningNumbers(cryptoSource);
}

export function evaluateTicket(
  winningNumbers: [number, number, number, number, number] | number[],
  golferScores: number[],
  userId = 'anonymous'
): TicketEvaluation {
  const winSet = new Set(winningNumbers);

  const distinctScores = Array.from(new Set(golferScores.filter((n) => n >= 1 && n <= 45))).sort(
    (a, b) => a - b
  );

  const matchedNumbers: number[] = [];
  for (const score of distinctScores) {
    if (winSet.has(score)) {
      matchedNumbers.push(score);
    }
  }

  const matchedCount = matchedNumbers.length;
  let matchTier: MatchTier = 'none';

  if (matchedCount >= 5) {
    matchTier = 'tier_5';
  } else if (matchedCount === 4) {
    matchTier = 'tier_4';
  } else if (matchedCount === 3) {
    matchTier = 'tier_3';
  }

  return {
    userId,
    numbersSnapshot: distinctScores,
    matchedCount,
    matchTier,
    matchedNumbers,
  };
}

export function calculatePrizeAllocation(
  totalPrizePoolCents: number,
  carriedOverJackpotCents = 0,
  winnerCounts: { tier5: number; tier4: number; tier3: number }
): DrawPrizeAllocation {
  const safePoolCents = Math.max(0, Math.floor(totalPrizePoolCents));
  const safeRolloverCents = Math.max(0, Math.floor(carriedOverJackpotCents));

  const tier5BasePot = Math.floor(safePoolCents * 0.4);
  const tier4Pot = Math.floor(safePoolCents * 0.35);

  const tier3Pot = safePoolCents - tier5BasePot - tier4Pot;

  const totalTier5Pot = tier5BasePot + safeRolloverCents;

  const buildTierAllocation = (pot: number, winners: number): PrizeTierAllocation => {
    if (winners <= 0) {
      return {
        potCents: pot,
        winnersCount: 0,
        payoutPerWinnerCents: 0,
        totalPaidCents: 0,
        remainderCents: pot,
      };
    }
    const payoutPerWinner = Math.floor(pot / winners);
    const totalPaid = payoutPerWinner * winners;
    const remainder = pot - totalPaid;
    return {
      potCents: pot,
      winnersCount: winners,
      payoutPerWinnerCents: payoutPerWinner,
      totalPaidCents: totalPaid,
      remainderCents: remainder,
    };
  };

  const tier5Alloc = buildTierAllocation(totalTier5Pot, winnerCounts.tier5);
  const tier4Alloc = buildTierAllocation(tier4Pot, winnerCounts.tier4);
  const tier3Alloc = buildTierAllocation(tier3Pot, winnerCounts.tier3);

  const jackpotRolledOver = winnerCounts.tier5 === 0;
  const nextJackpotSeedCents = jackpotRolledOver ? totalTier5Pot : 0;

  const charityReserveRetainedCents =
    (winnerCounts.tier4 === 0 ? tier4Pot : tier4Alloc.remainderCents) +
    (winnerCounts.tier3 === 0 ? tier3Pot : tier3Alloc.remainderCents) +
    (winnerCounts.tier5 > 0 ? tier5Alloc.remainderCents : 0);

  return {
    totalPrizePoolCents: safePoolCents,
    carriedOverJackpotCents: safeRolloverCents,
    effectiveTotalPoolCents: safePoolCents + safeRolloverCents,
    tier5: tier5Alloc,
    tier4: tier4Alloc,
    tier3: tier3Alloc,
    jackpotRolledOver,
    nextJackpotSeedCents,
    charityReserveRetainedCents,
  };
}

export function simulateDraw(params: {
  drawMonth: string;
  drawTitle?: string;
  drawLogic: DrawLogicMode;
  eligibleSubscribers: EligibleSubscriberEntry[];
  totalPrizePoolCents: number;
  carriedOverJackpotCents?: number;
  customWinningNumbers?: [number, number, number, number, number];
}): DrawSimulationResult {
  const {
    drawMonth,
    drawTitle = `Monthly Prize Draw (${drawMonth})`,
    drawLogic,
    eligibleSubscribers,
    totalPrizePoolCents,
    carriedOverJackpotCents = 0,
    customWinningNumbers,
  } = params;

  const scoreCollections = eligibleSubscribers.map((s) => s.scores);

  const winningNumbers =
    customWinningNumbers || generateWinningNumbers(drawLogic, scoreCollections);

  const evaluations: TicketEvaluation[] = [];
  const winners = {
    tier5: [] as TicketEvaluation[],
    tier4: [] as TicketEvaluation[],
    tier3: [] as TicketEvaluation[],
  };

  for (const subscriber of eligibleSubscribers) {
    const evaluation = evaluateTicket(winningNumbers, subscriber.scores, subscriber.userId);
    evaluations.push(evaluation);

    if (evaluation.matchTier === 'tier_5') {
      winners.tier5.push(evaluation);
    } else if (evaluation.matchTier === 'tier_4') {
      winners.tier4.push(evaluation);
    } else if (evaluation.matchTier === 'tier_3') {
      winners.tier3.push(evaluation);
    }
  }

  const prizeAllocation = calculatePrizeAllocation(
    totalPrizePoolCents,
    carriedOverJackpotCents,
    {
      tier5: winners.tier5.length,
      tier4: winners.tier4.length,
      tier3: winners.tier3.length,
    }
  );

  return {
    drawMonth,
    drawTitle,
    drawLogic,
    winningNumbers,
    totalEligibleSubscribers: eligibleSubscribers.length,
    evaluations,
    prizeAllocation,
    winners,
  };
}
