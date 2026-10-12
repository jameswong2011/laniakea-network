-- Indexes for the busiest reads on the website and the phone app. Safe to re-run.
-- Each b-tree index is skipped when an existing full index already starts with the same columns.

do $$
declare
  wanted record;
  covered boolean;
begin
  for wanted in
    select *
    from (
      values
        ('research_posts_author_created_idx', 'research_posts', 'author_id, created_at desc', array['author_id', 'created_at']),
        ('research_posts_status_created_idx', 'research_posts', 'status, created_at desc', array['status', 'created_at']),
        ('research_comments_author_created_idx', 'research_comments', 'author_id, created_at desc', array['author_id', 'created_at']),
        ('notifications_user_created_idx', 'notifications', 'user_id, created_at desc', array['user_id', 'created_at']),
        ('post_subscriptions_post_idx', 'post_subscriptions', 'post_id', array['post_id']),
        ('votes_post_idx', 'votes', 'post_id', array['post_id']),
        ('votes_user_post_idx', 'votes', 'user_id, post_id', array['user_id', 'post_id']),
        ('profiles_invited_by_idx', 'profiles', 'invited_by', array['invited_by']),
        ('profiles_current_hp_idx', 'profiles', 'current_hp desc', array['current_hp']),
        ('profiles_username_idx', 'profiles', 'username', array['username']),
        ('hp_transactions_type_created_idx', 'hp_transactions', 'type, created_at desc', array['type', 'created_at']),
        ('revenue_events_created_idx', 'revenue_events', 'created_at desc', array['created_at']),
        ('ai_usage_user_feature_created_idx', 'ai_usage', 'user_id, feature, created_at desc', array['user_id', 'feature', 'created_at'])
    ) as list (index_name, table_name, columns, lead)
  loop
    if to_regclass(format('public.%I', wanted.table_name)) is null then
      raise notice 'Skipped %: table % is missing.', wanted.index_name, wanted.table_name;
      continue;
    end if;

    if (
      select count(*)
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = wanted.table_name
        and c.column_name = any (wanted.lead)
    ) < cardinality(wanted.lead) then
      raise notice 'Skipped %: a column is missing.', wanted.index_name;
      continue;
    end if;

    select exists (
      select 1
      from pg_index i
      where i.indrelid = format('public.%I', wanted.table_name)::regclass
        and i.indpred is null
        and (
          select array_agg(a.attname::text order by k.ord)
          from unnest(i.indkey::int2[]) with ordinality as k (attnum, ord)
          join pg_attribute a
            on a.attrelid = i.indrelid
           and a.attnum = k.attnum
          where k.ord <= cardinality(wanted.lead)
        ) = wanted.lead
    )
    into covered;

    if covered then
      raise notice 'Skipped %: an existing index already covers it.', wanted.index_name;
      continue;
    end if;

    execute format(
      'create index if not exists %I on public.%I (%s)',
      wanted.index_name,
      wanted.table_name,
      wanted.columns
    );
  end loop;
end
$$;

-- Trigram indexes keep the ilike text search fast as notes, comments and users grow.

do $$
declare
  trgm_schema text;
  wanted record;
begin
  select n.nspname
  into trgm_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  if trgm_schema is null then
    trgm_schema := case when to_regnamespace('extensions') is null then 'public' else 'extensions' end;
    execute format('create extension if not exists pg_trgm with schema %I', trgm_schema);
  end if;

  for wanted in
    select *
    from (
      values
        ('research_posts_title_trgm_idx', 'research_posts', 'title'),
        ('research_posts_body_trgm_idx', 'research_posts', 'body'),
        ('research_comments_body_trgm_idx', 'research_comments', 'body'),
        ('profiles_display_name_trgm_idx', 'profiles', 'display_name'),
        ('profiles_username_trgm_idx', 'profiles', 'username')
    ) as list (index_name, table_name, column_name)
  loop
    if not exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = wanted.table_name
        and c.column_name = wanted.column_name
    ) then
      raise notice 'Skipped %: column is missing.', wanted.index_name;
      continue;
    end if;

    execute format(
      'create index if not exists %I on public.%I using gin (%I %I.gin_trgm_ops)',
      wanted.index_name,
      wanted.table_name,
      wanted.column_name,
      trgm_schema
    );
  end loop;
end
$$;
