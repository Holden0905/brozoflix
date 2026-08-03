import Link from "next/link";
import { Poster } from "@/components/poster";
import { Star } from "@/components/stars";
import { formatRuntime, formatSeasons, formatStars } from "@/lib/format";
import type { MediaType } from "@/lib/types";

export type GridTitle = {
  jellyfin_id: string;
  media_type: MediaType;
  title: string;
  year: number | null;
  runtime_min: number | null;
  seasons: number[] | null;
  poster_path: string | null;
  /**
   * Half-star units to badge the tile with, or null for no badge. The library
   * passes an average; a person's page passes that person's own rating.
   */
  rating: number | null;
  /** Tooltip for the badge — what the number means differs per caller. */
  ratingTitle?: string;
};

/** The poster grid, shared so the library and a person's page stay identical. */
export function TitleGrid({ titles }: { titles: GridTitle[] }) {
  return (
    <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
      {titles.map((t, i) => {
        const meta = [
          t.year,
          t.media_type === "show"
            ? formatSeasons(t.seasons)
            : formatRuntime(t.runtime_min),
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={t.jellyfin_id}>
            <Link
              href={`/title/${t.jellyfin_id}`}
              className="group block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <Poster
                path={t.poster_path}
                title={t.title}
                priority={i < 6}
                className="transition-opacity group-hover:opacity-80"
              />
              <p className="mt-1.5 truncate text-sm font-medium">{t.title}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="min-w-0 truncate">{meta}</span>
                {t.rating !== null && (
                  <span
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 tabular-nums"
                    title={t.ratingTitle}
                  >
                    <Star fill={1} className="size-3" />
                    {formatStars(t.rating)}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
