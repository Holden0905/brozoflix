import { db } from "@/lib/db";
import { LibraryBrowser } from "@/components/library-browser";
import type { Title } from "@/lib/types";

export const dynamic = "force-dynamic";

export type LibraryTitle = Pick<
  Title,
  | "jellyfin_id"
  | "media_type"
  | "title"
  | "year"
  | "runtime_min"
  | "poster_path"
  | "seasons"
  | "date_added"
> & {
  /**
   * Mean in raw half-star units (1–10), so "Highest rated" sorts on the
   * stored int and only the display divides down. null when nobody has rated
   * it — distinct from a genuine low score, so the grid can hide the badge
   * and the sort can put these last.
   */
  rating_avg: number | null;
  rating_count: number;
};

export default async function LibraryPage() {
  const [{ data, error }, { data: ratingRows, error: ratingErr }] = await Promise.all([
    db
      .from("titles")
      .select(
        "jellyfin_id, media_type, title, year, runtime_min, poster_path, seasons, date_added"
      )
      .order("date_added", { ascending: false }),
    db.from("ratings").select("jellyfin_id, stars"),
  ]);

  if (error) {
    throw new Error(`Failed to load the library: ${error.message}`);
  }
  if (ratingErr) {
    throw new Error(`Failed to load ratings: ${ratingErr.message}`);
  }

  // Aggregated here rather than in SQL: PostgREST would need an explicit view
  // or aggregate opt-in, and a household's rating count is trivially small.
  const totals = new Map<string, { sum: number; count: number }>();
  for (const r of ratingRows ?? []) {
    const cur = totals.get(r.jellyfin_id) ?? { sum: 0, count: 0 };
    cur.sum += r.stars;
    cur.count += 1;
    totals.set(r.jellyfin_id, cur);
  }

  const titles: LibraryTitle[] = (data ?? []).map((t) => {
    const agg = totals.get(t.jellyfin_id);
    return {
      ...(t as Omit<LibraryTitle, "rating_avg" | "rating_count">),
      rating_avg: agg ? agg.sum / agg.count : null,
      rating_count: agg?.count ?? 0,
    };
  });

  return <LibraryBrowser titles={titles} />;
}
