/** [1,2,3,4,5,6] → "Seasons 1–6" · [1,2,4] → "Seasons 1–2, 4" · [3] → "Season 3" */
export function formatSeasons(seasons: number[] | null | undefined): string | null {
  if (!seasons || seasons.length === 0) return null;
  const sorted = [...new Set(seasons)].sort((a, b) => a - b);
  const runs: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}–${prev}`);
    if (cur !== undefined) {
      start = cur;
      prev = cur;
    }
  }
  const label = sorted.length === 1 ? "Season" : "Seasons";
  return `${label} ${runs.join(", ")}`;
}

/** 109 → "1h 49m", 45 → "45m" */
export function formatRuntime(min: number | null | undefined): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Lowercase, strip diacritics and punctuation, for in-memory search. */
export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/*
 * Ratings are stored as int half-star units, 1–10. Nobody ever sees a 10:
 * every value on its way to a screen goes through toStars/formatStars first.
 */
export const MIN_HALF_STARS = 1;
export const MAX_HALF_STARS = 10;

/** 7 → 3.5. Storage units → the 0.5–5 scale people actually read. */
export function toStars(halfStars: number): number {
  return halfStars / 2;
}

/**
 * 8 → "4" · 9 → "4.5" · 7.5 (an average) → "3.8".
 * One decimal only when it carries information — never "4.0".
 */
export function formatStars(halfStars: number): string {
  const stars = Math.round(toStars(halfStars) * 10) / 10;
  return Number.isInteger(stars) ? `${stars}` : stars.toFixed(1);
}

/** Mean in raw half-star units, or null when nobody has rated. */
export function averageHalfStars(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** "The Dark Knight" sorts under D, collection-shelf style. */
export function sortKey(title: string): string {
  return normalizeForSearch(title).replace(/^(the|a|an) /, "");
}

export function posterUrl(
  path: string | null | undefined,
  size: "w500" | "w780" | "original" = "w500"
): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
