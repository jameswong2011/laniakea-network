-- Bronze-only Buy HP, restore overall HP up to 1000. Safe to re-run.
-- Requires buy_hp_with_referral from 20260818123000_invite_referral.sql.

create or replace function public.buy_hp_with_referral(p_tokens integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_tier text;
  v_hp integer;
  v_receipt jsonb;
  v_current_hp integer;
  v_tokens integer;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if p_tokens is null or p_tokens < 1 then
    raise exception 'Spend at least 1 UTL.';
  end if;

  select tier, current_hp into v_tier, v_current_hp
  from public.profiles
  where id = v_user
  for update;

  if v_tier is distinct from 'Bronze' then
    raise exception 'Buy HP is available to Bronze only.';
  end if;

  v_hp := p_tokens * 10;

  if v_current_hp + v_hp > 1000 then
    raise exception 'Bronze can only restore HP up to 1000.';
  end if;

  v_receipt := public.spend_with_referral_internal(
    v_user,
    'buy_hp',
    p_tokens,
    null,
    'hp',
    null,
    'buy_hp:' || v_user::text || ':' || gen_random_uuid()::text
  );

  update public.profiles
  set
    current_hp = current_hp + v_hp,
    updated_at = now()
  where id = v_user
  returning current_hp, utility_tokens into v_current_hp, v_tokens;

  insert into public.hp_transactions (
    user_id, amount, type, description
  ) values (
    v_user,
    v_hp,
    'buy',
    'Bought ' || v_hp || ' HP with ' || p_tokens || ' UTL'
  );

  return v_receipt || jsonb_build_object(
    'hp', v_hp,
    'currentHp', v_current_hp,
    'utilityTokens', v_tokens
  );
end;
$$;
