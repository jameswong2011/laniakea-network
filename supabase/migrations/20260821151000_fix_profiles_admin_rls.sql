-- Break infinite recursion on profiles.
-- profiles_admin_all used to SELECT profiles from inside a profiles policy.
-- is_admin() is security definer, so that check does not re-enter RLS.

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

create or replace function public.admin_update_profile(
  p_id uuid,
  p_role text,
  p_tier text,
  p_current_hp integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin only';
  end if;

  if p_id = auth.uid() and p_role is distinct from 'admin' then
    raise exception 'You cannot remove your own admin role.';
  end if;

  update public.profiles
  set
    role = p_role,
    tier = p_tier,
    current_hp = p_current_hp,
    updated_at = now()
  where id = p_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  return jsonb_build_object('id', p_id);
end;
$$;

grant execute on function public.admin_update_profile(uuid, text, text, integer) to authenticated;
