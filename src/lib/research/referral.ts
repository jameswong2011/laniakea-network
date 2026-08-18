export const INVITE_PURCHASE_UTL = 100;
export const SIGNUP_INVITE_GRANT = 5;
export const UNLOCK_CREATOR_SHARE_PCT = 75;
export const REFERRAL_POOL_NUMERATOR = 1;
export const REFERRAL_POOL_DENOMINATOR = 2;
export const UPLINE_KEEP_NUMERATOR = 1;
export const UPLINE_KEEP_DENOMINATOR = 2;
export const REFERRAL_MAX_DEPTH = 8;
export const TREASURY_PROFILE_ID = "00000000-0000-4000-8000-000000000001";
export const INVITE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const INVITE_CODE_PATTERN =
  /^LANI-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function isInviteCodeFormat(value: string) {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(value));
}

export function unlockCreatorShare(gross: number) {
  if (gross <= 0) {
    return 0;
  }

  return Math.floor((gross * UNLOCK_CREATOR_SHARE_PCT) / 100);
}

export function splitResidual(residual: number) {
  if (residual <= 0) {
    return { referralPool: 0, platformBurn: 0 };
  }

  const referralPool = Math.floor(residual / REFERRAL_POOL_DENOMINATOR);
  return { referralPool, platformBurn: residual - referralPool };
}

export function splitUplineHop(amount: number) {
  if (amount <= 0) {
    return { keep: 0, passUp: 0 };
  }

  const keep = Math.floor(amount / UPLINE_KEEP_DENOMINATOR);
  return { keep, passUp: amount - keep };
}

export function walkReferralKeeps(
  chain: string[],
  referralPool: number,
  maxDepth = REFERRAL_MAX_DEPTH
) {
  const keeps: Array<{ beneficiaryId: string; amount: number; depth: number }> =
    [];
  let amount = referralPool;
  let depth = 1;

  for (const beneficiaryId of chain) {
    if (amount <= 0 || depth > maxDepth) {
      break;
    }

    const hop = splitUplineHop(amount);
    if (hop.keep > 0) {
      keeps.push({ beneficiaryId, amount: hop.keep, depth });
    }

    amount = hop.passUp;
    depth += 1;
  }

  return { keeps, dust: amount };
}

export function quoteUnlockReferral(gross: number, inviteChain: string[]) {
  const creatorShare = unlockCreatorShare(gross);
  const residual = gross - creatorShare;
  const { referralPool, platformBurn } = splitResidual(residual);
  const { keeps, dust } = walkReferralKeeps(inviteChain, referralPool);

  return {
    creatorShare,
    residual,
    referralPool,
    platformBurn,
    keeps,
    dust,
  };
}

export function inviteSharePath(code: string) {
  return `/join?code=${encodeURIComponent(normalizeInviteCode(code))}`;
}
