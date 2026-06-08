import { useMemo } from "react"
import { Play } from "lucide-react"
import { Link } from "react-router"

import type { Anime } from "@/api/anime"
import type { ContinueWatchingItem } from "@/api/user-activity"
import { Button } from "@/components/ui/button"
import { useInfiniteAnimeList } from "@/hooks/use-anime-list"
import { useContinueWatching } from "@/hooks/use-user-activity"
import { authClient } from "@/lib/auth-client"

const ANIME_PAGE_SIZE = 5

export default function Home() {
  const { data: session } = authClient.useSession()
  const continueQuery = useContinueWatching(Boolean(session?.user))
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
      {continueQuery.data?.data[0] && (
        <ContinueWatchingBanner item={continueQuery.data.data[0]} />
      )}

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

function ContinueWatchingBanner({ item }: { item: ContinueWatchingItem }) {
  const title = getAnimeTitle(item.anime)
  const backdrop =
    item.anime.bannerImage ||
    item.episode.thumbnailUrl ||
    item.anime.coverImage?.extraLarge ||
    item.anime.coverImage?.large ||
    item.anime.coverImage?.original
  const durationSeconds =
    item.episode.duration && /^\d+$/.test(item.episode.duration)
      ? Number(item.episode.duration) * 60
      : 0
  const progress = durationSeconds
    ? Math.min((item.positionSeconds / durationSeconds) * 100, 100)
    : 0

  return (
    <section className="relative mx-auto mb-10 min-h-64 w-full max-w-5xl overflow-hidden rounded-4xl border bg-card shadow-xl">
      {backdrop && (
        <img src={backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20" />
      <div className="relative flex min-h-64 max-w-xl flex-col justify-end p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">
          Продолжить просмотр
        </p>
        <h1 className="mt-2 line-clamp-2 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-white/70">
          Эпизод {item.episode.number}
          {item.episode.name ? ` · ${item.episode.name}` : ""}
        </p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
        <Button asChild className="mt-5 w-fit rounded-full bg-white text-black hover:bg-white/85">
          <Link to={`/anime/${item.anime.id}/watch?episode=${encodeURIComponent(item.episode.id)}`}>
            <Play className="size-4 fill-current" />
            Продолжить просмотр
          </Link>
        </Button>
      </div>
    </section>
  )
}

function AnimeCard({ anime }: { anime: Anime }) {
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

function getAnimeTitle(anime: Anime) {
  return (
    anime.title.russian ||
    anime.title.romaji ||
    anime.title.english ||
    "Без названия"
  )
}

function getAnimeYear(anime: Anime) {
  return anime.seasonYear || anime.startDateYear || anime.endDateYear || undefined
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
