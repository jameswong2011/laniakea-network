-- Elite and admin mint extra invite codes with no UTL. Members still pay 100 UTL.

create or replace function public.buy_invite_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_receipt jsonb;
  v_code text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select role into v_role from public.profiles where id = v_user;

  v_code := public.generate_lani_invite_code();

  if v_role in ('elite', 'admin') then
    insert into public.invite_codes (code, owner_id, minted_how)
    values (v_code, v_user, 'signup_grant');

    return jsonb_build_object('code', v_code, 'free', true);
  end if;

  v_receipt := public.spend_with_referral_internal(
    v_user,
    'buy_invite',
    100,
    null,
    'invite_code',
    null,
    'buy_invite:' || v_user::text || ':' || gen_random_uuid()::text
  );

  insert into public.invite_codes (code, owner_id, minted_how)
  values (v_code, v_user, 'token_purchase');

  return v_receipt || jsonb_build_object('code', v_code, 'free', false);
end;
$$;
