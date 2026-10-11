import {
  canBuyHp,
  canCashOutHp,
  canOpenDesk,
  canWriteDesk,
  deskAccessLabel,
  getDeskAccess,
  nextTier,
  type DeskAccess,
} from "@laniakea/domain";

export type { DeskAccess };
export {
  canBuyHp,
  canCashOutHp,
  canOpenDesk,
  canWriteDesk,
  deskAccessLabel,
  getDeskAccess,
  nextTier,
};

/** Left rail: locked / view-only / full engage. */
export function deskAccessRailClass(access: DeskAccess) {
  if (access === "hidden") {
    return "border-l-loss/70";
  }

  if (access === "view_only") {
    return "border-l-warning";
  }

  return "border-l-gain";
}
