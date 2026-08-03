import { Badge } from "@/components/ui/badge";
import { FORMAT_LABELS, FORMAT_SHORT } from "@/lib/physical";
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
export function DiscBadge({
  format,
  className,
}: {
  format: DiscFormat;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 border-border text-foreground", className)}
    >
      <DiscIcon />
      {FORMAT_LABELS[format]}
    </Badge>
  );
}

/** Poster-corner variant: a grid tile has no room for the full label. */
export function DiscTileBadge({ format }: { format: DiscFormat }) {
  return (
    <span
      className="pointer-events-none absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-background/85 px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground backdrop-blur"
      title={`On disc — ${FORMAT_LABELS[format]}`}
    >
      <DiscIcon className="size-2.5" />
      {FORMAT_SHORT[format]}
    </span>
  );
}
