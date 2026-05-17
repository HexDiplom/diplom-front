import { useMemo } from "react"

import type { Anime } from "@/api/anime"
import { Button } from "@/components/ui/button"
import { useInfiniteAnimeList } from "@/hooks/use-anime-list"

const ANIME_PAGE_SIZE = 5

import { AnimeCard } from "@/components/anime/anime-card"

export default function Home() {
  const queryParams = useMemo(
    () => ({
      limit: ANIME_PAGE_SIZE,
      sortBy: "createdAt" as const,
      sortOrder: "desc" as const,
    }),
    [],
  )

  const {
    data: animeResponse,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useInfiniteAnimeList(queryParams)

  const animeList = useMemo(() => {
    const animeById = new Map<number, Anime>()

    animeResponse?.pages.forEach((page) => {
      page.data.forEach((anime) => {
        animeById.set(anime.id, anime)
      })
    })

    return Array.from(animeById.values())
  }, [animeResponse])

  const hasAnime = animeList.length > 0
  const isInitialLoading = isPending && !hasAnime
  const canLoadMore = Boolean(hasNextPage)

  function handleLoadMore() {
    if (!canLoadMore || isFetchingNextPage) {
      return
    }

    fetchNextPage()
  }

  return (
    <div className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-5xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">
          Новинки
        </h1>

        {isInitialLoading ? (
          <AnimeGridSkeleton />
        ) : isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Не удалось загрузить новинки: {error.message}
          </div>
        ) : hasAnime ? (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5">
              {animeList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            {canLoadMore && (
              <div className="mt-7 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  className="rounded-full"
                >
                  {isFetchingNextPage ? "Загрузка..." : "Показать ещё"}
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Новинок пока нет</p>
        )}
      </section>
    </div>
  )
}

function AnimeCard({ anime }: { anime: Anime }) {
  const title = getAnimeTitle(anime)
  const year = getAnimeYear(anime)
  const coverImage = getAnimeCoverImage(anime)
  const details = getAnimeDetails(anime, year)
  const genres = anime.genres?.slice(0, 3) ?? []

  return (
    <article
      className="group -m-1.5 min-w-0 cursor-pointer rounded-xl p-1.5 outline-none"
      tabIndex={0}
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
    </article>
  )
}

function getAnimeTitle(anime: Anime) {
  return (
    anime.title.russian ||
    anime.title.romaji ||
    anime.title.english ||
    "Без названия"
  )
}

function getAnimeYear(anime: Anime) {
  return anime.seasonYear || anime.startDateYear || anime.endDateYear
}

function getAnimeCoverImage(anime: Anime) {
  return (
    anime.coverImage?.large ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.medium ||
    anime.coverImage?.original
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

function AnimeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: ANIME_PAGE_SIZE }).map((_, index) => (
        <div key={index} className="min-w-0">
          <div className="aspect-[2/3] animate-pulse rounded-lg bg-chart-2/70" />
          <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
