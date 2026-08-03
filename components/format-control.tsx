"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DiscIcon } from "@/components/disc-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DISC_FORMATS, FORMAT_LABELS, NOTE_MAX_LEN } from "@/lib/physical";
import { cn } from "@/lib/utils";
import type { DiscFormat, MediaType, PhysicalMedia } from "@/lib/types";

/**
 * Admin-only disc editor. Keys on media_type + tmdb_id, so it works the same
 * whether or not the title is on the server.
 */
export function FormatControl({
  mediaType,
  tmdbId,
  title,
  year,
  posterPath,
  initial,
  onChanged,
}: {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  year: number | null;
  posterPath: string | null;
  initial: PhysicalMedia | null;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [format, setFormat] = useState<DiscFormat | null>(initial?.format ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [savedNote, setSavedNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function write(next: DiscFormat | null, nextNote: string) {
    setBusy(true);
    setError(null);
    try {
      const res =
        next === null
          ? await fetch(
              `/api/physical?media_type=${encodeURIComponent(mediaType)}&tmdb_id=${tmdbId}`,
              { method: "DELETE" }
            )
          : await fetch("/api/physical", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                media_type: mediaType,
                tmdb_id: tmdbId,
                format: next,
                title,
                year,
                poster_path: posterPath,
                note: nextNote.trim() || undefined,
              }),
            });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "That didn't work.");
        setBusy(false);
        return;
      }
      setFormat(next);
      // Dropping the disc drops its note with it — the row is gone.
      const settled = next === null ? "" : nextNote.trim();
      setNote(settled);
      setSavedNote(settled);
      setBusy(false);
      onChanged?.();
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  const options: { value: DiscFormat | null; label: string }[] = [
    { value: null, label: "None" },
    ...DISC_FORMATS.map((f) => ({ value: f as DiscFormat, label: FORMAT_LABELS[f] })),
  ];

  return (
    <section aria-labelledby="disc-heading" className="border-t border-border pt-5">
      <h2
        id="disc-heading"
        className="flex items-center gap-2 font-display text-lg uppercase tracking-wide"
      >
        <DiscIcon className="size-4" />
        On disc
      </h2>

      <div
        role="group"
        aria-label="Disc format"
        className="mt-2 flex w-fit flex-wrap rounded-md border border-border p-0.5"
      >
        {options.map((opt) => {
          const active = format === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={busy}
              aria-pressed={active}
              onClick={() => write(opt.value, note)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {format !== null && (
        <div className="mt-3 max-w-md">
          <label htmlFor="disc-note" className="text-sm text-muted-foreground">
            Note
          </label>
          <Textarea
            id="disc-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Box set, steelbook, disc 2 is scratched…"
            maxLength={NOTE_MAX_LEN}
            rows={2}
            className="mt-1 text-base"
          />
          {note.trim() !== savedNote.trim() && (
            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => write(format, note)}
              >
                {busy ? "Saving…" : "Save note"}
              </Button>
              <button
                type="button"
                onClick={() => setNote(savedNote)}
                className="rounded px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <p aria-live="polite" className="mt-1 min-h-5 text-sm text-destructive">
        {error}
      </p>
    </section>
  );
}
