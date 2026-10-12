export function wantsMeaningSearch(query: string) {
  const text = query.trim();
  return text.includes("?") || text.split(/\s+/).filter(Boolean).length >= 3;
}
