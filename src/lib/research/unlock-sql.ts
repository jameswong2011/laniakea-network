export const POST_UNLOCK_SQL = `-- Paid desk unlocks. Safe to re-run.
-- Buyers from a lower overall desk pay UTL to read and engage one note.
-- 75% of the tokens go to the author; 25% are burned.

alter table public.research_posts
  add column if not exists unlock_rate_multiple integer;

update public.research_posts
set unlock_rate_multiple = 1
where unlock_rate_multiple is null;

alter table public.research_posts
  alter column unlock_rate_multiple set default 1;

alter table public.research_posts
  alter column unlock_rate_multiple set not null;

do $$
begin
  alter table public.research_posts
    add constraint research_posts_unlock_rate_multiple_check
    check (unlock_rate_multiple >= 1 and unlock_rate_multiple <= 5);
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.post_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.research_posts (id) on delete cascade,
  tokens_paid integer not null,
  author_share integer not null,
  burned integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id),
  constraint post_unlocks_tokens_check
    check (tokens_paid > 0),
  constraint post_unlocks_split_check
    check (
      author_share >= 0
      and burned >= 0
      and author_share + burned = tokens_paid
    )
);

create index if not exists post_unlocks_post_id_idx
  on public.post_unlocks (post_id);

alter table public.post_unlocks enable row level security;

do $$
begin
  create policy post_unlocks_read_own
    on public.post_unlocks
    for select
    to authenticated
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy post_unlocks_insert_own
    on public.post_unlocks
    for insert
    to authenticated
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create policy post_unlocks_admin_all
    on public.post_unlocks
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

create or replace function public.tier_rank(p_tier text)
returns integer
language sql
immutable
as $$
  select case lower(trim(coalesce(p_tier, 'bronze')))
    when 'bronze' then 1
    when 'silver' then 2
    when 'gold' then 3
    when 'platinum' then 4
    when 'masters' then 5
    else 1
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
  v_buyer_tokens integer;
  v_author_tier text;
  v_steps integer;
  v_base integer;
  v_tokens integer;
  v_author_share integer;
  v_burned integer;
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

  select pr.tier, pr.role, pr.utility_tokens
    into v_buyer_tier, v_buyer_role, v_buyer_tokens
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
    raise exception 'This note is already open to you.';
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
  v_author_share := round((v_tokens * 75)::numeric / 100);
  if v_author_share < 0 then
    v_author_share := 0;
  end if;
  if v_author_share > v_tokens then
    v_author_share := v_tokens;
  end if;
  v_burned := v_tokens - v_author_share;

  if v_buyer_tokens is null or v_buyer_tokens < v_tokens then
    raise exception 'Insufficient UTL. Need %, have %.', v_tokens, coalesce(v_buyer_tokens, 0);
  end if;

  update public.profiles
  set utility_tokens = utility_tokens - v_tokens,
      updated_at = now()
  where id = v_buyer;

  if v_author_share > 0 then
    update public.profiles
    set utility_tokens = utility_tokens + v_author_share,
        updated_at = now()
    where id = v_author;
  end if;

  insert into public.post_unlocks (
    user_id, post_id, tokens_paid, author_share, burned
  ) values (
    v_buyer, p_post_id, v_tokens, v_author_share, v_burned
  );

  return jsonb_build_object(
    'tokens', v_tokens,
    'authorShare', v_author_share,
    'burned', v_burned,
    'multiple', v_multiple,
    'baseTokens', v_base
  );
end;
$$;

revoke all on function public.purchase_post_unlock(uuid) from public;
grant execute on function public.purchase_post_unlock(uuid) to authenticated;
`;
