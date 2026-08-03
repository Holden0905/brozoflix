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
