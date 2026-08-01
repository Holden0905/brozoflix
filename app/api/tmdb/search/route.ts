import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { MediaType, SearchResult } from "@/lib/types";

const TMDB = "https://api.themoviedb.org/3";
const MAX_RESULTS = 20;

interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
  overview: string;
  popularity: number;
}

interface TmdbTv {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  popularity: number;
}

function parseYear(date: string | undefined): number | null {
  const y = date?.slice(0, 4);
  return y && /^\d{4}$/.test(y) ? Number(y) : null;
}

async function tmdbSearch<T>(kind: "movie" | "tv", q: string): Promise<T[]> {
  const url = `${TMDB}/search/${kind}?query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`TMDB ${kind} search failed with ${res.status}`);
  }
  const json = await res.json();
  return json.results ?? [];
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  let movies: TmdbMovie[];
  let tv: TmdbTv[];
  try {
    [movies, tv] = await Promise.all([
      tmdbSearch<TmdbMovie>("movie", q),
      tmdbSearch<TmdbTv>("tv", q),
    ]);
  } catch {
    return NextResponse.json(
      { error: "TMDB search is unavailable right now." },
      { status: 502 }
    );
  }

  const merged = [
    ...movies.map((m) => ({
      media_type: "movie" as MediaType,
      tmdb_id: m.id,
      title: m.title,
      year: parseYear(m.release_date),
      poster_path: m.poster_path,
      overview: m.overview || null,
      popularity: m.popularity ?? 0,
    })),
    ...tv.map((s) => ({
      media_type: "show" as MediaType,
      tmdb_id: s.id,
      title: s.name,
      year: parseYear(s.first_air_date),
      poster_path: s.poster_path,
      overview: s.overview || null,
      popularity: s.popularity ?? 0,
    })),
  ]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, MAX_RESULTS);

  // Mark anything already on the server — the whole point of this app.
  const owned = new Map<string, string>();
  if (merged.length > 0) {
    const { data, error } = await db
      .from("titles")
      .select("tmdb_id, media_type, jellyfin_id")
      .in(
        "tmdb_id",
        merged.map((r) => r.tmdb_id)
      );
    if (error) {
      return NextResponse.json(
        { error: "Couldn't check the library." },
        { status: 500 }
      );
    }
    for (const row of data ?? []) {
      owned.set(`${row.media_type}:${row.tmdb_id}`, row.jellyfin_id);
    }
  }

  const results: SearchResult[] = merged.map((r) => ({
    media_type: r.media_type,
    tmdb_id: r.tmdb_id,
    title: r.title,
    year: r.year,
    poster_path: r.poster_path,
    overview: r.overview,
    owned: owned.has(`${r.media_type}:${r.tmdb_id}`),
    jellyfin_id: owned.get(`${r.media_type}:${r.tmdb_id}`) ?? null,
  }));

  return NextResponse.json({ results });
}
