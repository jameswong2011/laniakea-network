import { SUB_TOPICS } from "@/types";

function sqlTopicList(indent = "        ") {
  return SUB_TOPICS.map((topic) => `${indent}'${topic.replace(/'/g, "''")}'`).join(
    ",\n"
  );
}

/** Widen post/rank checks. Safe to re-run. */
export const EXPAND_SUBTOPICS_SQL = `-- Expand the topic book. Safe to re-run.
-- Folds retired Vertical Software rows into Software first.

update public.research_posts
set sub_topic = 'Software'
where sub_topic = 'Vertical Software';

do $$
begin
  update public.content_drafts
  set sub_topic = 'Software'
  where sub_topic = 'Vertical Software';
exception
  when undefined_table then null;
end
$$;

update public.subtopic_ranks s
set
  current_hp = s.current_hp + v.current_hp,
  updated_at = now()
from public.subtopic_ranks v
where s.user_id = v.user_id
  and s.sub_topic = 'Software'
  and v.sub_topic = 'Vertical Software';

delete from public.subtopic_ranks vs
where vs.sub_topic = 'Vertical Software'
  and exists (
    select 1
    from public.subtopic_ranks s
    where s.user_id = vs.user_id
      and s.sub_topic = 'Software'
  );

update public.subtopic_ranks
set sub_topic = 'Software'
where sub_topic = 'Vertical Software';

do $$
begin
  alter table public.research_posts
    drop constraint if exists research_posts_sub_topic_check;

  alter table public.research_posts
    add constraint research_posts_sub_topic_check
    check (
      sub_topic in (
${sqlTopicList()}
      )
    );
exception
  when undefined_table then null;
end
$$;

do $$
begin
  alter table public.subtopic_ranks
    drop constraint if exists subtopic_ranks_sub_topic_check;

  alter table public.subtopic_ranks
    add constraint subtopic_ranks_sub_topic_check
    check (
      sub_topic in (
${sqlTopicList()}
      )
    );
exception
  when undefined_table then null;
end
$$;

-- If pg_cron already installed run_weekly_maintenance, re-apply
-- supabase/migrations/20260817190000_weekly_maintenance.sql after this
-- so the SQL calibrator walks the same topic list. App calibration already
-- uses SUB_TOPICS.
`;
