import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 pt-safe pb-safe text-center">
      <p className="font-display text-4xl uppercase">Not here</p>
      <p className="text-muted-foreground">That title isn&apos;t in the library.</p>
      <Link
        href="/"
        className="mt-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Back to the library
      </Link>
    </main>
  );
}
