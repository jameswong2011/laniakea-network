-- Admin write access for demo seeding, plus a definer function that
-- applies catalog tiers/HP by username. Also stamps the current catalog.

do $$
begin
  create policy profiles_admin_all
    on public.profiles
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
