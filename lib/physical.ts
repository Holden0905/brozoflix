import type { DiscFormat, MediaType } from "@/lib/types";

export const DISC_FORMATS = ["dvd", "bluray", "uhd"] as const;

export const FORMAT_LABELS: Record<DiscFormat, string> = {
  dvd: "DVD",
  bluray: "Blu-ray",
  uhd: "4K UHD",
};

/** Abbreviated for grid tiles, where a poster corner is all the room there is. */
export const FORMAT_SHORT: Record<DiscFormat, string> = {
  dvd: "DVD",
  bluray: "BD",
  uhd: "4K",
};

export const NOTE_MAX_LEN = 200;

/**
 * How a library title is owned. "digital" is derived, never stored — it just
 * means the title is on the server with no physical_media row behind it, so
 * the four states stay mutually exclusive and exhaustive by construction.
 */
export type OwnershipState = DiscFormat | "digital";

/** Best format first — the order the filter and any listing should use. */
export const OWNERSHIP_ORDER: readonly OwnershipState[] = [
  "uhd",
  "bluray",
  "dvd",
  "digital",
] as const;

export const OWNERSHIP_LABELS: Record<OwnershipState, string> = {
  uhd: "4K UHD",
  bluray: "Blu-ray",
  dvd: "DVD",
  digital: "Digital only",
};

/** Grid-scale labels. Kept as words, not colour alone, so the badge still
 *  reads correctly for a colourblind viewer or in a screenshot. */
export const OWNERSHIP_SHORT: Record<OwnershipState, string> = {
  uhd: "4K",
  bluray: "BD",
  dvd: "DVD",
  digital: "Digital",
};

export function ownershipState(
  format: DiscFormat | null | undefined
): OwnershipState {
  return format ?? "digital";
}

export function isDiscFormat(value: unknown): value is DiscFormat {
  return (
    typeof value === "string" && (DISC_FORMATS as readonly string[]).includes(value)
  );
}

/**
 * physical_media joins to titles on (media_type, tmdb_id) — never jellyfin_id,
 * which a disc may not have. Both sides must build the key the same way.
 */
export function discKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}
