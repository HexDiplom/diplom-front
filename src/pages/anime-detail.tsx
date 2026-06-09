import { useMemo, useState, type ReactNode } from "react"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Bookmark, Film, Loader2, Play, Star } from "lucide-react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import {
  getAnime,
  type Anime,
  type AnimeRelation,
  type AnimeTrailer,
  type Episode,
} from "@/api/anime"
import { addFavorite, deleteFavorite, deleteRating, setRating } from "@/api/user-activity"
import { Button } from "@/components/ui/button"
import {
  useAnimeDetail,
  useAnimeEpisodes,
  useAnimeRelations,
  useAnimeStudio,
  useAnimeTrailers,
} from "@/hooks/use-anime-detail"
import {
  useAnimeUserState,
  useWatchHistory,
  userActivityKeys,
} from "@/hooks/use-user-activity"
import { useAuthPrompt } from "@/hooks/use-auth-prompt"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const statusLabels: Record<string, string> = {
  FINISHED: "Завершено",
  RELEASING: "Выходит",
  NOT_YET_RELEASED: "Анонс",
  CANCELLED: "Отменено",
  HIATUS: "Приостановлено",
}

const formatLabels: Record<string, string> = {
  TV: "Сериал",
  TV_SHORT: "Короткий сериал",
  MOVIE: "Фильм",
  SPECIAL: "Спешл",
  OVA: "OVA",
  ONA: "ONA",
  OTHER: "Другое",
}

const sourceLabels: Record<string, string> = {
  ORIGINAL: "Оригинал",
  MANGA: "Манга",
  LIGHT_NOVEL: "Ранобэ",
  VISUAL_NOVEL: "Визуальная новелла",
  VIDEO_GAME: "Видеоигра",
  OTHER: "Другое",
}

const relationLabels: Record<string, string> = {
  SEQUEL: "Продолжение",
  PREQUEL: "Предыстория",
  ADAPTATION: "Адаптация",
  SIDE_STORY: "Побочная история",
  PARENT: "Основная история",
  CHARACTER: "Общие персонажи",
  SUMMARY: "Краткий пересказ",
  ALTERNATIVE: "Альтернативная версия",
  SPIN_OFF: "Спин-офф",
  OTHER: "Другое",
}

export default function AnimeDetailPage() {
  const { id } = useParams()
  const { data: session } = authClient.useSession()
  const { openAuthPrompt } = useAuthPrompt()
  const queryClient = useQueryClient()
  const validId = id && /^\d+$/.test(id) ? id : undefined
  const isAuthenticated = Boolean(session?.user)
  const animeQuery = useAnimeDetail(validId)
  useDocumentTitle(animeQuery.data ? getAnimeTitle(animeQuery.data) : "Аниме")

  const trailersQuery = useAnimeTrailers(validId)
  const relationsQuery = useAnimeRelations(validId)
  const episodesQuery = useAnimeEpisodes(validId)
  const userStateQuery = useAnimeUserState(validId, isAuthenticated)
  const historyQuery = useWatchHistory(isAuthenticated)
  const studioQuery = useAnimeStudio(animeQuery.data?.studioId)
  const progressByEpisode = useMemo(
    () =>
      new Map(
        (historyQuery.data?.data ?? [])
          .filter((item) => item.anime.id === Number(validId))
          .map((item) => [item.episode.id, item]),
      ),
    [historyQuery.data, validId],
  )
  const relations = relationsQuery.data?.data ?? []
  const relatedRelations = relations.filter(
    (relation) => relation.relatedAnimeId !== undefined,
  )
  const relatedAnimeQueries = useQueries({
    queries: relatedRelations.map((relation) => ({
      queryKey: ["anime", "detail", relation.relatedAnimeId],
      queryFn: () => getAnime(relation.relatedAnimeId ?? 0),
    })),
  })

  const relatedAnime = relatedRelations
    .map((relation, index) => ({
      relation,
      anime: relatedAnimeQueries[index]?.data,
    }))
    .filter(
      (item): item is { relation: AnimeRelation; anime: Anime } =>
        Boolean(item.anime),
    )

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!validId) {
        return
      }

      if (userStateQuery.data?.isFavorite) {
        await deleteFavorite(validId)
      } else {
        await addFavorite(validId)
      }
    },
    onSuccess: async () => {
      toast.success(
        userStateQuery.data?.isFavorite ? "Удалено из избранного" : "Добавлено в избранное",
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userActivityKeys.anime(validId ?? "") }),
        queryClient.invalidateQueries({ queryKey: userActivityKeys.favorites }),
      ])
    },
    onError: () => toast.error("Не удалось обновить избранное"),
  })

  const ratingMutation = useMutation({
    mutationFn: async (rating: number | null) => {
      if (!validId) {
        return
      }

      if (rating === null) {
        await deleteRating(validId)
      } else {
        await setRating(validId, rating)
      }
    },
    onSuccess: async (_, rating) => {
      toast.success(rating === null ? "Оценка удалена" : "Оценка сохранена")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userActivityKeys.anime(validId ?? "") }),
        queryClient.invalidateQueries({ queryKey: ["anime", "detail", validId] }),
      ])
    },
    onError: () => toast.error("Не удалось сохранить оценку"),
  })

  if (!validId) {
    return <PageError title="Некорректный адрес" text="ID аниме должен быть числом." />
  }

  if (animeQuery.isPending) {
    return <AnimePageSkeleton />
  }

  if (animeQuery.isError) {
    return <PageError title="Не удалось загрузить аниме" text={animeQuery.error.message} />
  }

  const anime = animeQuery.data
  const title = getAnimeTitle(anime)
  const cover = getAnimeCover(anime)
  const backdrop = anime.bannerImage || cover
  const facts = getAnimeFacts(anime)

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <Hero
        anime={anime}
        title={title}
        cover={cover}
        backdrop={backdrop}
        animeId={validId}
        isAuthenticated={isAuthenticated}
        isFavorite={Boolean(userStateQuery.data?.isFavorite)}
        userRating={userStateQuery.data?.userRating ?? null}
        isFavoritePending={favoriteMutation.isPending || userStateQuery.isPending}
        isRatingPending={ratingMutation.isPending}
        onAuthRequired={openAuthPrompt}
        onFavoriteToggle={() => favoriteMutation.mutate()}
        onRatingChange={(rating) =>
          ratingMutation.mutate(rating === userStateQuery.data?.userRating ? null : rating)
        }
        continueEpisodeId={userStateQuery.data?.continueWatching?.episode.id}
      />

      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-10 sm:px-6 lg:px-8">
        {anime.description && (
          <ContentSection title="Об аниме">
            <p className="max-w-5xl whitespace-pre-line text-sm leading-7 text-foreground/85 sm:text-base">
              {anime.description}
            </p>
          </ContentSection>
        )}

        {(facts.length > 0 || anime.studioId) && (
          <dl className="flex flex-wrap gap-2.5">
            {facts.map((fact) => (
              <CompactFact key={fact.label} label={fact.label} value={fact.value} />
            ))}
            {anime.studioId && (
              <CompactFact
                label="Студия"
                value={
                  <span className="flex items-center gap-2">
                    {studioQuery.data?.logo && (
                      <SafeImage
                        src={studioQuery.data.logo}
                        alt=""
                        className="size-5 rounded bg-white/90 object-contain p-0.5"
                      />
                    )}
                    Студия #{anime.studioId}
                  </span>
                }
              />
            )}
          </dl>
        )}

        {anime.tags && anime.tags.length > 0 && (
          <ContentSection title="Теги">
            <ChipList items={anime.tags} />
          </ContentSection>
        )}

        <EpisodeSection
          animeId={validId}
          episodes={episodesQuery.data?.pages.flatMap((page) => page.data) ?? []}
          fallbackImage={cover}
          isPending={episodesQuery.isPending}
          isError={episodesQuery.isError}
          errorText={episodesQuery.error?.message}
          hasMore={Boolean(episodesQuery.hasNextPage)}
          isLoadingMore={episodesQuery.isFetchingNextPage}
          onLoadMore={() => episodesQuery.fetchNextPage()}
          progressByEpisode={progressByEpisode}
        />

        <TrailerSection
          trailers={trailersQuery.data?.data ?? anime.trailers ?? []}
          isPending={trailersQuery.isPending}
          isError={trailersQuery.isError}
        />

        <RelatedSection
          items={relatedAnime}
          isPending={relationsQuery.isPending || relatedAnimeQueries.some((query) => query.isPending)}
        />
      </div>
    </div>
  )
}

function Hero({
  anime,
  title,
  cover,
  backdrop,
  animeId,
  isAuthenticated,
  isFavorite,
  userRating,
  isFavoritePending,
  isRatingPending,
  onAuthRequired,
  onFavoriteToggle,
  onRatingChange,
  continueEpisodeId,
}: {
  anime: Anime
  title: string
  cover?: string | null
  backdrop?: string | null
  animeId: string
  isAuthenticated: boolean
  isFavorite: boolean
  userRating: number | null
  isFavoritePending: boolean
  isRatingPending: boolean
  onAuthRequired: () => void
  onFavoriteToggle: () => void
  onRatingChange: (rating: number) => void
  continueEpisodeId?: string
}) {
  const heroFacts = [
    anime.format ? formatLabels[anime.format] || anime.format : undefined,
    anime.seasonYear || anime.startDateYear,
    anime.episodes ? `${anime.episodes} эп.` : undefined,
    anime.duration ? `${anime.duration} мин.` : undefined,
  ].filter(Boolean)

  return (
    <section className="relative isolate min-h-[34rem] overflow-hidden border-b">
      {backdrop ? (
        <SafeImage
          src={backdrop}
          alt=""
          className="absolute inset-0 -z-30 h-full w-full scale-105 object-cover blur-[2px]"
        />
      ) : (
        <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_20%_20%,var(--color-chart-3),transparent_35%),radial-gradient(circle_at_80%_10%,var(--color-chart-5),transparent_45%)]" />
      )}
      <div className="absolute inset-0 -z-20 bg-black/55" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/80 to-background/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-transparent to-transparent" />

      <div className="mx-auto grid min-h-[34rem] w-full max-w-7xl items-end gap-8 px-4 py-10 sm:px-6 md:grid-cols-[15rem_minmax(0,1fr)] md:items-center lg:px-8">
        <div className="hidden md:block">
          {cover ? (
            <SafeImage
              src={cover}
              alt={title}
              className="aspect-[2/3] w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/15"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center rounded-3xl bg-card/80 text-muted-foreground shadow-2xl ring-1 ring-white/10">
              <Film className="size-12" />
            </div>
          )}
        </div>

        <div className="max-w-3xl pb-4 md:pb-0">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {statusLabels[anime.status] || anime.status}
            </Badge>
            {anime.isAdult && <Badge className="border-destructive/50 text-destructive">18+</Badge>}
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {heroFacts.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-white/80">
              {heroFacts.map((fact) => (
                <span key={String(fact)}>{fact}</span>
              ))}
            </div>
          )}

          {anime.genres && anime.genres.length > 0 && (
            <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-white/70">
              {anime.genres.join(" · ")}
            </p>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7 shadow-xl">
              <Link
                to={
                  continueEpisodeId
                    ? `/anime/${animeId}/watch?episode=${encodeURIComponent(continueEpisodeId)}`
                    : `/anime/${animeId}/watch`
                }
              >
                <Play className="size-5 fill-current" />
                {continueEpisodeId ? "Продолжить" : "Смотреть"}
              </Link>
            </Button>
            <Button
              type="button"
              size="lg"
              variant={isFavorite ? "secondary" : "outline"}
              disabled={isAuthenticated && isFavoritePending}
              className="rounded-full border-white/25 bg-black/25 px-6 text-white backdrop-blur hover:bg-white/15 hover:text-white"
              onClick={isAuthenticated ? onFavoriteToggle : onAuthRequired}
            >
              {isFavoritePending && isAuthenticated ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Bookmark className={cn("size-5", isFavorite && "fill-current")} />
              )}
              {isFavorite ? "В избранном" : "В избранное"}
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <StarRating
              value={userRating}
              disabled={isRatingPending}
              onChange={isAuthenticated ? onRatingChange : () => onAuthRequired()}
            />
            <p className="text-xs font-medium text-white/70">
              {anime.averageRating === null || anime.averageRating === undefined
                ? "Пока нет оценок"
                : `${formatRating(anime.averageRating / 2)} из 5 · ${anime.ratingCount ?? 0} оценок`}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function EpisodeSection({
  animeId,
  episodes,
  fallbackImage,
  isPending,
  isError,
  errorText,
  hasMore,
  isLoadingMore,
  onLoadMore,
  progressByEpisode,
}: {
  animeId: string
  episodes: Episode[]
  fallbackImage?: string | null
  isPending: boolean
  isError: boolean
  errorText?: string
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  progressByEpisode: Map<string, { positionSeconds: number; completed: boolean }>
}) {
  const uniqueEpisodes = useMemo(
    () => Array.from(new Map(episodes.map((episode) => [episode.id, episode])).values()),
    [episodes],
  )

  if (isPending) {
    return (
      <ContentSection title="Эпизоды">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="aspect-video animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </ContentSection>
    )
  }

  if (isError) {
    return (
      <ContentSection title="Эпизоды">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-sm text-destructive">
          {errorText || "Не удалось загрузить эпизоды."}
        </div>
      </ContentSection>
    )
  }

  if (uniqueEpisodes.length === 0) {
    return null
  }

  return (
    <ContentSection title="Эпизоды">
      <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {uniqueEpisodes.map((episode) => (
          <Link
            key={episode.id}
            to={`/anime/${animeId}/watch?episode=${encodeURIComponent(episode.id)}`}
            className="group min-w-0 rounded-2xl outline-none"
          >
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border transition group-hover:-translate-y-0.5 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-ring">
              <EpisodeArtwork episode={episode} fallbackImage={fallbackImage} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              <span className="absolute inset-0 m-auto flex size-12 scale-90 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-xl transition group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                <Play className="size-5 fill-current" />
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-white">
                <span className="text-sm font-bold">Эпизод {episode.number}</span>
                {episode.duration && (
                  <span className="rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold backdrop-blur">
                    {formatEpisodeDuration(episode.duration)}
                  </span>
                )}
              </div>
              {episode.isFiller && (
                <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-black">
                  Филлер
                </span>
              )}
              <EpisodeProgress
                episode={episode}
                progress={progressByEpisode.get(episode.id)}
              />
            </div>
            <p className="mt-2 truncate text-sm font-semibold">
              {episode.name || `Эпизод ${episode.number}`}
            </p>
          </Link>
        ))}
      </div>

      {hasMore && (
        <Button
          type="button"
          variant="secondary"
          className="mt-6 rounded-full"
          disabled={isLoadingMore}
          onClick={onLoadMore}
        >
          {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
          {isLoadingMore ? "Загрузка..." : "Показать ещё"}
        </Button>
      )}
    </ContentSection>
  )
}

function EpisodeProgress({
  episode,
  progress,
}: {
  episode: Episode
  progress?: { positionSeconds: number; completed: boolean }
}) {
  if (!progress) {
    return null
  }

  const durationSeconds =
    episode.duration && /^\d+$/.test(episode.duration) ? Number(episode.duration) * 60 : 0
  const percent = progress.completed
    ? 100
    : durationSeconds > 0
      ? Math.min((progress.positionSeconds / durationSeconds) * 100, 100)
      : 0

  return (
    <>
      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
        {progress.completed ? "Просмотрено" : `С ${formatProgressTime(progress.positionSeconds)}`}
      </span>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
        <div className="h-full bg-primary-foreground" style={{ width: `${percent}%` }} />
      </div>
    </>
  )
}

function StarRating({
  value,
  disabled,
  onChange,
}: {
  value: number | null
  disabled: boolean
  onChange: (rating: number) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const displayed = hovered ?? value ?? 0

  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={value ? `Ваша оценка: ${formatRating(value / 2)} из 5` : "Поставить оценку"}
      onPointerLeave={() => setHovered(null)}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = (index + 1) * 2
        const fill = displayed >= starValue ? 100 : displayed === starValue - 1 ? 50 : 0

        return (
          <span key={starValue} className="relative inline-block size-7 shrink-0">
            <Star className="absolute inset-0 size-7 text-white/35" />
            <span className="pointer-events-none absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star className="size-7 fill-amber-300 text-amber-300" />
            </span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`${index + 0.5} из 5`}
              className="absolute inset-y-0 left-0 w-1/2 disabled:cursor-wait"
              onPointerEnter={() => setHovered(starValue - 1)}
              onFocus={() => setHovered(starValue - 1)}
              onBlur={() => setHovered(null)}
              onClick={() => onChange(starValue - 1)}
            />
            <button
              type="button"
              disabled={disabled}
              aria-label={`${index + 1} из 5`}
              className="absolute inset-y-0 right-0 w-1/2 disabled:cursor-wait"
              onPointerEnter={() => setHovered(starValue)}
              onFocus={() => setHovered(starValue)}
              onBlur={() => setHovered(null)}
              onClick={() => onChange(starValue)}
            />
          </span>
        )
      })}
    </div>
  )
}

function EpisodeArtwork({
  episode,
  fallbackImage,
}: {
  episode: Episode
  fallbackImage?: string | null
}) {
  const [failedSources, setFailedSources] = useState<string[]>([])
  const source = [episode.thumbnailUrl, fallbackImage].find(
    (candidate): candidate is string => Boolean(candidate) && !failedSources.includes(candidate as string),
  )

  if (!source) {
    return <div className="h-full w-full bg-gradient-to-br from-chart-2 via-chart-4 to-background" />
  }

  return (
    <img
      src={source}
      alt=""
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      onError={() => setFailedSources((current) => [...current, source])}
    />
  )
}

function ContentSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {children}
    </section>
  )
}

function TrailerSection({
  trailers,
  isPending,
  isError,
}: {
  trailers: AnimeTrailer[]
  isPending: boolean
  isError: boolean
}) {
  if (isPending) {
    return (
      <ContentSection title="Трейлеры">
        <div className="aspect-video max-w-lg animate-pulse rounded-3xl bg-muted" />
      </ContentSection>
    )
  }

  if (isError || trailers.length === 0) {
    return null
  }

  return (
    <ContentSection title="Трейлеры">
      <div className="grid gap-4 sm:grid-cols-2">
        {trailers.map((trailer, index) => (
          <a
            key={String(trailer.id ?? trailer.trailerId ?? index)}
            href={trailer.videoUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "group relative aspect-video overflow-hidden rounded-3xl border bg-card shadow-sm",
              !trailer.videoUrl && "pointer-events-none",
            )}
          >
            {trailer.thumbnailUrl ? (
              <SafeImage
                src={trailer.thumbnailUrl}
                alt={`Трейлер ${index + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-chart-3 to-chart-5" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/45">
              <span className="flex size-14 items-center justify-center rounded-full bg-white text-black shadow-xl">
                <Play className="size-6 fill-current" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </ContentSection>
  )
}

function RelatedSection({
  items,
  isPending,
}: {
  items: Array<{ relation: AnimeRelation; anime: Anime }>
  isPending: boolean
}) {
  if (isPending && items.length === 0) {
    return (
      <ContentSection title="Связанные тайтлы">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="aspect-[2/3] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </ContentSection>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <ContentSection title="Связанные тайтлы">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map(({ relation, anime }) => {
          const title = getAnimeTitle(anime)
          const cover = getAnimeCover(anime)

          return (
            <Link
              key={`${relation.id ?? relation.relatedAnimeId}`}
              to={`/anime/${anime.id}`}
              className="group min-w-0"
            >
              <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
                {cover ? (
                  <SafeImage
                    src={cover}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Film className="size-8" />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {relationLabels[relation.relationType || ""] || relation.relationType || "Связанный тайтл"}
              </p>
            </Link>
          )
        })}
      </div>
    </ContentSection>
  )
}

function ChipList({
  items,
  className,
}: {
  items: string[]
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-muted/60 px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function CompactFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card/70 px-3.5 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-relaxed">{value}</dd>
    </div>
  )
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  )
}

function SafeImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (failedSrc === src) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <Film className="size-8" />
      </div>
    )
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />
}

function getAnimeFacts(anime: Anime) {
  const facts: Array<{
    label: string
    value: string | number | null | undefined
  }> = [
    {
      label: "Период выхода",
      value: formatDateRange(anime),
    },
    {
      label: "Первоисточник",
      value: anime.source ? sourceLabels[anime.source] || anime.source : undefined,
    },
    {
      label: "Жанры",
      value: anime.genres?.length ? anime.genres.join(", ") : undefined,
    },
    {
      label: "Возрастная отметка",
      value: anime.isAdult ? "18+" : "Нет отметки 18+",
    },
  ]

  return facts.filter(
    (fact): fact is { label: string; value: string | number } =>
      fact.value !== undefined && fact.value !== null && fact.value !== "",
  )
}

function getAnimeTitle(anime: Anime) {
  return anime.title.russian || anime.title.romaji || anime.title.english || "Без названия"
}

function getAnimeCover(anime: Anime) {
  return (
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.original ||
    anime.coverImage?.medium
  )
}

function formatDateRange(anime: Anime) {
  const start = formatAnimeDate(anime.startDateDay, anime.startDateMonth, anime.startDateYear)
  const end = formatAnimeDate(anime.endDateDay, anime.endDateMonth, anime.endDateYear)

  if (start && end && start !== end) {
    return `${start} — ${end}`
  }

  return start || end
}

function formatAnimeDate(day?: number | null, month?: number | null, year?: number | null) {
  if (!year) {
    return undefined
  }

  if (!month) {
    return String(year)
  }

  const date = new Date(Date.UTC(year, month - 1, day || 1))
  const options: Intl.DateTimeFormatOptions = day
    ? { day: "numeric", month: "long", year: "numeric" }
    : { month: "long", year: "numeric" }

  return new Intl.DateTimeFormat("ru-RU", options).format(date)
}

function formatEpisodeDuration(duration: string) {
  return /^\d+$/.test(duration) ? `${duration} мин.` : duration
}

function formatRating(rating: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(rating)
}

function formatProgressTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes}:${String(remainder).padStart(2, "0")}`
}

function AnimePageSkeleton() {
  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <div className="min-h-[34rem] animate-pulse bg-muted" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="aspect-video rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  )
}

function PageError({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center justify-center px-4">
      <div className="max-w-md rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <AlertCircle className="mx-auto size-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <Button asChild variant="secondary" className="mt-6 rounded-full">
          <Link to="/">На главную</Link>
        </Button>
      </div>
    </div>
  )
}
