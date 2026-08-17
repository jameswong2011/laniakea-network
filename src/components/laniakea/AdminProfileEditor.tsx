"use client";

import { useActionState } from "react";
import { updateProfile, type AdminActionState } from "@/app/admin/actions";
import { TierBadge } from "@/components/laniakea/TierBadge";
import {
  ROLES,
  TIER_LABELS,
  TIERS,
  resolveTier,
  type Profile,
} from "@/types";

type EditableProfile = Pick<
  Profile,
  "id" | "username" | "display_name" | "role" | "tier" | "current_hp"
>;

const initialState: AdminActionState = {};

const fieldClassName =
  "h-7 w-full border border-border bg-panel-elevated px-1.5 font-data text-[12px] text-foreground outline-none focus-visible:border-ring";

const rowGrid =
  "grid grid-cols-[minmax(8rem,1.3fr)_9.75rem_7rem_7.5rem_6rem_4.5rem] items-center gap-2 px-2.5";

function ProfileRow({ profile }: { profile: EditableProfile }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <form
      action={action}
      className={`${rowGrid} border-b border-border py-1.5 last:border-b-0`}
    >
      <input type="hidden" name="id" value={profile.id} />
      <div className="min-w-0">
        <p className="truncate font-data text-[12px] text-foreground">
          {profile.username}
        </p>
        <p className="truncate font-data text-[10px] text-muted-foreground">
          {profile.display_name}
        </p>
        {state.error ? (
          <p className="mt-1 font-data text-[10px] text-loss">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="mt-1 font-data text-[10px] text-gain">{state.message}</p>
        ) : null}
      </div>
      <TierBadge tier={profile.tier} size="md" />
      <select
        name="role"
        required
        defaultValue={
          (ROLES as readonly string[]).includes(profile.role)
            ? profile.role
            : "member"
        }
        className={fieldClassName}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
      <select
        name="tier"
        required
        defaultValue={resolveTier(profile.tier) ?? "Bronze"}
        className={fieldClassName}
      >
        {TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {TIER_LABELS[tier]}
          </option>
        ))}
      </select>
      <input
        name="current_hp"
        type="number"
        step={1}
        defaultValue={profile.current_hp}
        className={`${fieldClassName} text-right`}
      />
      <button
        type="submit"
        disabled={pending}
        className="h-7 border border-border bg-secondary font-data text-[10px] tracking-[0.12em] text-foreground uppercase hover:bg-muted disabled:opacity-50"
      >
        {pending ? "…" : "Save"}
      </button>
    </form>
  );
}

export function AdminProfileEditor({ profiles }: { profiles: EditableProfile[] }) {
  if (profiles.length === 0) {
    return (
      <p className="px-3 py-4 font-data text-[12px] text-muted-foreground">
        No profiles found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[46rem]">
        <div className={`${rowGrid} border-b border-border bg-surface py-1.5`}>
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Username
          </span>
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Badge
          </span>
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Role
          </span>
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Tier
          </span>
          <span className="text-right font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            HP
          </span>
          <span className="font-data text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            Save
          </span>
        </div>
        {profiles.map((profile) => (
          <ProfileRow key={profile.id} profile={profile} />
        ))}
      </div>
    </div>
  );
}
