import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { NAME_COOKIE, nameCookieOptions } from "@/lib/identity";

const NOTE_CAP = 1000; // keep collision-appended notes from growing forever

function bad(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

/**
 * Requests and ratings share one honor-system identity, so asking for
 * something also teaches the app your name (and vice versa).
 */
function withName(res: NextResponse, req: Request, name: string) {
  res.cookies.set(NAME_COOKIE, name, nameCookieOptions(req));
  return res;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid request body.");

  const media_type = body.media_type;
  if (media_type !== "movie" && media_type !== "show") {
    return bad("media_type must be 'movie' or 'show'.");
  }

  const tmdb_id = body.tmdb_id;
  if (!Number.isInteger(tmdb_id) || tmdb_id <= 0) {
    return bad("tmdb_id must be a positive integer.");
  }

  const requested_by =
    typeof body.requested_by === "string" ? body.requested_by.trim() : "";
  if (requested_by.length < 1 || requested_by.length > 40) {
    return bad("Name must be 1–40 characters.");
  }

  const noteRaw = typeof body.note === "string" ? body.note.trim() : "";
  if (noteRaw.length > 200) return bad("Note must be 200 characters or fewer.");
  const note = noteRaw || null;

  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, 300) : null;
  const year =
    Number.isInteger(body.year) && body.year > 1800 && body.year < 3000
      ? body.year
      : null;
  const poster_path =
    typeof body.poster_path === "string" && body.poster_path.startsWith("/")
      ? body.poster_path
      : null;

  // Already on the server? Don't create a request row for it.
  const { data: ownedRow, error: ownedErr } = await db
    .from("titles")
    .select("jellyfin_id")
    .eq("media_type", media_type)
    .eq("tmdb_id", tmdb_id)
    .maybeSingle();
  if (ownedErr) {
    return NextResponse.json(
      { ok: false, error: "Couldn't check the library." },
      { status: 500 }
    );
  }
  if (ownedRow) {
    return withName(
      NextResponse.json({
        ok: true,
        owned: true,
        jellyfin_id: ownedRow.jellyfin_id,
      }),
      req,
      requested_by
    );
  }

  const { error } = await db.from("requests").insert({
    media_type,
    tmdb_id,
    title,
    year,
    poster_path,
    requested_by,
    note,
  });

  if (!error) {
    return withName(
      NextResponse.json({ ok: true }, { status: 201 }),
      req,
      requested_by
    );
  }

  // unique (media_type, tmdb_id): someone already asked. Append, don't error.
  if (error.code === "23505") {
    const { data: existing, error: fetchErr } = await db
      .from("requests")
      .select("id, note, status, requested_by")
      .eq("media_type", media_type)
      .eq("tmdb_id", tmdb_id)
      .maybeSingle();
    if (fetchErr || !existing) {
      return NextResponse.json(
        { ok: false, error: "Couldn't update the existing request." },
        { status: 500 }
      );
    }

    const addition = note
      ? `${requested_by}: ${note}`
      : `${requested_by} also wants this`;
    const newNote = (existing.note ? `${existing.note}\n${addition}` : addition)
      .slice(0, NOTE_CAP);

    const { error: updateErr } = await db
      .from("requests")
      .update({ note: newNote })
      .eq("id", existing.id);
    if (updateErr) {
      return NextResponse.json(
        { ok: false, error: "Couldn't update the existing request." },
        { status: 500 }
      );
    }

    return withName(
      NextResponse.json({
        ok: true,
        deduped: true,
        status: existing.status,
        first_requested_by: existing.requested_by,
      }),
      req,
      requested_by
    );
  }

  return NextResponse.json(
    { ok: false, error: "Couldn't save the request." },
    { status: 500 }
  );
}
