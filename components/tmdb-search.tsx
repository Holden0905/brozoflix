"use client";

import { useEffect, useRef, useState } from "react";
import { PosterThumb } from "@/components/poster-thumb";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { SearchResult } from "@/lib/types";

export function OwnedBadge() {
  return (
    <Badge className="shrink-0 bg-owned text-owned-foreground">
      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className="size-3 fill-none stroke-current stroke-2"
      >
        <path d="M2 6.5 4.5 9 10 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      In library
    </Badge>
  );
}

export function resultKey(r: SearchResult): string {
  return `${r.media_type}:${r.tmdb_id}`;
}

/**
 * Debounced TMDB search with the result rows. Callers own what each row *does*
 * — /wanted turns a row into a request, /shelf turns it into a disc — so the
 * trailing control and any expanded form come in as render props.
 */
export function TmdbSearch({
  id,
  label,
  placeholder,
  initialQuery = "",
  emptyHint,
  renderAction,
  renderBody,
}: {
  id: string;
  label: string;
  placeholder: string;
  initialQuery?: string;
  emptyHint?: (query: string) => string;
  renderAction: (r: SearchResult, key: string) => React.ReactNode;
  renderBody?: (r: SearchResult, key: string) => React.ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setSearching(false);
      abortRef.current?.abort();
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.results ?? []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setResults([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <section aria-label={label}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 text-base"
      />
      <div aria-live="polite" className="mt-1 min-h-5 text-xs text-muted-foreground">
        {searching ? "Searching…" : null}
      </div>

      {results !== null && (
        <ul className="mt-2 divide-y divide-border rounded-md border border-border">
          {results.length === 0 && !searching && (
            <li className="p-4 text-sm text-muted-foreground">
              {emptyHint
                ? emptyHint(query.trim())
                : `TMDB has nothing for “${query.trim()}”. Check the spelling?`}
            </li>
          )}
          {results.map((r) => {
            const key = resultKey(r);
            return (
              <li key={key} className="p-3">
                <div className="flex items-center gap-3">
                  <PosterThumb path={r.poster_path} title={r.title} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {r.title}
                      {r.year && (
                        <span className="ml-1.5 text-sm text-muted-foreground">
                          {r.year}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.media_type === "show" ? "Show" : "Movie"}
                      {r.overview ? ` · ${r.overview}` : ""}
                    </p>
                  </div>
                  {renderAction(r, key)}
                </div>
                {renderBody?.(r, key)}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
