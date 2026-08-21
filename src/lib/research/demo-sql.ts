import { DEMO_USERS } from "@/lib/research/demo-catalog";

const profileValues = DEMO_USERS.map((user) => {
  const name = user.display_name.replace(/'/g, "''");
  return `  ('${user.username}', '${name}', '${user.role}', '${user.tier}', ${user.current_hp})`;
}).join(",\n");

export const DEMO_SEED_WRITE_SQL = `-- Let the signed-in admin write other desks, then apply the demo catalog.
-- Run once in the Supabase SQL editor, then click Seed Demo Data again.

drop policy if exists profiles_admin_all on public.profiles;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy profiles_admin_all
  on public.profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

do $$
begin
  create policy research_posts_admin_all
    on public.research_posts
    for all
    to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy hp_transactions_admin_all
    on public.hp_transactions
    for all
    to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy votes_admin_all
    on public.votes
    for all
    to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

create or replace function public.apply_demo_profile_seed(payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  n integer := 0;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'admin only';
  end if;

  for item in select value from jsonb_array_elements(payload)
  loop
    update public.profiles
    set
      display_name = item->>'display_name',
      role = item->>'role',
      tier = item->>'tier',
      current_hp = (item->>'current_hp')::integer,
      updated_at = now()
    where username = item->>'username'
      and role is distinct from 'admin';

    if found then
      n := n + 1;
    end if;
  end loop;

  return n;
end;
$$;

revoke all on function public.apply_demo_profile_seed(jsonb) from public;
grant execute on function public.apply_demo_profile_seed(jsonb) to authenticated;

update public.profiles as p
set
  display_name = v.display_name,
  role = v.role,
  tier = v.tier,
  current_hp = v.current_hp,
  updated_at = now()
from (
  values
${profileValues}
) as v(username, display_name, role, tier, current_hp)
where p.username = v.username
  and p.role is distinct from 'admin';
`;
