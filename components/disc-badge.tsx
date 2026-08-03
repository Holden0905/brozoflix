import { Badge } from "@/components/ui/badge";
import {
  FORMAT_LABELS,
  OWNERSHIP_LABELS,
  OWNERSHIP_SHORT,
  type OwnershipState,
} from "@/lib/physical";
import { cn } from "@/lib/utils";
import type { DiscFormat } from "@/lib/types";

export function DiscIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-3", className)}>
      <circle cx="12" cy="12" r="8.5" className="fill-none stroke-current stroke-[1.75]" />
      <circle cx="12" cy="12" r="2.25" className="fill-current" />
    </svg>
  );
}

/**
 * Disc ownership reads as an outlined, icon-led chip — deliberately not the
 * filled red of `bg-owned`, which in this app means only "it's on the server".
 * The two can appear side by side, so they must not be confusable.
 */
const BADGE_STYLES: Record<DiscFormat, string> = {
  uhd: "bg-uhd text-uhd-foreground",
  bluray: "bg-bluray text-bluray-foreground",
  dvd: "bg-dvd text-dvd-foreground",
};

export function DiscBadge({
  format,
  className,
}: {
  format: DiscFormat;
  className?: string;
}) {
  return (
    <Badge className={cn("gap-1 border-transparent", BADGE_STYLES[format], className)}>
      <DiscIcon />
      {FORMAT_LABELS[format]}
    </Badge>
  );
}

/*
 * Grid-scale format chips. Solid light fills on the three disc states so they
 * carry at arm's length against a black grid; "digital only" is the one ghost
 * chip, which is right twice over — it's the absence of a disc, and it's the
 * state you're *not* looking for when you're stood in a shop.
 *
 * No disc icon here: at 11px the glyph costs more width than it earns, and
 * the colour already says "format".
 */
const TILE_STYLES: Record<OwnershipState, string> = {
  uhd: "bg-uhd text-uhd-foreground",
  bluray: "bg-bluray text-bluray-foreground",
  dvd: "bg-dvd text-dvd-foreground",
  digital: "border border-border/70 bg-background/80 text-muted-foreground backdrop-blur",
};

/** Poster-corner chip. Every library tile gets one — all four states. */
export function OwnershipTileBadge({ state }: { state: OwnershipState }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-1 top-1 rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none tracking-wide",
        TILE_STYLES[state]
      )}
      title={OWNERSHIP_LABELS[state]}
    >
      {OWNERSHIP_SHORT[state]}
    </span>
  );
}
