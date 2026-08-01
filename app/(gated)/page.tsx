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
>;

export default async function LibraryPage() {
  const { data, error } = await db
    .from("titles")
    .select(
      "jellyfin_id, media_type, title, year, runtime_min, poster_path, seasons, date_added"
    )
    .order("date_added", { ascending: false });

  if (error) {
    throw new Error(`Failed to load the library: ${error.message}`);
  }

  return <LibraryBrowser titles={(data ?? []) as LibraryTitle[]} />;
}
