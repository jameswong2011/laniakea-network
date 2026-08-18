-- Move the weekly sweep to Monday 09:30 America/New_York.
-- Safe to re-run. Does not change Hunt / Ascent / calibration math.

create or replace function public.is_weekly_cron_window()
returns boolean
language sql
stable
as $$
  select
    extract(dow from timezone('America/New_York', now())) = 1
    and extract(hour from timezone('America/New_York', now())) = 9
    and extract(minute from timezone('America/New_York', now())) between 30 and 34;
$$;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in (
    'laniakea-weekly-maintenance',
    'laniakea-weekly-maintenance-edt',
    'laniakea-weekly-maintenance-est'
  );

  perform cron.schedule(
    'laniakea-weekly-maintenance-edt',
    '30 13 * * 1',
    $cron$select public.run_weekly_maintenance('cron') where public.is_weekly_cron_window()$cron$
  );

  perform cron.schedule(
    'laniakea-weekly-maintenance-est',
    '30 14 * * 1',
    $cron$select public.run_weekly_maintenance('cron') where public.is_weekly_cron_window()$cron$
  );
exception
  when undefined_table then null;
  when undefined_function then null;
  when others then null;
end
$$;
