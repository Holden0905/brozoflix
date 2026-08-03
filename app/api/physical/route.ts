import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NOTE_MAX_LEN, isDiscFormat } from "@/lib/physical";
import { SESSION_COOKIE, getSessionRole } from "@/lib/session";
import type { MediaType } from "@/lib/types";

/** Same gate as the request decline/delete controls. */
async function isAdmin(req: NextRequest): Promise<boolean> {
  const role = await getSessionRole(
    req.cookies.get(SESSION_COOKIE)?.value,
    process.env.COOKIE_SECRET!
  );
  return role === "admin";
}

function forbidden() {
  return NextResponse.json(
    { ok: false, error: "Admin passphrase required." },
    { status: 403 }
  );
}

function bad(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function parseKey(mediaType: unknown, tmdbId: unknown) {
  if (mediaType !== "movie" && mediaType !== "show") return null;
  if (!Number.isInteger(tmdbId) || (tmdbId as number) <= 0) return null;
  return { media_type: mediaType as MediaType, tmdb_id: tmdbId as number };
}

/**
 * Add or change a disc. Unlike ratings, the unique constraint here is on real
 * columns, so PostgREST can target it with on_conflict directly.
 *
 * title/year/poster_path are always written so a shelf row stands on its own —
 * it has to render for discs that were never ripped, and keep rendering if a
 * title later leaves the library.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return forbidden();

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid request body.");

  const key = parseKey(body.media_type, body.tmdb_id);
  if (!key) return bad("media_type must be 'movie' or 'show' and tmdb_id a positive integer.");

  if (!isDiscFormat(body.format)) {
    return bad("format must be 'dvd', 'bluray' or 'uhd'.");
  }

  const noteRaw = typeof body.note === "string" ? body.note.trim() : "";
  if (noteRaw.length > NOTE_MAX_LEN) {
    return bad(`Note must be ${NOTE_MAX_LEN} characters or fewer.`);
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 300)
      : null;
  const year =
    Number.isInteger(body.year) && body.year > 1800 && body.year < 3000
      ? body.year
      : null;
  const poster_path =
    typeof body.poster_path === "string" && body.poster_path.startsWith("/")
      ? body.poster_path
      : null;

  const { data, error } = await db
    .from("physical_media")
    .upsert(
      {
        ...key,
        title,
        year,
        poster_path,
        format: body.format,
        note: noteRaw || null,
      },
      { onConflict: "media_type,tmdb_id" }
    )
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Couldn't save the disc." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, disc: data });
}

/** Remove a disc — the "None" option in the format control. */
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) return forbidden();

  const { searchParams } = new URL(req.url);
  const tmdbRaw = searchParams.get("tmdb_id");
  const key = parseKey(
    searchParams.get("media_type"),
    tmdbRaw !== null && /^\d+$/.test(tmdbRaw) ? Number(tmdbRaw) : null
  );
  if (!key) return bad("media_type and tmdb_id are required.");

  const { error } = await db
    .from("physical_media")
    .delete()
    .eq("media_type", key.media_type)
    .eq("tmdb_id", key.tmdb_id);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Couldn't remove the disc." },
      { status: 500 }
    );
  }
  // Idempotent: removing a disc that isn't there is a no-op, not a 404.
  return NextResponse.json({ ok: true });
}
