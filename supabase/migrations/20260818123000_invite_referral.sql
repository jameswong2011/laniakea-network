-- Invite codes, UTL ledger, and cascading referral residual.
-- Safe to re-run. Does not drain HP or move ranks.

create or replace function public.laniakea_treasury_id()
returns uuid
language sql
immutable
as $$
  select '00000000-0000-4000-8000-000000000001'::uuid;
$$;

alter table public.profiles
  add column if not exists invited_by uuid references public.profiles (id);

alter table public.profiles
  add column if not exists account_code text;

alter table public.profiles
  add column if not exists registration_path text;

alter table public.profiles
  add column if not exists is_system boolean;

update public.profiles
set registration_path = 'public'
where registration_path is null;

update public.profiles
set is_system = false
where is_system is null;

alter table public.profiles
  alter column registration_path set default 'public';

alter table public.profiles
  alter column is_system set default false;

do $$
begin
  alter table public.profiles
    alter column registration_path set not null;
exception
  when others then null;
end
$$;

do $$
begin
  alter table public.profiles
    alter column is_system set not null;
exception
  when others then null;
end
$$;

do $$
begin
  alter table public.profiles
    add constraint profiles_registration_path_check
    check (registration_path in ('public', 'invite'));
exception
  when duplicate_object then null;
end
$$;

create unique index if not exists profiles_account_code_key
  on public.profiles (account_code)
  where account_code is not null;

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'available'
    check (status in ('available', 'redeemed', 'revoked')),
  redeemed_by uuid references public.profiles (id),
  redeemed_at timestamptz,
  minted_how text not null
    check (minted_how in ('signup_grant', 'token_purchase')),
  created_at timestamptz not null default now(),
  constraint invite_codes_redeemed_consistent check (
    (status = 'redeemed' and redeemed_by is not null and redeemed_at is not null)
    or (status <> 'redeemed' and redeemed_by is null and redeemed_at is null)
  )
);

create index if not exists invite_codes_owner_status_idx
  on public.invite_codes (owner_id, status);

create table if not exists public.token_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  amount bigint not null check (amount > 0),
  direction text not null check (direction in ('credit', 'debit')),
  reason text not null,
  event_id uuid,
  counterparty_id uuid references public.profiles (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists token_ledger_user_created_idx
  on public.token_ledger (user_id, created_at desc);

create index if not exists token_ledger_event_idx
  on public.token_ledger (event_id);

create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  spender_id uuid not null references public.profiles (id),
  action text not null,
  subject_type text,
  subject_id uuid,
  gross bigint not null check (gross > 0),
  creator_id uuid references public.profiles (id),
  creator_share bigint not null default 0,
  residual bigint not null,
  platform_burn bigint not null,
  referral_pool bigint not null,
  dust bigint not null default 0,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.revenue_distributions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.revenue_events (id) on delete cascade,
  beneficiary_id uuid references public.profiles (id),
  amount bigint not null check (amount > 0),
  depth integer not null default 0,
  kind text not null
    check (kind in ('creator_share', 'referral_keep', 'platform_burn', 'dust')),
  created_at timestamptz not null default now()
);

create index if not exists revenue_distributions_event_idx
  on public.revenue_distributions (event_id);

create index if not exists revenue_distributions_beneficiary_idx
  on public.revenue_distributions (beneficiary_id, created_at desc);

alter table public.invite_codes enable row level security;
alter table public.token_ledger enable row level security;
alter table public.revenue_events enable row level security;
alter table public.revenue_distributions enable row level security;

do $$
begin
  create policy invite_codes_read_own
    on public.invite_codes
    for select
    to authenticated
    using (
      owner_id = auth.uid()
      or exists (
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
  create policy token_ledger_read_own
    on public.token_ledger
    for select
    to authenticated
    using (
      user_id = auth.uid()
      or exists (
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
  create policy revenue_events_read
    on public.revenue_events
    for select
    to authenticated
    using (
      spender_id = auth.uid()
      or creator_id = auth.uid()
      or exists (
        select 1 from public.revenue_distributions d
        where d.event_id = revenue_events.id
          and d.beneficiary_id = auth.uid()
      )
      or exists (
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
  create policy revenue_distributions_read
    on public.revenue_distributions
    for select
    to authenticated
    using (
      beneficiary_id = auth.uid()
      or exists (
        select 1 from public.revenue_events e
        where e.id = revenue_distributions.event_id
          and (e.spender_id = auth.uid() or e.creator_id = auth.uid())
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
exception
  when duplicate_object then null;
end
$$;

create or replace function public.generate_lani_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  a text;
  b text;
  n integer;
  i integer;
  result text;
begin
  for i in 1..48 loop
    a := '';
    b := '';
    for n in 1..4 loop
      a := a || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
      b := b || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    result := 'LANI-' || a || '-' || b;
    if not exists (select 1 from public.invite_codes where code = result)
      and not exists (select 1 from public.profiles where account_code = result)
    then
      return result;
    end if;
  end loop;

  raise exception 'Could not mint a unique invite code.';
end;
$$;

create or replace function public.normalize_invite_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '\\s+', '', 'g'));
$$;

create or replace function public.apply_utl_move(
  p_user uuid,
  p_amount bigint,
  p_direction text,
  p_reason text,
  p_event_id uuid default null,
  p_counterparty uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'UTL move must be positive.';
  end if;

  if p_direction not in ('credit', 'debit') then
    raise exception 'UTL direction must be credit or debit.';
  end if;

  if not exists (select 1 from public.profiles where id = p_user) then
    return;
  end if;

  select utility_tokens
    into v_balance
  from public.profiles
  where id = p_user
  for update;

  if p_direction = 'debit' then
    if v_balance is null or v_balance < p_amount then
      raise exception 'Insufficient UTL. Need %, have %.', p_amount, coalesce(v_balance, 0);
    end if;

    update public.profiles
    set utility_tokens = utility_tokens - p_amount::integer,
        updated_at = now()
    where id = p_user;
  else
    update public.profiles
    set utility_tokens = utility_tokens + p_amount::integer,
        updated_at = now()
    where id = p_user;
  end if;

  insert into public.token_ledger (
    user_id, amount, direction, reason, event_id, counterparty_id, metadata
  ) values (
    p_user, p_amount, p_direction, p_reason, p_event_id, p_counterparty, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.spend_with_referral_internal(
  p_spender uuid,
  p_action text,
  p_gross bigint,
  p_creator_id uuid default null,
  p_subject_type text default null,
  p_subject_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.revenue_events%rowtype;
  v_event_id uuid;
  v_creator_share bigint := 0;
  v_residual bigint;
  v_pool bigint;
  v_burn bigint;
  v_dust bigint := 0;
  v_cursor uuid;
  v_amount bigint;
  v_keep bigint;
  v_pass bigint;
  v_depth integer;
  v_seen uuid[] := '{}';
  v_treasury uuid := public.laniakea_treasury_id();
  v_key text;
begin
  if p_spender is null then
    raise exception 'Not authenticated';
  end if;

  if p_gross is null or p_gross <= 0 then
    raise exception 'Gross must be positive.';
  end if;

  v_key := coalesce(nullif(trim(p_idempotency_key), ''), gen_random_uuid()::text);

  select *
    into v_existing
  from public.revenue_events
  where idempotency_key = v_key;

  if found then
    return jsonb_build_object(
      'eventId', v_existing.id,
      'gross', v_existing.gross,
      'creatorShare', v_existing.creator_share,
      'residual', v_existing.residual,
      'platformBurn', v_existing.platform_burn,
      'referralPool', v_existing.referral_pool,
      'dust', v_existing.dust,
      'replayed', true
    );
  end if;

  if p_action = 'unlock_post' and p_creator_id is not null then
    v_creator_share := floor((p_gross * 75) / 100);
  else
    v_creator_share := 0;
  end if;

  if v_creator_share > p_gross then
    v_creator_share := p_gross;
  end if;

  v_residual := p_gross - v_creator_share;
  v_pool := floor(v_residual / 2);
  v_burn := v_residual - v_pool;

  perform 1
  from public.profiles
  where id = p_spender
  for update;

  v_event_id := gen_random_uuid();

  insert into public.revenue_events (
    id, spender_id, action, subject_type, subject_id, gross, creator_id,
    creator_share, residual, platform_burn, referral_pool, dust, idempotency_key
  ) values (
    v_event_id, p_spender, p_action, p_subject_type, p_subject_id, p_gross, p_creator_id,
    v_creator_share, v_residual, v_burn, v_pool, 0, v_key
  );

  perform public.apply_utl_move(
    p_spender, p_gross, 'debit', p_action, v_event_id, p_creator_id,
    jsonb_build_object('action', p_action)
  );

  if v_creator_share > 0 and p_creator_id is not null then
    perform public.apply_utl_move(
      p_creator_id, v_creator_share, 'credit', 'creator_share', v_event_id, p_spender,
      jsonb_build_object('action', p_action)
    );

    insert into public.revenue_distributions (
      event_id, beneficiary_id, amount, depth, kind
    ) values (
      v_event_id, p_creator_id, v_creator_share, 0, 'creator_share'
    );
  end if;

  v_cursor := (select invited_by from public.profiles where id = p_spender);
  v_amount := v_pool;
  v_depth := 1;
  v_seen := array[p_spender];

  while v_cursor is not null
    and v_amount > 0
    and v_depth <= 8
    and not (v_cursor = any (v_seen))
  loop
    v_keep := floor(v_amount / 2);
    v_pass := v_amount - v_keep;

    if v_keep > 0 then
      perform public.apply_utl_move(
        v_cursor, v_keep, 'credit', 'referral_income', v_event_id, p_spender,
        jsonb_build_object('depth', v_depth, 'action', p_action)
      );

      insert into public.revenue_distributions (
        event_id, beneficiary_id, amount, depth, kind
      ) values (
        v_event_id, v_cursor, v_keep, v_depth, 'referral_keep'
      );
    end if;

    v_seen := v_seen || v_cursor;
    v_amount := v_pass;
    v_cursor := (select invited_by from public.profiles where id = v_cursor);
    v_depth := v_depth + 1;
  end loop;

  v_dust := v_amount;

  if v_burn > 0 then
    if exists (select 1 from public.profiles where id = v_treasury) then
      perform public.apply_utl_move(
        v_treasury, v_burn, 'credit', 'platform_burn', v_event_id, p_spender,
        jsonb_build_object('action', p_action)
      );
    end if;

    insert into public.revenue_distributions (
      event_id, beneficiary_id, amount, depth, kind
    ) values (
      v_event_id,
      case when exists (select 1 from public.profiles where id = v_treasury) then v_treasury else null end,
      v_burn,
      0,
      'platform_burn'
    );
  end if;

  if v_dust > 0 then
    if exists (select 1 from public.profiles where id = v_treasury) then
      perform public.apply_utl_move(
        v_treasury, v_dust, 'credit', 'dust', v_event_id, p_spender,
        jsonb_build_object('action', p_action)
      );
    end if;

    insert into public.revenue_distributions (
      event_id, beneficiary_id, amount, depth, kind
    ) values (
      v_event_id,
      case when exists (select 1 from public.profiles where id = v_treasury) then v_treasury else null end,
      v_dust,
      0,
      'dust'
    );
  end if;

  update public.revenue_events
  set dust = v_dust
  where id = v_event_id;

  if v_creator_share + coalesce((
    select sum(amount) from public.revenue_distributions
    where event_id = v_event_id and kind = 'referral_keep'
  ), 0) + v_burn + v_dust <> p_gross then
    raise exception 'Referral invariant failed for event %.', v_event_id;
  end if;

  return jsonb_build_object(
    'eventId', v_event_id,
    'gross', p_gross,
    'creatorShare', v_creator_share,
    'residual', v_residual,
    'platformBurn', v_burn,
    'referralPool', v_pool,
    'dust', v_dust,
    'replayed', false
  );
end;
$$;

create or replace function public.finalize_signup(p_invite_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_from_arg text;
  v_code text;
  v_required boolean := false;
  v_invite public.invite_codes%rowtype;
  v_owner public.profiles%rowtype;
  v_path text := 'public';
  v_minted integer := 0;
  v_opening integer := 0;
  v_account text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select account_code into v_account
  from public.profiles
  where id = v_user
  for update;

  if not found then
    raise exception 'Profile was not found.';
  end if;

  if v_account is not null
    and exists (select 1 from public.invite_codes where owner_id = v_user)
  then
    return jsonb_build_object('ok', true, 'alreadyProvisioned', true);
  end if;

  v_from_arg := public.normalize_invite_code(p_invite_code);
  v_required := v_from_arg is not null and v_from_arg <> '';
  v_code := v_from_arg;

  if v_code is null or v_code = '' then
    select public.normalize_invite_code(u.raw_user_meta_data->>'invite_code')
      into v_code
    from auth.users u
    where u.id = v_user;
  end if;

  if v_code is not null and v_code <> '' then
    select *
      into v_invite
    from public.invite_codes
    where code = v_code
    for update;

    if not found or v_invite.status <> 'available' then
      if v_required then
        raise exception 'Invite code is invalid or already used.';
      else
        v_code := null;
      end if;
    elsif v_invite.owner_id = v_user then
      if v_required then
        raise exception 'You cannot redeem your own invite.';
      else
        v_code := null;
      end if;
    end if;
  end if;

  if v_code is not null and v_code <> '' then
    select * into v_owner from public.profiles where id = v_invite.owner_id;

    update public.profiles
    set
      invited_by = v_invite.owner_id,
      tier = coalesce(v_owner.tier, 'Bronze'),
      registration_path = 'invite',
      updated_at = now()
    where id = v_user
      and invited_by is null;

    update public.invite_codes
    set
      status = 'redeemed',
      redeemed_by = v_user,
      redeemed_at = now()
    where id = v_invite.id
      and status = 'available';

    if not found then
      raise exception 'Invite code is invalid or already used.';
    end if;

    v_path := 'invite';
  else
    update public.profiles
    set
      registration_path = coalesce(registration_path, 'public'),
      updated_at = now()
    where id = v_user;
  end if;

  update public.profiles
  set account_code = public.generate_lani_invite_code()
  where id = v_user
    and account_code is null;

  select count(*) into v_minted
  from public.invite_codes
  where owner_id = v_user;

  while v_minted < 5 loop
    insert into public.invite_codes (code, owner_id, minted_how)
    values (public.generate_lani_invite_code(), v_user, 'signup_grant');
    v_minted := v_minted + 1;
  end loop;

  if not exists (select 1 from public.token_ledger where user_id = v_user) then
    select utility_tokens into v_opening
    from public.profiles
    where id = v_user;

    if v_opening > 0 then
      insert into public.token_ledger (
        user_id, amount, direction, reason, metadata
      ) values (
        v_user, v_opening, 'credit', 'opening_balance',
        jsonb_build_object('source', 'finalize_signup')
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'registrationPath', v_path,
    'inviteCodes', v_minted
  );
end;
$$;

create or replace function public.preview_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_code text := public.normalize_invite_code(p_code);
  v_invite public.invite_codes%rowtype;
  v_owner public.profiles%rowtype;
begin
  if v_code is null or v_code = '' then
    return jsonb_build_object('ok', false);
  end if;

  select * into v_invite
  from public.invite_codes
  where code = v_code;

  if not found or v_invite.status <> 'available' then
    return jsonb_build_object('ok', false);
  end if;

  select * into v_owner from public.profiles where id = v_invite.owner_id;

  return jsonb_build_object(
    'ok', true,
    'tier', coalesce(v_owner.tier, 'Bronze'),
    'displayName', v_owner.display_name
  );
end;
$$;

create or replace function public.buy_invite_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_receipt jsonb;
  v_code text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
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

  v_code := public.generate_lani_invite_code();

  insert into public.invite_codes (code, owner_id, minted_how)
  values (v_code, v_user, 'token_purchase');

  return v_receipt || jsonb_build_object('code', v_code);
end;
$$;

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

create or replace function public.purchase_post_unlock(p_post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid := auth.uid();
  v_author uuid;
  v_multiple integer;
  v_buyer_tier text;
  v_buyer_role text;
  v_author_tier text;
  v_steps integer;
  v_base integer;
  v_tokens integer;
  v_receipt jsonb;
begin
  if v_buyer is null then
    raise exception 'Not authenticated';
  end if;

  select rp.author_id, coalesce(rp.unlock_rate_multiple, 1)
    into v_author, v_multiple
  from public.research_posts rp
  where rp.id = p_post_id;

  if v_author is null then
    raise exception 'Post was not found.';
  end if;

  if v_author = v_buyer then
    raise exception 'You already have this note.';
  end if;

  if exists (
    select 1
    from public.post_unlocks u
    where u.user_id = v_buyer and u.post_id = p_post_id
  ) then
    raise exception 'This note is already open to you.';
  end if;

  perform 1
  from public.profiles
  where id in (v_buyer, v_author)
  order by id
  for update;

  select pr.tier, pr.role
    into v_buyer_tier, v_buyer_role
  from public.profiles pr
  where pr.id = v_buyer;

  select pr.tier
    into v_author_tier
  from public.profiles pr
  where pr.id = v_author;

  if v_buyer_role = 'admin' then
    raise exception 'This note is already open to you.';
  end if;

  v_steps := public.tier_rank(v_author_tier) - public.tier_rank(v_buyer_tier);

  if v_steps <= 0 then
    raise exception 'This desk does not require an unlock.';
  end if;

  v_base := case v_steps
    when 1 then 1
    when 2 then 5
    when 3 then 25
    when 4 then 200
    else null
  end;

  if v_base is null then
    raise exception 'This desk does not require an unlock.';
  end if;

  if v_multiple < 1 then
    v_multiple := 1;
  elsif v_multiple > 5 then
    v_multiple := 5;
  end if;

  v_tokens := v_base * v_multiple;

  v_receipt := public.spend_with_referral_internal(
    v_buyer,
    'unlock_post',
    v_tokens,
    v_author,
    'research_post',
    p_post_id,
    'unlock:' || v_buyer::text || ':' || p_post_id::text
  );

  insert into public.post_unlocks (
    user_id, post_id, tokens_paid, author_share, burned
  ) values (
    v_buyer,
    p_post_id,
    v_tokens,
    coalesce((v_receipt->>'creatorShare')::bigint, 0)::integer,
    (coalesce((v_receipt->>'platformBurn')::bigint, 0)
      + coalesce((v_receipt->>'dust')::bigint, 0))::integer
  );

  return v_receipt || jsonb_build_object(
    'tokens', v_tokens,
    'authorShare', coalesce((v_receipt->>'creatorShare')::bigint, 0),
    'burned', coalesce((v_receipt->>'platformBurn')::bigint, 0)
      + coalesce((v_receipt->>'dust')::bigint, 0),
    'multiple', v_multiple,
    'baseTokens', v_base
  );
end;
$$;

do $$
declare
  tid uuid := public.laniakea_treasury_id();
begin
  begin
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      coalesce(
        (select instance_id from auth.users limit 1),
        '00000000-0000-0000-0000-000000000000'
      ),
      tid,
      'authenticated',
      'authenticated',
      'treasury@laniakea.internal',
      encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"laniakea_treasury"}'::jsonb,
      now(),
      now()
    );
  exception
    when others then null;
  end;

  begin
    insert into public.profiles (
      id, username, display_name, role, tier, current_hp, utility_tokens,
      is_system, registration_path, account_code
    ) values (
      tid,
      'laniakea_treasury',
      'Platform treasury',
      'admin',
      'Bronze',
      0,
      0,
      true,
      'public',
      'LANI-SYSTEM'
    );
  exception
    when unique_violation then
      update public.profiles
      set
        is_system = true,
        account_code = coalesce(account_code, 'LANI-SYSTEM')
      where id = tid or username = 'laniakea_treasury';
    when others then
      raise notice 'Treasury profile not created: %', sqlerrm;
  end;
end
$$;

do $$
declare
  r record;
  minted integer;
  opening integer;
begin
  for r in
    select id, utility_tokens
    from public.profiles
    where coalesce(is_system, false) = false
  loop
    update public.profiles
    set
      registration_path = coalesce(registration_path, 'public'),
      account_code = coalesce(account_code, public.generate_lani_invite_code())
    where id = r.id;

    select count(*) into minted
    from public.invite_codes
    where owner_id = r.id;

    while minted < 5 loop
      insert into public.invite_codes (code, owner_id, minted_how)
      values (public.generate_lani_invite_code(), r.id, 'signup_grant');
      minted := minted + 1;
    end loop;

    if not exists (select 1 from public.token_ledger where user_id = r.id)
      and coalesce(r.utility_tokens, 0) > 0
    then
      opening := r.utility_tokens;
      insert into public.token_ledger (
        user_id, amount, direction, reason, metadata
      ) values (
        r.id, opening, 'credit', 'opening_balance',
        jsonb_build_object('source', 'backfill')
      );
    end if;
  end loop;
end
$$;

revoke all on function public.apply_utl_move(uuid, bigint, text, text, uuid, uuid, jsonb) from public;
revoke all on function public.spend_with_referral_internal(uuid, text, bigint, uuid, text, uuid, text) from public;
revoke all on function public.generate_lani_invite_code() from public;
revoke all on function public.finalize_signup(text) from public;
revoke all on function public.preview_invite_code(text) from public;
revoke all on function public.buy_invite_code() from public;
revoke all on function public.buy_hp_with_referral(integer) from public;
revoke all on function public.purchase_post_unlock(uuid) from public;

grant execute on function public.finalize_signup(text) to authenticated;
grant execute on function public.preview_invite_code(text) to authenticated;
grant execute on function public.preview_invite_code(text) to anon;
grant execute on function public.buy_invite_code() to authenticated;
grant execute on function public.buy_hp_with_referral(integer) to authenticated;
grant execute on function public.purchase_post_unlock(uuid) to authenticated;
