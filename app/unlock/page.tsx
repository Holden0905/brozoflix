import type { Metadata } from "next";
import { Suspense } from "react";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = { title: "Unlock" };

export default function UnlockPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <h1 className="font-display text-5xl uppercase tracking-wide sm:text-6xl">
        Brozoflix
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Family screening room. Say the magic words.
      </p>
      <Suspense>
        <UnlockForm />
      </Suspense>
    </main>
  );
}
