import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { NAME_COOKIE, identityKey, validateName } from "@/lib/identity";
import { groupRaters } from "@/lib/people";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const [{ data, error }, cookieStore] = await Promise.all([
    db.from("ratings").select("rated_by, created_at"),
    cookies(),
  ]);
  if (error) {
    throw new Error(`Failed to load people: ${error.message}`);
  }

  const people = groupRaters(data ?? []);
  const viewerName = validateName(cookieStore.get(NAME_COOKIE)?.value);
  const viewerKey = viewerName ? identityKey(viewerName) : null;

  return (
    <div className="mx-auto max-w-3xl pt-6">
      <h1 className="font-display text-3xl uppercase tracking-wide">People</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everyone who&apos;s rated something.
      </p>

      {people.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-md border border-dashed border-border py-16 text-center">
          <p className="font-display text-2xl uppercase">Nobody yet</p>
          <p className="text-sm text-muted-foreground">
            No one has rated anything. Someone has to go first.
          </p>
          <Link
            href="/"
            className="mt-1 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Browse the library →
          </Link>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-border rounded-md border border-border">
          {people.map((p) => (
            <li key={p.key}>
              <Link
                href={`/people/${encodeURIComponent(p.key)}`}
                className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <span className="min-w-0 truncate font-medium">
                  {p.name}
                  {p.key === viewerKey && (
                    <span className="font-normal text-muted-foreground"> (you)</span>
                  )}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                  {p.count} {p.count === 1 ? "title" : "titles"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
