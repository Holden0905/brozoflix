import { db } from "@/lib/db";
import { LibraryBrowser } from "@/components/library-browser";
import { discKey } from "@/lib/physical";
import type { DiscFormat, Title } from "@/lib/types";

export const dynamic = "force-dynamic";

export type LibraryTitle = Pick<
  Title,
  | "jellyfin_id"
  | "media_type"
  | "tmdb_id"
  | "title"
  | "year"
  | "runtime_min"
  | "poster_path"
  | "seasons"
  | "date_added"
> & {
  /** Format of the disc we own, or null when there isn't one. */
  disc_format: DiscFormat | null;
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
  const [
    { data, error },
    { data: ratingRows, error: ratingErr },
    { data: discRows, error: discErr },
  ] = await Promise.all([
    db
      .from("titles")
      .select(
        "jellyfin_id, media_type, tmdb_id, title, year, runtime_min, poster_path, seasons, date_added"
      )
      .order("date_added", { ascending: false }),
    db.from("ratings").select("jellyfin_id, stars"),
    db.from("physical_media").select("media_type, tmdb_id, format"),
  ]);

  if (error) {
    throw new Error(`Failed to load the library: ${error.message}`);
  }
  if (ratingErr) {
    throw new Error(`Failed to load ratings: ${ratingErr.message}`);
  }
  if (discErr) {
    throw new Error(`Failed to load disc info: ${discErr.message}`);
  }

  const discs = new Map<string, DiscFormat>(
    (discRows ?? []).map((d) => [discKey(d.media_type, d.tmdb_id), d.format])
  );

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
      ...(t as Omit<LibraryTitle, "rating_avg" | "rating_count" | "disc_format">),
      rating_avg: agg ? agg.sum / agg.count : null,
      rating_count: agg?.count ?? 0,
      disc_format: discs.get(discKey(t.media_type, t.tmdb_id)) ?? null,
    };
  });

  return <LibraryBrowser titles={titles} />;
}
