import { toStars } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAR_PATH =
  "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

/**
 * Stars are white-on-black, never red — red means exactly one thing in this
 * app ("it's on the server") and a 5-star rating must not read as that.
 */
function Glyph({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        "size-full",
        filled ? "fill-current stroke-none" : "fill-none stroke-current stroke-[1.5]"
      )}
    >
      <path d={STAR_PATH} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One star at `fill` 0, 0.5 or 1. The half is a solid glyph clipped to the
 * left half — the inner span is widened by the inverse so the glyph itself
 * isn't squashed, only revealed. Fill colour is inherited so callers can dim
 * the whole row; the empty outline sets its own muted colour.
 */
export function Star({ fill, className }: { fill: number; className?: string }) {
  return (
    <span className={cn("relative block", className)}>
      <span className="block size-full text-muted-foreground/50">
        <Glyph filled={false} />
      </span>
      {fill > 0 && (
        <span
          className="absolute inset-y-0 left-0 overflow-hidden"
          style={{ width: `${fill * 100}%` }}
        >
          <span className="block h-full" style={{ width: `${100 / fill}%` }}>
            <Glyph filled />
          </span>
        </span>
      )}
    </span>
  );
}

/** How full star `n` (1-indexed) is at a given half-star value: 0, 0.5 or 1. */
export function fillFor(halfStars: number, n: number): number {
  return Math.max(0, Math.min(1, toStars(halfStars) - (n - 1)));
}

/** Read-only row of five stars for a stored half-star value. */
export function StarRow({
  halfStars,
  className,
  label,
}: {
  halfStars: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-foreground", className)}
      role="img"
      aria-label={label ?? `${toStars(halfStars)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} fill={fillFor(halfStars, n)} className="size-3.5" />
      ))}
    </span>
  );
}
