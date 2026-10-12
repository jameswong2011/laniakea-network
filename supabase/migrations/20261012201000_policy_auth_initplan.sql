-- Row security reads auth.uid(), auth.jwt(), auth.role() and is_admin() once per query
-- instead of once per row. Who can read or write what stays the same. Safe to re-run.

do $$
declare
  pol record;
  next_qual text;
  next_check text;
  statement text;
begin
  for pol in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    next_qual := pol.qual;
    next_check := pol.with_check;

    if next_qual is not null then
      next_qual := regexp_replace(next_qual, '(?<!SELECT )(?<![[:alnum:]_.])auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
      next_qual := regexp_replace(next_qual, '(?<!SELECT )(?<![[:alnum:]_.])(public\.)?is_admin\(\)', '(select public.is_admin())', 'g');
    end if;

    if next_check is not null then
      next_check := regexp_replace(next_check, '(?<!SELECT )(?<![[:alnum:]_.])auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
      next_check := regexp_replace(next_check, '(?<!SELECT )(?<![[:alnum:]_.])(public\.)?is_admin\(\)', '(select public.is_admin())', 'g');
    end if;

    if next_qual is not distinct from pol.qual and next_check is not distinct from pol.with_check then
      continue;
    end if;

    statement := format('alter policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    if next_qual is not null then
      statement := statement || format(' using (%s)', next_qual);
    end if;

    if next_check is not null then
      statement := statement || format(' with check (%s)', next_check);
    end if;

    begin
      execute statement;
    exception
      when others then
        raise notice 'Left % on % as it was: %', pol.policyname, pol.tablename, sqlerrm;
    end;
  end loop;
end
$$;
