"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NameControl } from "@/components/name-control";
import { Star, StarRow, fillFor } from "@/components/stars";
import {
  MAX_HALF_STARS,
  MIN_HALF_STARS,
  averageHalfStars,
  formatStars,
  toStars,
} from "@/lib/format";
import { NAME_MAX_LEN, identityKey } from "@/lib/identity";
import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/types";

const STARS = [1, 2, 3, 4, 5];

/**
 * Fraction of a star's width below which a tap means "half".
 *
 * Deliberately not 0.5: the midpoint is the widest, most inviting part of the
 * glyph, so an even split makes the most natural tap a coin flip. Biasing the
 * boundary left means a centre tap reliably gives the whole star and you have
 * to aim for the half — whole stars are the common case, so the forgiving
 * default favours them.
 */
const HALF_THRESHOLD = 0.4;

/** Which stored value star `n` yields for a tap at `ratio` across its width. */
function valueAt(n: number, ratio: number): number {
  return (n - 1) * 2 + (ratio < HALF_THRESHOLD ? 1 : 2);
}

export function RatingControl({
  jellyfinId,
  viewerName,
  initialRatings,
}: {
  jellyfinId: string;
  viewerName: string | null;
  initialRatings: Rating[];
}) {
  const router = useRouter();
  const [ratings, setRatings] = useState(initialRatings);
  const [hover, setHover] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // A router.refresh() elsewhere (name change, another tab) re-renders the
  // server component; take its data as authoritative when it lands.
  useEffect(() => setRatings(initialRatings), [initialRatings]);

  const mine = viewerName
    ? ratings.find((r) => identityKey(r.rated_by) === identityKey(viewerName))
    : undefined;
  const avg = averageHalfStars(ratings.map((r) => r.stars));

  async function save(stars: number, name?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jellyfin_id: jellyfinId,
          stars,
          ...(name ? { rated_by: name } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Couldn't save your rating.");
        setBusy(false);
        return;
      }
      setRatings(data.ratings ?? []);
      setPending(null);
      setBusy(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/ratings?jellyfin_id=${encodeURIComponent(jellyfinId)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Couldn't clear your rating.");
        setBusy(false);
        return;
      }
      setRatings(data.ratings ?? []);
      setHover(null);
      setBusy(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  /** Tapping the value you already have takes it back off. */
  function commit(stars: number) {
    if (busy) return;
    if (mine && mine.stars === stars) {
      clear();
    } else if (viewerName) {
      save(stars);
    } else {
      setPending(stars);
    }
  }

  function ratioIn(el: HTMLElement, clientX: number): number {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 ? (clientX - rect.left) / rect.width : 1;
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (busy) return;
    const current = mine?.stars ?? 0;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      next = Math.min(MAX_HALF_STARS, current + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      next = Math.max(0, current - 1); // 0 falls off the bottom into "cleared"
    } else if (e.key === "Home") {
      next = MIN_HALF_STARS;
    } else if (e.key === "End") {
      next = MAX_HALF_STARS;
    } else if (e.key === "Delete" || e.key === "Backspace") {
      next = 0;
    } else {
      return;
    }
    e.preventDefault();
    if (next === current) return;
    if (next === 0) {
      if (mine) clear();
    } else if (viewerName) {
      save(next);
    } else {
      setPending(next);
    }
  }

  const shown = hover ?? pending ?? mine?.stars ?? 0;

  return (
    <section aria-labelledby="ratings-heading" className="border-t border-border pt-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="ratings-heading" className="font-display text-lg uppercase tracking-wide">
          Ratings
        </h2>
        {avg !== null && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{formatStars(avg)}</span>
            {` average from ${ratings.length} ${ratings.length === 1 ? "rating" : "ratings"}`}
          </p>
        )}
      </div>

      {/*
       * One slider rather than five buttons: the value depends on where inside
       * a star you tap, which no button can express. Stars sit flush so the
       * row is one continuous target with no dead gaps between them.
       */}
      <div
        ref={rowRef}
        role="slider"
        tabIndex={busy ? -1 : 0}
        aria-label="Your rating"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={toStars(shown)}
        aria-valuetext={
          shown === 0 ? "Not rated" : `${formatStars(shown)} out of 5 stars`
        }
        aria-disabled={busy || undefined}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
        className={cn(
          "mt-2 -ml-1 flex w-fit text-foreground rounded-md focus-visible:outline-2 focus-visible:outline-offset-2",
          busy && "opacity-50"
        )}
      >
        {STARS.map((n) => (
          <span
            key={n}
            // 56px targets: five fit inside 375px with room, and each half
            // still lands ~22px, which is tappable when it's a sub-zone of a
            // contiguous strip rather than an isolated control.
            className="block size-14 shrink-0 cursor-pointer p-1"
            onClick={(e) => commit(valueAt(n, ratioIn(e.currentTarget, e.clientX)))}
            onMouseMove={(e) => setHover(valueAt(n, ratioIn(e.currentTarget, e.clientX)))}
          >
            <Star fill={fillFor(shown, n)} className="size-full" />
          </span>
        ))}
      </div>

      {pending !== null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = draftName.trim();
            if (trimmed) save(pending, trimmed);
          }}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <label htmlFor="rating-name" className="sr-only">
            Your name
          </label>
          <Input
            id="rating-name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Who's rating?"
            maxLength={NAME_MAX_LEN}
            autoFocus
            className="h-9 w-40 text-base"
          />
          <Button type="submit" size="sm" disabled={busy || !draftName.trim()}>
            {busy ? "Saving…" : `Rate ${formatStars(pending)}`}
          </Button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="rounded px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {viewerName ? (
            <NameControl name={viewerName} verb="Rating as" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Tap a star to rate — we&apos;ll ask your name once.
            </p>
          )}
          {mine && (
            <button
              type="button"
              disabled={busy}
              onClick={clear}
              className="rounded text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <p aria-live="polite" className="mt-1 min-h-5 text-sm text-destructive">
        {error}
      </p>

      {ratings.length > 0 && (
        <ul className="mt-2 divide-y divide-border rounded-md border border-border">
          {ratings.map((r) => {
            const isMine =
              viewerName != null && identityKey(r.rated_by) === identityKey(viewerName);
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">
                  <span className="font-medium">{r.rated_by}</span>
                  {isMine && <span className="text-muted-foreground"> (you)</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatStars(r.stars)}
                  </span>
                  <StarRow
                    halfStars={r.stars}
                    label={`${r.rated_by} rated it ${formatStars(r.stars)} out of 5`}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
