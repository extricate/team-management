export interface FunctieSearchItem {
  titel: string;
}

/**
 * Scores how well `text` matches `query`. Lower = better.
 * Returns null if there is no match at all.
 */
export function fuzzyScore(text: string, query: string): number | null {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();

  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;

  // Fuzzy: all query chars must appear in order inside text
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 3 : null;
}

export function filterFuncties<T extends FunctieSearchItem>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim();
  if (!q) return items;

  return items
    .map(item => ({ item, score: fuzzyScore(item.titel, q) }))
    .filter(({ score }) => score !== null)
    .sort((a, b) => a.score! - b.score!)
    .map(({ item }) => item);
}
