-- Widen the topic book to the selected 27 desks. Safe to re-run.

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
        'Software',
        'Semiconductors',
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
        'Software',
        'Semiconductors',
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
