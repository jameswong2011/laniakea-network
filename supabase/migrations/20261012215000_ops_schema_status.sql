-- The Ops tab reads which database changes are live from one call, so it no longer probes
-- settlement or table columns on each load. Admins only. Safe to re-run.

create or replace function public.laniakea_schema_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when public.is_admin() then jsonb_build_object(
    'originalStake', exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'research_posts'
        and column_name = 'original_stake'
    ),
    'settleApply', to_regprocedure('public.settle_hunted_post(uuid)') is not null,
    'comments', to_regclass('public.research_comments') is not null,
    'moneyClosed', not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in (
          'laniakea_increment_hp',
          'laniakea_pay',
          'spend_with_referral_internal',
          'apply_utl_move',
          'apply_book_calibration'
        )
        and (
          has_function_privilege('anon', p.oid, 'execute')
          or has_function_privilege('authenticated', p.oid, 'execute')
        )
    ),
    'balanceFunctions', to_regprocedure('public.cast_note_vote(uuid, text, integer)') is not null
      and to_regprocedure('public.stake_comment(uuid, text, integer)') is not null
      and to_regprocedure('public.cash_out_hp(integer)') is not null,
    'writesLocked', not has_table_privilege('authenticated', 'public.hp_transactions', 'insert')
      and not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'research_posts'
          and policyname = 'Allow all for authenticated users - research_posts'
      ),
    'openNotes', to_regclass('public.research_posts_open') is not null
      and to_regprocedure('public.search_comments(text[], integer)') is not null,
    'textClosed', not has_column_privilege('authenticated', 'public.research_posts', 'body', 'select')
  ) end
$$;

revoke all on function public.laniakea_schema_status() from public, anon;
grant execute on function public.laniakea_schema_status() to authenticated;

notify pgrst, 'reload schema';
