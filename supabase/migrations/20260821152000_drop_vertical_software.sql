-- Retire Vertical Software. Fold existing rows into Software.
-- Safe to re-run. Hunt / Ascent math is unchanged.

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
        'Healthcare',
        'Biotech',
        'Banks',
        'Insurance',
        'Payments',
        'Technology',
        'AI Compute',
        'AI Infrastructure',
        'Datacenter Power',
        'Software',
        'Digital Media',
        'Semiconductors',
        'Semi Equipment',
        'Memory',
        'Advanced Packaging',
        'Foundry',
        'Photonics',
        'Cybersecurity',
        'Consumer',
        'Autos',
        'Industrials',
        'Defense',
        'Telecom',
        'Real Estate',
        'Utilities',
        'Energy',
        'Mining',
        'Macro',
        'FX',
        'Credit',
        'Emerging Markets',
        'China',
        'Commodities',
        'Crypto',
        'Quant',
        'Private Markets'
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
        'Healthcare',
        'Biotech',
        'Banks',
        'Insurance',
        'Payments',
        'Technology',
        'AI Compute',
        'AI Infrastructure',
        'Datacenter Power',
        'Software',
        'Digital Media',
        'Semiconductors',
        'Semi Equipment',
        'Memory',
        'Advanced Packaging',
        'Foundry',
        'Photonics',
        'Cybersecurity',
        'Consumer',
        'Autos',
        'Industrials',
        'Defense',
        'Telecom',
        'Real Estate',
        'Utilities',
        'Energy',
        'Mining',
        'Macro',
        'FX',
        'Credit',
        'Emerging Markets',
        'China',
        'Commodities',
        'Crypto',
        'Quant',
        'Private Markets'
      )
    );
exception
  when undefined_table then null;
end
$$;
