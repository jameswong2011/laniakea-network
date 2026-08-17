export const POST_HEALTH_DYING = 25;
export const POST_HEALTH_AT_RISK = 50;
export const POST_HEALTH_FULL = 100;

export type PostHealthState = "healthy" | "at_risk" | "dying";

export function getPostHealthState(currentHealth: number): PostHealthState {
  if (currentHealth <= POST_HEALTH_DYING) {
    return "dying";
  }

  if (currentHealth <= POST_HEALTH_AT_RISK) {
    return "at_risk";
  }

  return "healthy";
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

export function getPostHealthPercent(currentHealth: number) {
  if (currentHealth <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((currentHealth / POST_HEALTH_FULL) * 100));
}
