import Image from "next/image";

/** Small list-row poster. TMDB's w154 is the smallest size that stays sharp. */
export function PosterThumb({
  path,
  title,
  className,
}: {
  path: string | null;
  title: string;
  className?: string;
}) {
  const src = path ? `https://image.tmdb.org/t/p/w154${path}` : null;
  return (
    <div
      className={`relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded bg-muted sm:w-14 ${className ?? ""}`}
    >
      {src && (
        <Image src={src} alt={`${title} poster`} fill sizes="56px" className="object-cover" />
      )}
    </div>
  );
}
