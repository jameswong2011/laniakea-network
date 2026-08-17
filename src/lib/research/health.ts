import { ascentLine } from "@/lib/research/economy";
import {
  RESEARCH_POST_STATUS_ARCHIVED,
  RESEARCH_POST_STATUS_ASCENDED,
} from "@/types";

/** Dying / at-risk bands are shares of the note's ascent line (5 × S). */
export const POST_HEALTH_DYING_RATIO = 0.05;
export const POST_HEALTH_AT_RISK_RATIO = 0.1;

export type PostHealthState = "healthy" | "at_risk" | "dying";

export function getPostHealthState(
  currentHealth: number,
  originalStake = 100
): PostHealthState {
  const line = ascentLine(originalStake);

  if (currentHealth <= line * POST_HEALTH_DYING_RATIO) {
    return "dying";
  }

  if (currentHealth <= line * POST_HEALTH_AT_RISK_RATIO) {
    return "at_risk";
  }

  return "healthy";
}

export function isAscendedStatus(status?: string | null) {
  return status === RESEARCH_POST_STATUS_ASCENDED;
}

export function isHuntedStatus(status?: string | null) {
  return status === RESEARCH_POST_STATUS_ARCHIVED;
}

export function getPostHealthLabel(state: PostHealthState) {
  if (state === "dying") {
    return "Dying";
  }

  if (state === "at_risk") {
    return "At risk";
  }

  return "Live";
}

export function getPostHealthPercent(
  currentHealth: number,
  originalStake = 100
) {
  if (currentHealth <= 0) {
    return 0;
  }

  const line = ascentLine(originalStake);
  return Math.min(100, Math.round((currentHealth / line) * 100));
}
