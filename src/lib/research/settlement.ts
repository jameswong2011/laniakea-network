import { ascentLine } from "@/lib/research/economy";
import { voteStrength } from "@/types";

export { ascentLine };

/** Longs target this share of the downvote pot on ascent. Author gets the rest. */
export const ASCENT_LONG_SHARE = 0.75;

export const HUNT_MULTIPLIER_FLOOR = 0.4;
export const HUNT_MULTIPLIER_SCALE = 2.1;
export const HUNT_MULTIPLIER_EXPONENT = 1.35;

export const ASCENT_MULTIPLIER_FLOOR = 0.18;
export const ASCENT_MULTIPLIER_SCALE = 3.15;
export const ASCENT_MULTIPLIER_EXPONENT = 1.55;

/**
 * Hunt timing: earlier shorts (higher health / S) earn a larger multiple.
 * progress = health_at_vote / S. Floor 0.40 so late hunters still get a residual.
 */
export function huntMultiplier(healthAtVote: number, originalStake: number) {
  const stake = Math.max(originalStake, 1);
  const progress = Math.max(healthAtVote, 0) / stake;
  return Math.max(
    HUNT_MULTIPLIER_FLOOR,
    HUNT_MULTIPLIER_SCALE * Math.pow(progress, HUNT_MULTIPLIER_EXPONENT)
  );
}

/**
 * Ascent timing: earlier longs (farther from 5S) earn a larger multiple.
 * progress = health_at_vote / (5S). Floor 0.18 so late longs still get a residual.
 */
export function ascentMultiplier(healthAtVote: number, originalStake: number) {
  const line = ascentLine(originalStake);
  const progress = Math.min(1, Math.max(healthAtVote, 0) / line);
  return Math.max(
    ASCENT_MULTIPLIER_FLOOR,
    ASCENT_MULTIPLIER_SCALE *
      Math.pow(1 - progress, ASCENT_MULTIPLIER_EXPONENT)
  );
}

export type SettlementVote = {
  userId: string;
  value: number;
  healthAtVote: number;
};

export type SettlementPayout = {
  userId: string;
  amount: number;
  role: "hunt" | "ascent_up" | "ascent_author";
  multiplier: number | null;
};

/** Largest-remainder allocation so integer HP sums exactly to the pot. */
export function allocateIntegers(weights: number[], pot: number) {
  if (pot <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }

  const total = weights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    return weights.map(() => 0);
  }

  const raw = weights.map((weight) => (weight / total) * pot);
  const floors = raw.map((value) => Math.floor(value));
  let leftover = pot - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);

  for (const item of order) {
    if (leftover <= 0) {
      break;
    }

    floors[item.index] += 1;
    leftover -= 1;
  }

  return floors;
}

function allocateByWeights(
  rows: Array<{ userId: string; weight: number; multiplier: number | null }>,
  pot: number,
  role: SettlementPayout["role"]
): SettlementPayout[] {
  const shares = allocateIntegers(
    rows.map((row) => row.weight),
    pot
  );

  return rows
    .map((row, index) => ({
      userId: row.userId,
      amount: shares[index] ?? 0,
      role,
      multiplier: row.multiplier,
    }))
    .filter((row) => row.amount > 0);
}

/**
 * Hunt: pot = original stake + all upvote HP ever placed.
 * Each short's claim = downvote_amount × max(0.40, 2.10 × progress^1.35).
 * If total claims exceed the pot, scale pro-rata so they sum exactly to the pot.
 * Author and upvoters receive nothing.
 */
export function planHuntSettlement(
  originalStake: number,
  votes: SettlementVote[]
): SettlementPayout[] {
  const pot =
    Math.max(originalStake, 0) +
    votes
      .filter((vote) => vote.value > 0)
      .reduce((sum, vote) => sum + voteStrength(vote.value), 0);

  const downs = votes
    .filter((vote) => vote.value < 0)
    .map((vote) => {
      const amount = voteStrength(vote.value);
      const multiplier = huntMultiplier(vote.healthAtVote, originalStake);

      return {
        userId: vote.userId,
        weight: amount * multiplier,
        multiplier,
      };
    })
    .filter((vote) => vote.weight > 0);

  if (downs.length === 0 || pot <= 0) {
    return [];
  }

  const rawTotal = downs.reduce((sum, vote) => sum + vote.weight, 0);

  // Under the pot: pay raw claims (integer HP, never more than the raw total).
  // Over the pot: scale every claim pro-rata so the paid set equals the pot.
  const payable = rawTotal > pot ? pot : Math.floor(rawTotal);

  return allocateByWeights(downs, payable, "hunt");
}

/**
 * Ascent: pot = all downvote HP placed before the freeze.
 * Long weight = upvote_amount × max(0.18, 3.15 × (1 − progress)^1.55).
 * Default: scale longs to 75% of the pot; author keeps the remaining ~25%.
 * If unnormalized long claims exceed 100% of the pot, longs take the entire
 * pot pro-rata and the author receives 0.
 */
export function planAscentSettlement(
  authorId: string,
  originalStake: number,
  votes: SettlementVote[]
): SettlementPayout[] {
  const downPot = votes
    .filter((vote) => vote.value < 0)
    .reduce((sum, vote) => sum + voteStrength(vote.value), 0);

  if (downPot <= 0) {
    return [];
  }

  const ups = votes
    .filter((vote) => vote.value > 0)
    .map((vote) => {
      const amount = voteStrength(vote.value);
      const multiplier = ascentMultiplier(vote.healthAtVote, originalStake);

      return {
        userId: vote.userId,
        weight: amount * multiplier,
        multiplier,
      };
    })
    .filter((vote) => vote.weight > 0);

  if (ups.length === 0) {
    return [
      {
        userId: authorId,
        amount: downPot,
        role: "ascent_author",
        multiplier: null,
      },
    ];
  }

  const rawTotal = ups.reduce((sum, vote) => sum + vote.weight, 0);
  const longsTakeAll = rawTotal > downPot;
  const longPool = longsTakeAll
    ? downPot
    : Math.min(downPot, Math.round(downPot * ASCENT_LONG_SHARE));
  const authorAmount = downPot - longPool;

  return [
    ...allocateByWeights(ups, longPool, "ascent_up"),
    ...(authorAmount > 0
      ? [
          {
            userId: authorId,
            amount: authorAmount,
            role: "ascent_author" as const,
            multiplier: null,
          },
        ]
      : []),
  ];
}
