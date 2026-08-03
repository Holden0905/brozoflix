"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Poster } from "@/components/poster";
import { Star } from "@/components/stars";
import {
  formatStars,
  formatRuntime,
  formatSeasons,
  normalizeForSearch,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LibraryTitle } from "@/app/(gated)/page";

type TypeFilter = "all" | "movie" | "show";
type Sort = "added" | "title" | "year" | "rating";

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "Shows" },
];

/** "The Dark Knight" sorts under D, collection-shelf style. */
function sortKey(title: string): string {
  return normalizeForSearch(title).replace(/^(the|a|an) /, "");
}

export function LibraryBrowser({ titles }: { titles: LibraryTitle[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<Sort>("title");
  const searchRef = useRef<HTMLInputElement>(null);

  // Autofocus only where a hardware keyboard is likely; popping the iOS
  // keyboard on every open would be hostile.
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      searchRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const indexed = useMemo(
    () =>
      titles.map((t) => ({
        ...t,
        search: `${normalizeForSearch(t.title)} ${t.year ?? ""}`,
        key: sortKey(t.title),
      })),
    [titles]
  );

  const visible = useMemo(() => {
    const q = normalizeForSearch(query);
    let out = indexed;
    if (type !== "all") out = out.filter((t) => t.media_type === type);
    if (q) out = out.filter((t) => t.search.includes(q));
    const sorted = [...out];
    if (sort === "title") {
      sorted.sort((a, b) => a.key.localeCompare(b.key));
    } else if (sort === "year") {
      sorted.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.key.localeCompare(b.key));
    } else if (sort === "rating") {
      // Unrated sorts last rather than as zero — "nobody has said" isn't the
      // same claim as "everybody hated it".
      sorted.sort((a, b) => {
        if (a.rating_avg === null && b.rating_avg === null) {
          return a.key.localeCompare(b.key);
        }
        if (a.rating_avg === null) return 1;
        if (b.rating_avg === null) return -1;
        return b.rating_avg - a.rating_avg || a.key.localeCompare(b.key);
      });
    } else {
      sorted.sort((a, b) => (b.date_added ?? "").localeCompare(a.date_added ?? ""));
    }
    return sorted;
  }, [indexed, query, type, sort]);

  const countLabel =
    visible.length === titles.length
      ? `${titles.length} titles`
      : `${visible.length} of ${titles.length}`;

  return (
    <div>
      <div className="sticky top-safe z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-2.5">
          <div className="relative">
            <label htmlFor="library-search" className="sr-only">
              Search the library
            </label>
            <Input
              id="library-search"
              ref={searchRef}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Do we have it? Type a title…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filter by type"
              className="flex rounded-md border border-border p-0.5"
            >
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={type === opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    "rounded px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
                    type === opt.value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <label htmlFor="library-sort" className="sr-only">
              Sort
            </label>
            <select
              id="library-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
            >
              <option value="title">Title A–Z</option>
              <option value="added">Recently added</option>
              <option value="year">Year</option>
              <option value="rating">Highest rated</option>
            </select>
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {countLabel}
            </span>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="font-display text-3xl uppercase">Nothing here</p>
          <p className="text-muted-foreground">
            Not on the server{query ? ` — no match for “${query}”` : ""}.
          </p>
          <Link
            href={query ? `/wanted?q=${encodeURIComponent(query)}` : "/wanted"}
            className="mt-1 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Want it? Request it →
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {visible.map((t, i) => {
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
                    {t.rating_avg !== null && (
                      <span
                        className="ml-auto inline-flex shrink-0 items-center gap-0.5 tabular-nums"
                        title={`${formatStars(t.rating_avg)} from ${t.rating_count} ${
                          t.rating_count === 1 ? "rating" : "ratings"
                        }`}
                      >
                        <Star fill={1} className="size-3" />
                        {formatStars(t.rating_avg)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
