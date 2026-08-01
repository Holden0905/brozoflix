import Image from "next/image";
import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/format";

interface PosterProps {
  path: string | null;
  title: string;
  size?: "w500" | "w780";
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * A 2:3 poster tile. Neutral dark placeholder behind the image so the grid
 * doesn't pop as posters lazy-load; falls back to the title in display type
 * when there's no poster at all.
 */
export function Poster({
  path,
  title,
  size = "w500",
  sizes = "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw",
  priority = false,
  className,
}: PosterProps) {
  const src = posterUrl(path, size);
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted",
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={`${title} poster`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center">
          <span className="font-display text-sm uppercase leading-tight text-muted-foreground">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
