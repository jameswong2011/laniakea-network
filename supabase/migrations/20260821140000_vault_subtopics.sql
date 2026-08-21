-- Add ten vault books that split Technology / Software / Semiconductors / Energy.
-- Safe to re-run. Hunt / Ascent math is unchanged.

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
        'Vertical Software',
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
        'Vertical Software',
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
