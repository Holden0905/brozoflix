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

export function posterUrl(
  path: string | null | undefined,
  size: "w500" | "w780" | "original" = "w500"
): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
