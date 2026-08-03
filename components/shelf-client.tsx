"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiscIcon, OwnershipBadge } from "@/components/disc-badge";
import { PosterThumb } from "@/components/poster-thumb";
import { OwnedBadge, TmdbSearch } from "@/components/tmdb-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DISC_FORMATS, FORMAT_LABELS, NOTE_MAX_LEN } from "@/lib/physical";
import { cn } from "@/lib/utils";
import type { DiscFormat, PhysicalMedia, SearchResult } from "@/lib/types";

export type ShelfItem = PhysicalMedia & {
  /** null when the disc has never been ripped — the interesting case. */
  jellyfin_id: string | null;
};

/* ---------- adding a disc ---------- */

function AddDiscForm({
  result,
  onDone,
}: {
  result: SearchResult;
  onDone: (added: boolean) => void;
}) {
  const [format, setFormat] = useState<DiscFormat>("bluray");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/physical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: result.media_type,
          tmdb_id: result.tmdb_id,
          format,
          title: result.title,
          year: result.year,
          poster_path: result.poster_path,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Couldn't add the disc.");
        setBusy(false);
        return;
      }
      setBusy(false);
      onDone(true);
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"
    >
      <div
        role="group"
        aria-label="Disc format"
        className="flex rounded-md border border-border p-0.5"
      >
        {DISC_FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={format === f}
            onClick={() => setFormat(f)}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
              format === f
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {FORMAT_LABELS[f]}
          </button>
        ))}
      </div>
      <label htmlFor="add-disc-note" className="sr-only">
        Note (optional)
      </label>
      <Textarea
        id="add-disc-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional) — box set, steelbook…"
        maxLength={NOTE_MAX_LEN}
        rows={1}
        className="min-h-9 w-full text-base sm:w-56"
      />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Adding…" : "Add to shelf"}
      </Button>
      <button
        type="button"
        onClick={() => onDone(false)}
        className="rounded px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
      >
        Cancel
      </button>
      {error && (
        <span aria-live="polite" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </form>
  );
}

function AddDiscSection({ onAdded }: { onAdded: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  return (
    <div className="mt-3">
      <TmdbSearch
        id="shelf-search"
        label="Search movies and shows to add a disc"
        placeholder="Search TMDB for a disc you own…"
        emptyHint={(q) => `TMDB has nothing for “${q}”. Check the spelling?`}
        renderAction={(r, key) => {
          if (added.has(key)) {
            return (
              <Badge variant="secondary" className="shrink-0">
                On the shelf ✓
              </Badge>
            );
          }
          return (
            <div className="flex shrink-0 items-center gap-2">
              {r.owned && <OwnedBadge />}
              <Button
                type="button"
                size="sm"
                variant={picked === key ? "secondary" : "default"}
                onClick={() => setPicked(picked === key ? null : key)}
              >
                {picked === key ? "Cancel" : "Add disc"}
              </Button>
            </div>
          );
        }}
        renderBody={(r, key) =>
          picked === key && !added.has(key) ? (
            <AddDiscForm
              result={r}
              onDone={(ok) => {
                setPicked(null);
                if (ok) {
                  setAdded((prev) => new Set(prev).add(key));
                  onAdded();
                }
              }}
            />
          ) : null
        }
      />
    </div>
  );
}

/* ---------- the shelf itself ---------- */

function DiscRow({ item, isAdmin }: { item: ShelfItem; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(item.note ?? "");
  const [error, setError] = useState<string | null>(null);

  async function write(next: DiscFormat | null, nextNote: string) {
    setBusy(true);
    setError(null);
    try {
      const res =
        next === null
          ? await fetch(
              `/api/physical?media_type=${encodeURIComponent(item.media_type)}&tmdb_id=${item.tmdb_id}`,
              { method: "DELETE" }
            )
          : await fetch("/api/physical", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                media_type: item.media_type,
                tmdb_id: item.tmdb_id,
                format: next,
                title: item.title,
                year: item.year,
                poster_path: item.poster_path,
                note: nextNote.trim() || undefined,
              }),
            });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "That didn't work.");
        setBusy(false);
        return;
      }
      setBusy(false);
      setEditingNote(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  const heading = (
    <>
      <p className="truncate font-medium">
        {item.title}
        {item.year && (
          <span className="ml-1.5 text-sm text-muted-foreground">{item.year}</span>
        )}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {item.media_type === "show" ? "Show" : "Movie"}
        {item.note ? ` · ${item.note}` : ""}
      </p>
    </>
  );

  return (
    <li className="p-3">
      <div className="flex items-center gap-3">
        <PosterThumb
          path={item.poster_path}
          title={item.title}
          className={item.jellyfin_id ? undefined : "opacity-60"}
        />
        <div className="min-w-0 flex-1">
          {item.jellyfin_id ? (
            <Link
              href={`/title/${item.jellyfin_id}`}
              className="block min-w-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {heading}
            </Link>
          ) : (
            <div className="min-w-0">{heading}</div>
          )}
        </div>
        <OwnershipBadge state={item.format} className="shrink-0" />
      </div>

      {isAdmin && (
        <>
          <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
            {error && <span className="mr-auto text-xs text-destructive">{error}</span>}
            {DISC_FORMATS.filter((f) => f !== item.format).map((f) => (
              <button
                key={f}
                type="button"
                disabled={busy}
                onClick={() => write(f, note)}
                className="h-7 rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1"
              >
                → {FORMAT_LABELS[f]}
              </button>
            ))}
            {/* An unripped disc has no detail page, so its note has to be
                editable here or it could never be written at all. */}
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditingNote((v) => !v)}
              className="h-7 rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1"
            >
              {item.note ? "Edit note" : "Add note"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => (confirming ? write(null, note) : setConfirming(true))}
              onBlur={() => setConfirming(false)}
              className={cn(
                "h-7 rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1",
                confirming && "bg-foreground text-background hover:text-background"
              )}
            >
              {confirming ? "Really remove?" : "Remove"}
            </button>
          </div>

          {editingNote && (
            <div className="mt-2">
              <label htmlFor={`note-${item.id}`} className="sr-only">
                Note
              </label>
              <Textarea
                id={`note-${item.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Box set, steelbook, disc 2 is scratched…"
                maxLength={NOTE_MAX_LEN}
                rows={2}
                className="text-base"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => write(item.format, note)}
                >
                  {busy ? "Saving…" : "Save note"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setNote(item.note ?? "");
                    setEditingNote(false);
                  }}
                  className="rounded px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  );
}

function Section({
  title,
  blurb,
  items,
  isAdmin,
  dimmed,
}: {
  title: string;
  blurb: string;
  items: ShelfItem[];
  isAdmin: boolean;
  dimmed?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl uppercase tracking-wide">
        {title}
        <span className="ml-2 text-sm font-normal normal-case tracking-normal text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
      <ul
        className={cn(
          "mt-3 divide-y divide-border rounded-md border border-border",
          // Not-yet-ripped rows sit on a dashed, recessed card so the split is
          // obvious at a glance rather than something you have to read for.
          dimmed && "border-dashed bg-muted/30"
        )}
      >
        {items.map((item) => (
          <DiscRow key={item.id} item={item} isAdmin={isAdmin} />
        ))}
      </ul>
    </section>
  );
}

export function ShelfClient({
  items,
  isAdmin,
}: {
  items: ShelfItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const unripped = items.filter((i) => i.jellyfin_id === null);
  const onServer = items.filter((i) => i.jellyfin_id !== null);

  return (
    <div className="mx-auto max-w-3xl pt-6">
      <h1 className="flex items-center gap-2 font-display text-3xl uppercase tracking-wide">
        <DiscIcon className="size-6" />
        Shelf
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Physical media. Tracked separately from the server — discs outlive
        re-encodes.
      </p>

      {isAdmin && <AddDiscSection onAdded={() => router.refresh()} />}

      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-16 text-center">
          <p className="font-display text-2xl uppercase">Nothing on the shelf</p>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Search above to add the first disc."
              : "No discs have been catalogued yet."}
          </p>
        </div>
      ) : (
        <>
          <Section
            title="Not ripped yet"
            blurb="Owned on disc, not on the server. This is the list that matters."
            items={unripped}
            isAdmin={isAdmin}
            dimmed
          />
          <Section
            title="On the server"
            blurb="Owned on disc and already ripped."
            items={onServer}
            isAdmin={isAdmin}
          />
        </>
      )}
    </div>
  );
}
