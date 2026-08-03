import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Poster } from "@/components/poster";
import { RatingControl } from "@/components/rating-control";
import { db } from "@/lib/db";
import { formatRuntime, formatSeasons, posterUrl } from "@/lib/format";
import { NAME_COOKIE, validateName } from "@/lib/identity";
import type { Rating, Title } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ jellyfin_id: string }> };

async function getTitle(jellyfinId: string): Promise<Title | null> {
  const { data, error } = await db
    .from("titles")
    .select("*")
    .eq("jellyfin_id", jellyfinId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load title: ${error.message}`);
  return data as Title | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jellyfin_id } = await params;
  const title = await getTitle(jellyfin_id);
  return { title: title ? `${title.title}${title.year ? ` (${title.year})` : ""}` : "Not found" };
}

export default async function TitleDetailPage({ params }: Props) {
  const { jellyfin_id } = await params;
  const [t, { data: ratingRows, error: ratingErr }, cookieStore] = await Promise.all([
    getTitle(jellyfin_id),
    db
      .from("ratings")
      .select("id, jellyfin_id, rated_by, stars, created_at")
      .eq("jellyfin_id", jellyfin_id)
      .order("created_at", { ascending: true }),
    cookies(),
  ]);
  if (!t) notFound();
  if (ratingErr) throw new Error(`Failed to load ratings: ${ratingErr.message}`);

  const viewerName = validateName(cookieStore.get(NAME_COOKIE)?.value);

  const backdrop = posterUrl(t.backdrop_path, "original");
  const meta = [
    t.year,
    t.media_type === "show" ? formatSeasons(t.seasons) : formatRuntime(t.runtime_min),
    t.media_type === "show" && t.episode_count
      ? `${t.episode_count} episode${t.episode_count === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const added = t.date_added
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(t.date_added))
    : null;

  const jellyfinUrl = process.env.JELLYFIN_URL
    ? `${process.env.JELLYFIN_URL.replace(/\/$/, "")}/web/index.html#!/details?id=${t.jellyfin_id}`
    : null;

  return (
    <article className="-mx-4 sm:-mx-6">
      {backdrop && (
        <div className="relative h-52 w-full overflow-hidden sm:h-72 md:h-96">
          <Image
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
        </div>
      )}

      <div
        className={`relative px-4 sm:px-6 ${backdrop ? "-mt-20 sm:-mt-28" : "pt-8"}`}
      >
        <div className="flex items-end gap-4 sm:gap-6">
          <Poster
            path={t.poster_path}
            title={t.title}
            size="w780"
            sizes="(max-width: 640px) 30vw, 200px"
            priority
            className="w-28 shrink-0 shadow-2xl sm:w-44"
          />
          <div className="min-w-0 pb-1">
            <h1 className="font-display text-3xl uppercase leading-none sm:text-5xl">
              {t.title}
            </h1>
            {meta && (
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">{meta}</p>
            )}
          </div>
        </div>

        <div className="mt-6 max-w-2xl space-y-5 pb-4">
          {t.genres && t.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.genres.map((g) => (
                <Badge key={g} variant="outline" className="text-muted-foreground">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {t.overview && (
            <p className="leading-relaxed text-foreground/90">{t.overview}</p>
          )}

          {t.media_type === "show" && t.seasons && t.seasons.length > 0 && (
            <div>
              <h2 className="font-display text-lg uppercase tracking-wide">
                On the server
              </h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {t.seasons
                  .slice()
                  .sort((a, b) => a - b)
                  .map((s) => (
                    <li key={s}>
                      <Badge variant="secondary">Season {s}</Badge>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <RatingControl
            jellyfinId={t.jellyfin_id}
            viewerName={viewerName}
            initialRatings={(ratingRows ?? []) as Rating[]}
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {added && <span>Added {added}</span>}
            {jellyfinUrl && (
              <a
                href={jellyfinUrl}
                className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Open in Jellyfin
              </a>
            )}
            {t.imdb_id && (
              <a
                href={`https://www.imdb.com/title/${t.imdb_id}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                IMDb
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
