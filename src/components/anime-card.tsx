import { Link } from "react-router"

import type { Anime } from "@/api/anime"
import { getAnimeCoverImage, getAnimeTitle, getAnimeYear } from "@/lib/anime"
import { cn } from "@/lib/utils"

export function AnimeCard({ anime }: { anime: Anime }) {
  const title = getAnimeTitle(anime)
  const year = getAnimeYear(anime)
  const coverImage = getAnimeCoverImage(anime)
  const details = getAnimeDetails(anime, year)
  const genres = anime.genres?.slice(0, 3) ?? []

  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group -m-1.5 min-w-0 cursor-pointer rounded-xl p-1.5 outline-none"
    >
      <div className="min-w-0 transition-transform duration-200 ease-out group-hover:scale-[1.03] group-focus-visible:scale-[1.03]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-chart-2 shadow-sm transition-shadow duration-200 group-hover:shadow-xl group-focus-visible:shadow-xl">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-105 group-hover:blur-sm group-focus-visible:scale-105 group-focus-visible:blur-sm"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-chart-2 transition duration-200 ease-out group-hover:scale-105 group-hover:blur-sm group-focus-visible:scale-105 group-focus-visible:blur-sm" />
          )}

          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-background/95 via-background/70 to-background/20 p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground">
              {title}
            </h3>

            {details.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {details.map((detail) => (
                  <span
                    key={detail}
                    className="rounded-full bg-foreground/10 px-2 py-1 text-[10px] font-medium leading-none text-foreground"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            )}

            {genres.length > 0 && (
              <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-snug text-foreground/90">
                {genres.join(", ")}
              </p>
            )}

            {anime.description && (
              <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-muted-foreground">
                {anime.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <h2 className="truncate text-lg font-bold leading-none text-foreground">
            {title}
          </h2>

          <div className="mt-1 flex items-center justify-between gap-3 text-sm leading-none text-muted-foreground">
            <span className="min-w-0 truncate">{anime.format || "Аниме"}</span>
            {year && <span className="shrink-0">{year}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export function AnimeGridSkeleton({
  count = 10,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="min-w-0">
          <div className="aspect-[2/3] animate-pulse rounded-lg bg-chart-2/70" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function getAnimeDetails(anime: Anime, year?: number) {
  return [
    anime.format,
    anime.status,
    year ? String(year) : undefined,
    anime.episodes ? `${anime.episodes} эп.` : undefined,
    anime.duration ? `${anime.duration} мин.` : undefined,
  ].filter(Boolean)
}
