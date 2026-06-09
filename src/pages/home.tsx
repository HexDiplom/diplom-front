import { useMemo } from "react"
import { Play } from "lucide-react"
import { Link } from "react-router"

import type { Anime } from "@/api/anime"
import type { ContinueWatchingItem } from "@/api/user-activity"
import { AnimeCard, AnimeGridSkeleton } from "@/components/anime-card"
import { Button } from "@/components/ui/button"
import { useInfiniteAnimeList } from "@/hooks/use-anime-list"
import { useContinueWatching } from "@/hooks/use-user-activity"
import { authClient } from "@/lib/auth-client"
import { getAnimeTitle } from "@/lib/anime"

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
          <AnimeGridSkeleton count={ANIME_PAGE_SIZE} />
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
