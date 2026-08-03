"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NameControl } from "@/components/name-control";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SearchResult, TitleRequest } from "@/lib/types";

// Superseded by the brozoflix_name cookie, which the server can also read.
// Still read once so anyone who already typed their name here keeps it.
const NAME_KEY = "brozoflix:name";

function thumb(path: string | null): string | null {
  return path ? `https://image.tmdb.org/t/p/w154${path}` : null;
}

function OwnedBadge() {
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

function PosterThumb({ path, title }: { path: string | null; title: string }) {
  const src = thumb(path);
  return (
    <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded bg-muted sm:w-14">
      {src && (
        <Image src={src} alt={`${title} poster`} fill sizes="56px" className="object-cover" />
      )}
    </div>
  );
}

/* ---------- search + request flow ---------- */

function SearchSection({
  initialQuery,
  viewerName,
  onRequested,
}: {
  initialQuery: string;
  viewerName: string | null;
  onRequested: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [locallyRequested, setLocallyRequested] = useState<Set<string>>(new Set());
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

  const keyOf = (r: SearchResult) => `${r.media_type}:${r.tmdb_id}`;

  return (
    <section aria-label="Search for something to request">
      <label htmlFor="wanted-search" className="sr-only">
        Search movies and shows
      </label>
      <Input
        id="wanted-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Search for a movie or show to request…"
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
              TMDB has nothing for “{query.trim()}”. Check the spelling?
            </li>
          )}
          {results.map((r) => {
            const key = keyOf(r);
            const isPicked =
              picked && picked.tmdb_id === r.tmdb_id && picked.media_type === r.media_type;
            const alreadySent = locallyRequested.has(key);
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
                  {r.owned && r.jellyfin_id ? (
                    <Link
                      href={`/title/${r.jellyfin_id}`}
                      className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
                      aria-label={`${r.title} is already in the library — view it`}
                    >
                      <OwnedBadge />
                    </Link>
                  ) : alreadySent ? (
                    <Badge variant="secondary" className="shrink-0">
                      Requested ✓
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={isPicked ? "secondary" : "default"}
                      onClick={() => setPicked(isPicked ? null : r)}
                    >
                      {isPicked ? "Cancel" : "Request"}
                    </Button>
                  )}
                </div>
                {isPicked && !alreadySent && (
                  <RequestForm
                    result={r}
                    viewerName={viewerName}
                    onDone={(sent) => {
                      setPicked(null);
                      if (sent) {
                        setLocallyRequested((prev) => new Set(prev).add(key));
                        onRequested();
                      }
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RequestForm({
  result,
  viewerName,
  onDone,
}: {
  result: SearchResult;
  viewerName: string | null;
  onDone: (sent: boolean) => void;
}) {
  const [name, setName] = useState(viewerName ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (viewerName) return; // the cookie is the source of truth
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      // localStorage unavailable (private mode) — start blank
    }
  }, [viewerName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: result.media_type,
          tmdb_id: result.tmdb_id,
          title: result.title,
          year: result.year,
          poster_path: result.poster_path,
          requested_by: trimmed,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Couldn't save the request. Try again.");
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem(NAME_KEY, trimmed);
      } catch {
        // fine — they'll type it again next time
      }
      if (data.deduped) {
        setConfirmation(
          data.first_requested_by
            ? `${data.first_requested_by} beat you to it — your note was added to theirs.`
            : "Already on the list — your note was added."
        );
      } else if (data.owned) {
        setConfirmation("Turns out it's already on the server.");
      } else {
        setConfirmation("On the list.");
      }
      setTimeout(() => onDone(true), 1200);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setBusy(false);
    }
  }

  if (confirmation) {
    return (
      <p aria-live="polite" className="mt-3 text-sm font-medium">
        {confirmation}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="req-name" className="sr-only">
            Your name
          </label>
          <Input
            id="req-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Who's asking?"
            maxLength={40}
            required
            autoFocus={!name}
            className="h-10 text-base"
          />
        </div>
        <div className="flex-[2]">
          <label htmlFor="req-note" className="sr-only">
            Note (optional)
          </label>
          <Textarea
            id="req-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional) — e.g. the 1948 one, not the remake"
            maxLength={200}
            rows={1}
            className="min-h-10 text-base"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !name.trim()}>
          {busy ? "Sending…" : `Request ${result.media_type === "show" ? "show" : "movie"}`}
        </Button>
        <p aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      </div>
    </form>
  );
}

/* ---------- the list ---------- */

function StatusBadge({ status }: { status: TitleRequest["status"] }) {
  if (status === "added") {
    return <Badge className="shrink-0 bg-owned text-owned-foreground">On the server</Badge>;
  }
  if (status === "declined") {
    return (
      <Badge variant="outline" className="shrink-0 text-muted-foreground">
        Declined
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0">
      Wanted
    </Badge>
  );
}

function AdminControls({ request }: { request: TitleRequest }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  async function call(method: "PATCH" | "DELETE", action?: "decline" | "undecline") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method,
        ...(action
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            }
          : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "That didn't work.");
        setBusy(false);
        return;
      }
      router.refresh();
      setBusy(false);
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  const buttonClass =
    "h-7 rounded px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1";

  return (
    <div className="mt-2 flex items-center justify-end gap-1">
      {error && <span className="mr-auto text-xs text-destructive">{error}</span>}
      {request.status === "requested" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => call("PATCH", "decline")}
          className={buttonClass}
        >
          Mark declined
        </button>
      )}
      {request.status === "declined" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => call("PATCH", "undecline")}
          className={buttonClass}
        >
          Restore
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (confirmingDelete) {
            call("DELETE");
          } else {
            setConfirmingDelete(true);
          }
        }}
        className={cn(
          buttonClass,
          confirmingDelete && "bg-foreground text-background hover:text-background"
        )}
      >
        {confirmingDelete ? "Really delete?" : "Delete"}
      </button>
    </div>
  );
}

function RequestList({
  requests,
  isAdmin,
}: {
  requests: TitleRequest[];
  isAdmin: boolean;
}) {
  if (requests.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nothing on the list yet. Search above — ask and ye shall (probably) receive.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {requests.map((r) => (
        <li key={r.id} className="p-3">
          <div
            className={cn(
              "flex items-center gap-3",
              r.status === "declined" && "opacity-60"
            )}
          >
            <PosterThumb path={r.poster_path} title={r.title ?? "Untitled"} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {r.title ?? "Untitled"}
                {r.year && (
                  <span className="ml-1.5 text-sm text-muted-foreground">{r.year}</span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {r.media_type === "show" ? "Show" : "Movie"} · asked by {r.requested_by}
                {r.created_at &&
                  ` · ${new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(r.created_at))}`}
              </p>
              {r.note && (
                <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-xs text-muted-foreground/80">
                  {r.note}
                </p>
              )}
            </div>
            <StatusBadge status={r.status} />
          </div>
          {isAdmin && <AdminControls request={r} />}
        </li>
      ))}
    </ul>
  );
}

/* ---------- page shell ---------- */

export function WantedClient({
  requests,
  initialQuery,
  isAdmin,
  viewerName,
}: {
  requests: TitleRequest[];
  initialQuery: string;
  isAdmin: boolean;
  viewerName: string | null;
}) {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl pt-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">Wanted</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Not on the server? Put it on the list.
      </p>
      <NameControl name={viewerName} verb="You're" className="mt-1" />
      <div className="mt-5">
        <SearchSection
          initialQuery={initialQuery}
          viewerName={viewerName}
          onRequested={() => router.refresh()}
        />
      </div>
      <h2 className="mt-10 font-display text-xl uppercase tracking-wide">The list</h2>
      <div className="mt-3">
        <RequestList requests={requests} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
