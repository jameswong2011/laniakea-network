import { SUB_TOPICS } from "@/types";

function sqlTopicList(indent = "        ") {
  return SUB_TOPICS.map((topic) => `${indent}'${topic.replace(/'/g, "''")}'`).join(
    ",\n"
  );
}

/** Widen post/rank checks. Safe to re-run. */
export const EXPAND_SUBTOPICS_SQL = `-- Expand the topic book. Safe to re-run.

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
-- so the SQL calibrator walks the same 27 books. App calibration already
-- uses SUB_TOPICS.
`;
