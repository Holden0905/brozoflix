import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PersonRatings, type PersonTitle } from "@/components/person-ratings";
import { db } from "@/lib/db";
import { formatStars } from "@/lib/format";
import { NAME_COOKIE, identityKey, validateName } from "@/lib/identity";
import { findPerson } from "@/lib/people";
import type { Rating, Title } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ name: string }> };

/**
 * Next hands the segment over still percent-encoded, so decoding here is
 * load-bearing: "50%25%20off" is the person literally called "50% Off".
 * Normalizing after means /people/Brian and /people/brian are one page.
 *
 * Malformed escapes ("/people/%ZZ") are rejected by the server before they
 * reach this, but an unmatchable key beats a 500 if that ever changes.
 */
async function keyFromParams(params: Props["params"]): Promise<string> {
  const { name } = await params;
  try {
    return identityKey(decodeURIComponent(name));
  } catch {
    return "";
  }
}

type RatingRow = Pick<Rating, "jellyfin_id" | "rated_by" | "stars" | "created_at">;

async function loadRatings(): Promise<RatingRow[]> {
  const { data, error } = await db
    .from("ratings")
    .select("jellyfin_id, rated_by, stars, created_at");
  if (error) throw new Error(`Failed to load ratings: ${error.message}`);
  return (data ?? []) as RatingRow[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = await keyFromParams(params);
  const person = findPerson(await loadRatings(), key);
  return { title: person ? person.name : "Not found" };
}

type LibraryRow = Pick<
  Title,
  | "jellyfin_id"
  | "media_type"
  | "title"
  | "year"
  | "runtime_min"
  | "poster_path"
  | "seasons"
>;

export default async function PersonPage({ params }: Props) {
  const key = await keyFromParams(params);

  const [ratings, { data: titleRows, error: titleErr }, cookieStore] =
    await Promise.all([
      loadRatings(),
      db
        .from("titles")
        .select(
          "jellyfin_id, media_type, title, year, runtime_min, poster_path, seasons"
        ),
      cookies(),
    ]);
  if (titleErr) {
    throw new Error(`Failed to load the library: ${titleErr.message}`);
  }

  // A person exists only as long as one of their ratings does, so an unknown
  // or newly-cleared name is a genuine 404 rather than an empty page.
  const person = findPerson(ratings, key);
  if (!person) notFound();

  const mine = ratings.filter((r) => identityKey(r.rated_by) === key);
  const byId = new Map((titleRows ?? []).map((t) => [t.jellyfin_id, t as LibraryRow]));

  const titles: PersonTitle[] = mine.flatMap((r) => {
    const t = byId.get(r.jellyfin_id);
    if (!t) return []; // rated a title that has since left the library
    return [
      {
        ...t,
        rating: r.stars,
        ratingTitle: `${person.name} rated it ${formatStars(r.stars)}`,
        rated_at: r.created_at,
      },
    ];
  });

  const libraryTotal = (titleRows ?? []).length;
  const viewerName = validateName(cookieStore.get(NAME_COOKIE)?.value);
  const isViewer = viewerName != null && identityKey(viewerName) === key;

  return (
    <div className="pt-6">
      <Link
        href="/people"
        className="rounded text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        ← People
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-3xl uppercase tracking-wide">
          {person.name}
        </h1>
        {isViewer && <span className="text-sm text-muted-foreground">that&apos;s you</span>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground tabular-nums">
        {titles.length} of {libraryTotal} rated
      </p>

      <PersonRatings titles={titles} />
    </div>
  );
}
