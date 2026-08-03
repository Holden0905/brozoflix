"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NAME_MAX_LEN } from "@/lib/identity";
import { cn } from "@/lib/utils";

/**
 * "You're rating as Brian — not you?" Lives wherever the name is actually
 * being used, so changing it is always one tap from the thing it affects.
 */
export function NameControl({
  name,
  verb,
  className,
}: {
  name: string | null;
  verb: string;
  className?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "Couldn't save that name.");
        setBusy(false);
        return;
      }
      setEditing(false);
      setBusy(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className={cn("flex flex-wrap items-center gap-2", className)}>
        <label htmlFor="identity-name" className="sr-only">
          Your name
        </label>
        <Input
          id="identity-name"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Your name"
          maxLength={NAME_MAX_LEN}
          autoFocus
          className="h-9 w-40 text-base"
        />
        <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setDraft(name ?? "");
            setError(null);
          }}
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

  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {name ? (
        <>
          {verb} <span className="font-medium text-foreground">{name}</span>
          {" · "}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
          >
            Not you?
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
        >
          Set your name
        </button>
      )}
    </p>
  );
}
