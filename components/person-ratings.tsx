"use client";

import { useMemo, useState } from "react";
import { TitleGrid, type GridTitle } from "@/components/title-grid";
import { sortKey } from "@/lib/format";

/** Every title here is one this person rated, so `rating` is never null. */
export type PersonTitle = GridTitle & { rated_at: string };

type Sort = "recent" | "rating" | "title";

export function PersonRatings({ titles }: { titles: PersonTitle[] }) {
  const [sort, setSort] = useState<Sort>("recent");

  const sorted = useMemo(() => {
    const out = [...titles];
    if (sort === "title") {
      out.sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title)));
    } else if (sort === "rating") {
      out.sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) ||
          sortKey(a.title).localeCompare(sortKey(b.title))
      );
    } else {
      out.sort(
        (a, b) =>
          new Date(b.rated_at).getTime() - new Date(a.rated_at).getTime() ||
          sortKey(a.title).localeCompare(sortKey(b.title))
      );
    }
    return out;
  }, [titles, sort]);

  return (
    <div>
      <div className="mt-5 flex items-center gap-2">
        <label htmlFor="person-sort" className="sr-only">
          Sort
        </label>
        <select
          id="person-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1"
        >
          <option value="recent">Recently rated</option>
          <option value="rating">Highest rated</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>
      <TitleGrid titles={sorted} />
    </div>
  );
}
