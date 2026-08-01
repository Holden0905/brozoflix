"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UnlockForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (res.ok) {
        const next = params.get("next");
        const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
        router.replace(dest);
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "That passphrase didn't match.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 flex w-full max-w-xs flex-col gap-3">
      <label htmlFor="passphrase" className="sr-only">
        Passphrase
      </label>
      <Input
        id="passphrase"
        type="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Passphrase"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        className="h-11 text-center"
      />
      <Button type="submit" disabled={busy || !passphrase} className="h-11">
        {busy ? "Checking…" : "Unlock"}
      </Button>
      <p aria-live="polite" className="min-h-5 text-center text-sm text-muted-foreground">
        {error}
      </p>
    </form>
  );
}
