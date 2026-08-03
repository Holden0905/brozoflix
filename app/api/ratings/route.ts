import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MAX_HALF_STARS, MIN_HALF_STARS } from "@/lib/format";
import {
  NAME_COOKIE,
  identityKey,
  nameCookieOptions,
  readNameCookie,
  validateName,
} from "@/lib/identity";
import type { Rating } from "@/lib/types";

function bad(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function oops(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

/**
 * The unique index is on `(jellyfin_id, lower(trim(rated_by)))`. PostgREST's
 * on_conflict only accepts a column list, so an expression index can't be
 * targeted by an upsert at all — raw columns give 42P10, the expression and
 * the index name both give 42703. So: find the caller's existing row, then
 * UPDATE it or INSERT a new one, with the 23505 path covering the race where
 * two taps land at once.
 */
async function findMine(jellyfinId: string, name: string) {
  const { data, error } = await db
    .from("ratings")
    .select("id, rated_by")
    .eq("jellyfin_id", jellyfinId);
  if (error) return { error };
  const key = identityKey(name);
  // Matched in JS rather than with .ilike() — a name may legitimately contain
  // % or _, which ilike would read as wildcards.
  const mine = (data ?? []).find((r) => identityKey(r.rated_by) === key);
  return { mine: mine ?? null };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("Invalid request body.");

  const jellyfin_id =
    typeof body.jellyfin_id === "string" ? body.jellyfin_id.trim() : "";
  if (!jellyfin_id) return bad("jellyfin_id is required.");

  // Half-star units, matching the table's check constraint. The UI never
  // shows this number — 7 here is "3.5 stars" on screen.
  const stars = body.stars;
  if (!Number.isInteger(stars) || stars < MIN_HALF_STARS || stars > MAX_HALF_STARS) {
    return bad("Rating must be a whole number of half-stars from 1 to 10.");
  }

  // Body name wins (the first-rating prompt), otherwise fall back to the cookie.
  const rated_by =
    body.rated_by !== undefined && body.rated_by !== null
      ? validateName(body.rated_by)
      : readNameCookie(req);
  if (!rated_by) return bad("Name must be 1–40 characters.");

  const found = await findMine(jellyfin_id, rated_by);
  if (found.error) return oops("Couldn't load existing ratings.");

  if (found.mine) {
    // Also rewrites rated_by, so "brian" → "Brian" updates the display
    // capitalization in place instead of creating a second rater.
    const { error } = await db
      .from("ratings")
      .update({ stars, rated_by })
      .eq("id", found.mine.id);
    if (error) return oops("Couldn't save your rating.");
  } else {
    const { error } = await db
      .from("ratings")
      .insert({ jellyfin_id, rated_by, stars });

    if (error?.code === "23505") {
      // Raced against another tap from the same person — theirs inserted first.
      const retry = await findMine(jellyfin_id, rated_by);
      if (retry.error || !retry.mine) return oops("Couldn't save your rating.");
      const { error: updateErr } = await db
        .from("ratings")
        .update({ stars, rated_by })
        .eq("id", retry.mine.id);
      if (updateErr) return oops("Couldn't save your rating.");
    } else if (error?.code === "23503") {
      return NextResponse.json(
        { ok: false, error: "That title isn't in the library." },
        { status: 404 }
      );
    } else if (error) {
      return oops("Couldn't save your rating.");
    }
  }

  const { data: all, error: listErr } = await db
    .from("ratings")
    .select("id, jellyfin_id, rated_by, stars, created_at")
    .eq("jellyfin_id", jellyfin_id)
    .order("created_at", { ascending: true });
  if (listErr) return oops("Saved, but couldn't reload the ratings.");

  const res = NextResponse.json({
    ok: true,
    rated_by,
    ratings: (all ?? []) as Rating[],
  });
  // Remember who they are, so the next rating is one tap.
  res.cookies.set(NAME_COOKIE, rated_by, nameCookieOptions(req));
  return res;
}

/** Clear the caller's own rating. Identity comes from the cookie only. */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const jellyfin_id = searchParams.get("jellyfin_id")?.trim() ?? "";
  if (!jellyfin_id) return bad("jellyfin_id is required.");

  const rated_by = readNameCookie(req);
  if (!rated_by) return bad("No name set, so there's nothing to clear.");

  const found = await findMine(jellyfin_id, rated_by);
  if (found.error) return oops("Couldn't load existing ratings.");
  if (found.mine) {
    const { error } = await db.from("ratings").delete().eq("id", found.mine.id);
    if (error) return oops("Couldn't clear your rating.");
  }

  const { data: all, error: listErr } = await db
    .from("ratings")
    .select("id, jellyfin_id, rated_by, stars, created_at")
    .eq("jellyfin_id", jellyfin_id)
    .order("created_at", { ascending: true });
  if (listErr) return oops("Cleared, but couldn't reload the ratings.");

  return NextResponse.json({ ok: true, ratings: (all ?? []) as Rating[] });
}
