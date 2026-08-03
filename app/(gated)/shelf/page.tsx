import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ShelfClient, type ShelfItem } from "@/components/shelf-client";
import { db } from "@/lib/db";
import { discKey } from "@/lib/physical";
import { SESSION_COOKIE, getSessionRole } from "@/lib/session";
import type { PhysicalMedia } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shelf" };

export default async function ShelfPage() {
  const [
    { data: discRows, error: discErr },
    { data: titleRows, error: titleErr },
    cookieStore,
  ] = await Promise.all([
    db.from("physical_media").select("*").order("created_at", { ascending: false }),
    db.from("titles").select("jellyfin_id, media_type, tmdb_id"),
    cookies(),
  ]);
  if (discErr) throw new Error(`Failed to load the shelf: ${discErr.message}`);
  if (titleErr) throw new Error(`Failed to load the library: ${titleErr.message}`);

  // A disc may have no row in titles at all — that's the whole reason this
  // table keys on tmdb_id.
  const ripped = new Map<string, string>(
    (titleRows ?? []).map((t) => [discKey(t.media_type, t.tmdb_id), t.jellyfin_id])
  );

  const items: ShelfItem[] = ((discRows ?? []) as PhysicalMedia[]).map((d) => ({
    ...d,
    jellyfin_id: ripped.get(discKey(d.media_type, d.tmdb_id)) ?? null,
  }));

  const role = await getSessionRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    process.env.COOKIE_SECRET!
  );

  return <ShelfClient items={items} isAdmin={role === "admin"} />;
}
