# Invite codes and UTL residual

Two signup paths. Public starts Bronze. An invite code snapshots the inviter’s overall tier at redeem time and does not follow them later.

Each new desk is minted 5 `LANI-XXXX-XXXX` codes (no `0 O 1 I L`). Members buy extras for **100 UTL**. Elite and admin mint extras at no UTL, with no cap. Share `/join?code=LANI-XXXX-XXXX`.

## Currency

This ledger is **UTL only**. HP (publish, vote, drain, Hunt/Ascent) is unchanged.

`token_ledger` records every UTL credit/debit. `profiles.utility_tokens` is the cached balance, updated in the same transaction.

## Eligible spends

| Action | Gross | Creator |
|---|---|---|
| `unlock_post` | unlock price | `floor(G × 75 / 100)` to the poster |
| `buy_invite` | 100 | 0 |
| `buy_hp` | UTL spent (Bronze only; restore overall HP up to 1000) | 0 |

Every UTL **outflow** uses this split. Cash-out **credits** UTL, so it does not. Publish / vote / comment spend HP, not UTL.

## Residual walk

1. `residual = G − creator_share`
2. `referral_pool = floor(residual / 2)`
3. `platform_burn = residual − referral_pool` (odd token to the platform)
4. Climb `invited_by`, max depth 8, no cycles:
   - `keep = floor(amount / 2)`
   - `pass_up = amount − keep` (odd token moves up)
5. Leftover after the top of the chain or depth 8 is **dust** (platform). Nobody at the top keeps the remainder.

Invariant: `G = creator_share + sum(referral_keep) + platform_burn + dust`

## Test the A→B→C→D chain

Create D invited by C, C by B, B by A. As D, buy one invite (100 UTL, no creator).

Expected:

| Bucket | UTL |
|---|---|
| Platform burn | 50 |
| C keep | 25 |
| B keep | 12 |
| A keep | 6 |
| Dust | 7 |
| Total | 100 |

Unlock 100 UTL at 1× (75% poster):

| Bucket | UTL |
|---|---|
| Poster | 75 |
| Platform burn | 13 |
| C keep | 6 |
| B keep | 3 |
| A keep | 1 |
| Dust | 2 |
| Total | 100 |

Replay the same unlock idempotency key (`unlock:<user>:<post>`) and the second call must not pay again.

## Apply

Run `supabase/migrations/20260818123000_invite_referral.sql` once in the Supabase SQL editor. Safe to re-run. If that file already ran, paste `supabase/migrations/20260818124500_buy_hp_bronze_cap.sql` so Buy HP is Bronze-only and cannot restore past 1000 HP. If Monday cron is already installed, re-apply the weekly SQL so the treasury desk is excluded from the sweep. For elite/admin free mints on a live database that already has invites, paste `supabase/migrations/20260818220000_elite_unlimited_invites.sql`.
