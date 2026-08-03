import { displayName, identityKey } from "@/lib/identity";

export interface Person {
  /** Normalized identity — lower(trim(rated_by)), and the URL segment. */
  key: string;
  /** Most recent capitalization this person used. */
  name: string;
  /** Titles rated. One row per person per title, per the unique index. */
  count: number;
}

type RaterRow = { rated_by: string; created_at: string };

/**
 * Collapses rating rows into people. There is no users table on purpose —
 * a rater exists exactly as long as one of their ratings does.
 *
 * Display name is taken from the newest row, matching how the rating route
 * rewrites rated_by in place when someone re-rates with different casing.
 * created_at is the only recency signal the table has (no updated_at), so
 * re-casing an old rating won't move the name until they rate something new.
 */
export function groupRaters(rows: RaterRow[]): Person[] {
  const byKey = new Map<string, { name: string; newest: number; count: number }>();
  for (const row of rows) {
    const key = identityKey(row.rated_by);
    if (!key) continue;
    const at = new Date(row.created_at).getTime();
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, { name: displayName(row.rated_by), newest: at, count: 1 });
      continue;
    }
    cur.count += 1;
    if (at >= cur.newest) {
      cur.newest = at;
      cur.name = displayName(row.rated_by);
    }
  }
  return [...byKey.entries()]
    .map(([key, v]) => ({ key, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/** The one person matching a normalized key, or null. */
export function findPerson(rows: RaterRow[], key: string): Person | null {
  return groupRaters(rows).find((p) => p.key === key) ?? null;
}
