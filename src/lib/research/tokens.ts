import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_UTILITY_TOKENS } from "@/lib/research/economy";

export const UTILITY_TOKEN_COLUMN = "utility_tokens";

export const UTILITY_TOKEN_SQL = `-- Mock utility tokens + ledger types for Buy HP / Cash out
-- Run once in the Supabase SQL editor.

alter table public.profiles
  add column if not exists utility_tokens integer;

update public.profiles
set utility_tokens = ${DEFAULT_UTILITY_TOKENS}
where utility_tokens is null;

alter table public.profiles
  alter column utility_tokens set default ${DEFAULT_UTILITY_TOKENS};

alter table public.profiles
  alter column utility_tokens set not null;

do $$
begin
  alter table public.profiles
    add constraint profiles_utility_tokens_check
    check (utility_tokens >= 0);
exception
  when duplicate_object then null;
end
$$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.hp_transactions'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%'
  loop
    execute format(
      'alter table public.hp_transactions drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

do $$
begin
  alter table public.hp_transactions
    add constraint hp_transactions_type_check
    check (type in ('stake', 'vote', 'drain', 'buy', 'cashout'));
exception
  when duplicate_object then null;
end
$$;`;

export function isMissingUtilityTokenColumn(message: string) {
  return (
    message.includes("utility_tokens") &&
    (message.includes("does not exist") || message.includes("42703"))
  );
}

export function missingUtilityTokenMessage() {
  return `Mock token column profiles.utility_tokens is missing. Run the SQL shown on the Wallet page in the Supabase SQL editor, then refresh.`;
}

export async function probeUtilityTokenColumn(
  supabase: SupabaseClient
): Promise<{ ready: boolean; error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .select("utility_tokens")
    .limit(1);

  if (!error) {
    return { ready: true, error: null };
  }

  if (isMissingUtilityTokenColumn(error.message)) {
    return { ready: false, error: missingUtilityTokenMessage() };
  }

  return { ready: false, error: error.message };
}
