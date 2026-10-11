export function searchPattern(query: string) {
  return `%${query.trim().replace(/[%_]/g, "").slice(0, 80)}%`;
}

/** Words that must appear. Short tokens are dropped so "a fed cut" still finds "fed" and "cut". */
export function searchTerms(query: string) {
  const cleaned = query.trim().replace(/[%_]/g, "").slice(0, 80);
  const terms = cleaned
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 5);

  if (terms.length > 0) {
    return terms;
  }

  const fallback = cleaned.toLowerCase();
  return fallback.length >= 2 ? [fallback] : [];
}

function hasWord(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

/** Lower is a closer title hit: exact, then prefix, then the phrase, then whole words. */
export function titleMatchScore(title: string, query: string) {
  const text = title.toLowerCase();
  const phrase = query.trim().toLowerCase();
  const terms = searchTerms(query);

  if (phrase && text === phrase) {
    return 0;
  }

  if (phrase && text.startsWith(phrase)) {
    return 1;
  }

  if (phrase && text.includes(phrase)) {
    return 2;
  }

  const wholeWords = terms.filter((term) => hasWord(text, term)).length;
  return 3 + (terms.length - wholeWords);
}

export function textHasTerms(text: string, query: string) {
  const terms = searchTerms(query);
  const haystack = text.toLowerCase();
  return terms.length > 0 && terms.every((term) => haystack.includes(term));
}

export function postMatchTier(title: string, body: string, query: string) {
  if (textHasTerms(title, query)) {
    return "title" as const;
  }

  if (textHasTerms(body, query)) {
    return "body" as const;
  }

  return null;
}

export function orderSearchPosts<T extends { title: string; body: string; createdAt: string }>(
  rows: T[],
  query: string
) {
  const titleHits: T[] = [];
  const bodyHits: T[] = [];

  for (const row of rows) {
    const tier = postMatchTier(row.title, row.body, query);
    if (tier === "title") {
      titleHits.push(row);
    } else if (tier === "body") {
      bodyHits.push(row);
    }
  }

  const phrase = query.trim().toLowerCase();
  titleHits.sort((a, b) => {
    const score = titleMatchScore(a.title, query) - titleMatchScore(b.title, query);
    if (score !== 0) {
      return score;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  bodyHits.sort((a, b) => {
    const aPhrase = phrase && a.body.toLowerCase().includes(phrase) ? 0 : 1;
    const bPhrase = phrase && b.body.toLowerCase().includes(phrase) ? 0 : 1;
    if (aPhrase !== bPhrase) {
      return aPhrase - bPhrase;
    }
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  return { titleHits, bodyHits };
}

export function searchExcerpt(text: string, query: string, max = 180, around = true) {
  const compact = text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact) {
    return "";
  }

  if (!around) {
    return compact.length <= max ? compact : `${compact.slice(0, max).trimEnd()}…`;
  }

  const haystack = compact.toLowerCase();
  const phrase = query.trim().toLowerCase();
  let at = phrase ? haystack.indexOf(phrase) : -1;

  if (at < 0) {
    for (const term of searchTerms(query)) {
      at = haystack.indexOf(term);
      if (at >= 0) {
        break;
      }
    }
  }

  if (at <= 0) {
    return compact.length <= max ? compact : `${compact.slice(0, max).trimEnd()}…`;
  }

  const start = Math.max(0, at - Math.floor(max * 0.35));
  const end = Math.min(compact.length, start + max);
  const slice = compact.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${slice}${end < compact.length ? "…" : ""}`;
}
