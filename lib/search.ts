/* Traqi — forgiving search for pickers.

   People search the way they remember a name, not the way it was typed in:
   "obi" for Amaka Obi, "chi ade" for Adebayo Chinedu, "amak" half-way through
   typing, "amaak" with a slip of the thumb. So the query is split into words
   and every word has to land somewhere in the record, in any order — at the
   start of a word, inside one, or within one typo of a word's beginning.
   Results come back best-first. */

const norm = (s: string) => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9@.+]+/g, ' ')
  .trim();

/** True when `a` and `b` are at most one edit apart (insert, delete, swap, change). */
function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;                       // one changed
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // two swapped
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** How well `query` fits `text` — 0 means it does not match at all. */
export function matchScore(text: string, query: string): number {
  const q = norm(query);
  if (!q) return 1;
  const hay = norm(text);
  if (!hay) return 0;
  const words = hay.split(' ');
  let score = 0;
  for (const t of q.split(' ')) {
    let s = 0;
    if (words.includes(t)) s = 6;
    else if (words.some(w => w.startsWith(t))) s = 4;
    else if (hay.replace(/ /g, '').includes(t)) s = 2;
    else if (t.length >= 4 && words.some(w => withinOne(t, w.slice(0, t.length)) || withinOne(t, w))) s = 1;
    if (!s) return 0;
    score += s;
  }
  if (hay.startsWith(q)) score += 1;
  return score;
}

/** Keeps the items `query` matches, best match first. An empty query keeps
    everything in its original order. */
export function smartFilter<T>(items: T[], query: string, text: (item: T) => string): T[] {
  if (!norm(query)) return items;
  return items
    .map((item, i) => ({ item, i, s: matchScore(text(item), query) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(x => x.item);
}
