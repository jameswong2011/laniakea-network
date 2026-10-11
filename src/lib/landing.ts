import {
  ASCENT_MULTIPLE,
  DEFAULT_COMMENT_STAKE_HP,
  DEFAULT_STAKE_HP,
  STARTING_HP,
} from "@/lib/research/economy";
import {
  ASCENT_LONG_SHARE,
  ascentLine,
  ascentMultiplier,
  huntMultiplier,
} from "@/lib/research/settlement";
import {
  INVITE_PURCHASE_UTL,
  SIGNUP_INVITE_GRANT,
  UNLOCK_CREATOR_SHARE_PCT,
} from "@/lib/research/referral";
import { TIERS, VOTE_STRENGTH_MAX, VOTE_STRENGTH_MIN } from "@/types";

export const LANIAKEA_PRONUNCIATION = "lah-nee-ah-KAY-ah";

export const PROBLEM = {
  kicker: "The use case",
  title: "Investment research is gated. The people who can still generate alpha have no public floor.",
  lead: "Gatekeepers funnel capital into gatherers. Analysts who can already run a book walk a compliance gauntlet and raise from short-horizon, misinformed money. By the time a fund is raised, the capacity that made it worth raising is often gone. There is still no efficient way to put providers of capital in the same room as managers of capital.",
  close:
    "Rooms like SumZero and Value Investor Club never solved the two tests that matter: who decides what is good, and why a great book would post. Laniakea does not hire a curator. Writers pay Health Points to publish and to judge. Individual investors read the tape and unlock the rooms above them.",
} as const;

export const SEATS = [
  {
    id: "write",
    kicker: "Write",
    title: "Content creators",
    lede: "Analysts, PMs, and researchers who post and judge. You originate notes and stake HP on them.",
    points: [
      {
        title: "Speech costs HP",
        body: `Publish a note (default ${DEFAULT_STAKE_HP} HP) or a comment (default ${DEFAULT_COMMENT_STAKE_HP}). That stake is the opening health. Vote with conviction ${VOTE_STRENGTH_MIN}–${VOTE_STRENGTH_MAX}. You cannot vote your own work.`,
      },
      {
        title: "The room settles in public",
        body: `Health to zero is a Hunt — shorts are paid. Health to ${ASCENT_MULTIPLE}× stake is an Ascent — longs and the author harvest. Earlier conviction takes more of the pot.`,
      },
      {
        title: "Rank is a room you can lose",
        body: `${TIERS.join(" → ")}. Same room or below is a full seat. Monday calibration promotes and demotes the top and bottom quartile. You cannot buy past Bronze’s restore cap.`,
      },
      {
        title: "Unlocks pay the author",
        body: `When someone below your room unlocks a note, you take ${UNLOCK_CREATOR_SHARE_PCT}% in UTL. Invite residual walks the rest up the line that brought them in.`,
      },
    ],
  },
  {
    id: "read",
    kicker: "Read",
    title: "Individual investors",
    lede: "Self-managed investors who read the research. You do not have to originate.",
    points: [
      {
        title: "The tape is the same",
        body: "Your room and below is free to read in full. One room above is view-only. Further rooms stay locked until you unlock that note.",
      },
      {
        title: "Pay per note",
        body: "Unlock is one UTL purchase per note. Follow a desk. Save a thread. Search the library. Hunted notes leave the default tape.",
      },
      {
        title: "Judgment is optional",
        body: "Reading does not spend HP. If you want to vote or comment on a note you can see, you spend like anyone else. Most readers will not.",
      },
      {
        title: "Invite-only access",
        body: `Public signup starts Bronze with ${STARTING_HP} HP. A code snapshots the inviter’s room at redeem. Unlocking does not promote you. You stay in your room unless you also write and judge.`,
      },
    ],
  },
] as const;

export const FLOOR_RULES = [
  {
    title: "Five rooms, one tape",
    body: "Bronze through Masters is the wallet. Topic books are participation scores on the same Monday clock. Hidden notes are a locked card with an unlock quote — not a 404.",
  },
  {
    title: "HP is inventory, not a score",
    body: `You start with ${STARTING_HP} HP. You spend it to publish, comment, and vote. Idle desks lose a little every Monday. Masters can cash HP into UTL. Bronze can restore HP, never past the grant.`,
  },
  {
    title: "Notes settle in public",
    body: `A note opens at its stake. The crowd can hunt it to zero or lift it to ${ASCENT_MULTIPLE}×. Settlement is continuous from the health at the moment you voted.`,
  },
  {
    title: "The floor is invite-only",
    body: `Every desk gets ${SIGNUP_INVITE_GRANT} codes. Extra codes cost ${INVITE_PURCHASE_UTL} UTL. Elite desks mint without a cap. Residual on UTL spends walks the invite line. HP spends do not.`,
  },
] as const;

export const WORKED_STAKE = 100;
export const WORKED_CONVICTION = 5;
export const WORKED_ASCENT_LINE = ascentLine(WORKED_STAKE);
export const WORKED_LONG_SHARE = ASCENT_LONG_SHARE;

export function landingHuntMultiplier(health: number) {
  return huntMultiplier(health, WORKED_STAKE);
}

export function landingAscentMultiplier(health: number) {
  return ascentMultiplier(health, WORKED_STAKE);
}

export function landingHuntClaim(health: number) {
  return WORKED_CONVICTION * landingHuntMultiplier(health);
}

export function landingAscentClaim(health: number) {
  return WORKED_CONVICTION * landingAscentMultiplier(health);
}
