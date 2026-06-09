import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  ArrowLeft,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ListVideo,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  Search,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import { Link, useParams, useSearchParams } from "react-router"

import type { Anime, Episode, EpisodeVideo, ListResponse } from "@/api/anime"
import {
  updateWatchProgress,
  type WatchHistoryItem,
} from "@/api/user-activity"
import type { ShakaVideoController } from "@/components/player/shaka-video"
import { useAnimeDetail, useAnimeEpisodes, useEpisode } from "@/hooks/use-anime-detail"
import { useWatchHistory, userActivityKeys } from "@/hooks/use-user-activity"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const ShakaVideo = lazy(() => import("@/components/player/shaka-video"))

type PlaybackSnapshot = {
  episode: Episode
  currentTime: number
  duration: number
}

export default function AnimeWatchPage() {
  const { id } = useParams()
  const { data: session } = authClient.useSession()
  const validId = id && /^\d+$/.test(id) ? id : undefined
  const isAuthenticated = Boolean(session?.user)
  const animeQuery = useAnimeDetail(validId)
  const episodesQuery = useAnimeEpisodes(validId)
  const historyQuery = useWatchHistory(isAuthenticated)
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [isEpisodePanelOpen, setIsEpisodePanelOpen] = useState(false)

  const episodes = useMemo(
    () => sortEpisodes(episodesQuery.data?.pages.flatMap((page) => page.data) ?? []),
    [episodesQuery.data],
  )
  const requestedEpisodeId = searchParams.get("episode") || undefined
  const requestedEpisodeIsUuid = isUuid(requestedEpisodeId)
  const firstEpisodeId = episodes[0]?.id
  const candidateEpisodeId = requestedEpisodeIsUuid ? requestedEpisodeId : firstEpisodeId
  const episodeQuery = useEpisode(candidateEpisodeId)
  const currentEpisode =
    episodeQuery.data?.animeId === Number(validId) ? episodeQuery.data : undefined
  const displayedEpisodes = useMemo(
    () => sortEpisodes(currentEpisode ? [...episodes, currentEpisode] : episodes),
    [currentEpisode, episodes],
  )
  const currentEpisodeIndex = displayedEpisodes.findIndex(
    (episode) => episode.id === currentEpisode?.id,
  )
  const previousEpisode =
    currentEpisodeIndex > 0 ? displayedEpisodes[currentEpisodeIndex - 1] : undefined
  const nextEpisode =
    currentEpisodeIndex >= 0 ? displayedEpisodes[currentEpisodeIndex + 1] : undefined
  const videos = currentEpisode?.videos ?? []
  const currentVideo = getEffectiveVideo(videos, selectedVideoId)
  const progressByEpisode = useMemo(
    () =>
      new Map(
        (historyQuery.data?.data ?? [])
          .filter((item) => item.anime.id === Number(validId))
          .map((item) => [item.episode.id, item]),
      ),
    [historyQuery.data, validId],
  )

  useEffect(() => {
    if (!firstEpisodeId) {
      return
    }

    const shouldUseFirstEpisode =
      !requestedEpisodeId ||
      !requestedEpisodeIsUuid ||
      episodeQuery.isError ||
      (episodeQuery.data !== undefined && episodeQuery.data.animeId !== Number(validId))

    if (!shouldUseFirstEpisode || requestedEpisodeId === firstEpisodeId) {
      return
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set("episode", firstEpisodeId)
        return next
      },
      { replace: true },
    )
  }, [
    episodeQuery.data,
    episodeQuery.isError,
    firstEpisodeId,
    requestedEpisodeId,
    requestedEpisodeIsUuid,
    setSearchParams,
    validId,
  ])

  function selectEpisode(episodeId: string) {
    setSelectedVideoId(null)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set("episode", episodeId)
      return next
    })
  }

  if (!validId) {
    return <WatchError text="ID аниме в адресе должен быть числом." />
  }

  if (animeQuery.isError) {
    return <WatchError text={animeQuery.error.message} animeId={validId} />
  }

  if (episodesQuery.isError && !requestedEpisodeIsUuid) {
    return <WatchError text={episodesQuery.error.message} animeId={validId} />
  }

  if (
    !episodesQuery.isPending &&
    episodes.length === 0 &&
    (!candidateEpisodeId ||
      episodeQuery.isError ||
      (episodeQuery.data !== undefined && !currentEpisode))
  ) {
    return <WatchError text="Для этого тайтла пока нет эпизодов." animeId={validId} />
  }

  const animeTitle = animeQuery.data ? getAnimeTitle(animeQuery.data.title) : "Загрузка..."
  const poster =
    currentEpisode?.thumbnailUrl ||
    animeQuery.data?.coverImage?.extraLarge ||
    animeQuery.data?.coverImage?.large ||
    animeQuery.data?.coverImage?.original ||
    animeQuery.data?.coverImage?.medium

  return (
    <main className="h-dvh w-full overflow-hidden bg-black text-white">
      <Suspense fallback={<div className="h-full w-full animate-pulse bg-zinc-950" />}>
        <ShakaVideo
          manifestUrl={currentVideo?.manifestUrl}
          poster={poster}
          title={`${animeTitle}, эпизод ${currentEpisode?.number ?? ""}`}
          className="h-dvh w-full aspect-auto rounded-none shadow-none ring-0"
          overlay={(player) => (
            <>
              <PlaybackActivity
                player={player}
                anime={animeQuery.data}
                episode={currentEpisode}
                manifestUrl={currentVideo?.manifestUrl}
                savedProgress={currentEpisode ? progressByEpisode.get(currentEpisode.id) : undefined}
                enabled={isAuthenticated}
              />
              <WatchOverlay
                player={player}
                animeId={validId}
                animeTitle={animeTitle}
                currentEpisode={currentEpisode}
                currentVideo={currentVideo}
                previousEpisode={previousEpisode}
                nextEpisode={nextEpisode}
                episodes={displayedEpisodes}
                videos={videos}
                progressByEpisode={progressByEpisode}
                isEpisodePending={episodeQuery.isPending}
                isEpisodeError={episodeQuery.isError}
                isPanelOpen={isEpisodePanelOpen}
                hasMoreEpisodes={Boolean(episodesQuery.hasNextPage)}
                isLoadingMore={episodesQuery.isFetchingNextPage}
                onPanelOpen={() => setIsEpisodePanelOpen(true)}
                onPanelClose={() => setIsEpisodePanelOpen(false)}
                onEpisodeSelect={selectEpisode}
                onVideoSelect={setSelectedVideoId}
                onLoadMore={() => episodesQuery.fetchNextPage()}
              />
            </>
          )}
        />
      </Suspense>
    </main>
  )
}

function PlaybackActivity({
  player,
  anime,
  episode,
  manifestUrl,
  savedProgress,
  enabled,
}: {
  player: ShakaVideoController
  anime?: Anime
  episode?: Episode
  manifestUrl?: string | null
  savedProgress?: { positionSeconds: number; completed: boolean }
  enabled: boolean
}) {
  const queryClient = useQueryClient()
  const startedEpisodeRef = useRef<string | null>(null)
  const previousPlayingRef = useRef(false)
  const periodicBucketRef = useRef(new Map<string, number>())
  const snapshotsRef = useRef(new Map<string, PlaybackSnapshot>())
  const lastSavedRef = useRef(new Map<string, string>())
  const latestEpisodeIdRef = useRef<string | null>(null)
  const saveRef = useRef<(snapshot?: PlaybackSnapshot, keepalive?: boolean) => void>(() => undefined)

  const saveProgress = useCallback(
    (snapshot?: PlaybackSnapshot, keepalive = false) => {
      if (!enabled || !anime || !snapshot || snapshot.currentTime < 1) {
        return
      }

      const positionSeconds = Math.max(0, Math.floor(snapshot.currentTime))
      const completed =
        snapshot.duration > 0 && snapshot.currentTime / snapshot.duration >= 0.9
      const signature = `${positionSeconds}:${completed}`

      if (lastSavedRef.current.get(snapshot.episode.id) === signature) {
        return
      }

      lastSavedRef.current.set(snapshot.episode.id, signature)

      void updateWatchProgress(
        snapshot.episode.id,
        { positionSeconds, completed },
        keepalive,
      ).then(() => {
        const now = new Date().toISOString()

        queryClient.setQueryData<ListResponse<WatchHistoryItem>>(
          userActivityKeys.history,
          (current) => {
            if (!current) {
              return current
            }

            const existingIndex = current.data.findIndex(
              (item) => item.episode.id === snapshot.episode.id,
            )
            const item: WatchHistoryItem = {
              anime,
              episode: snapshot.episode,
              positionSeconds,
              completed,
              updatedAt: now,
            }
            const data =
              existingIndex >= 0
                ? current.data.map((existing, index) => (index === existingIndex ? item : existing))
                : [item, ...current.data].slice(0, current.meta.limit)

            return {
              data,
              meta: {
                ...current.meta,
                total: existingIndex >= 0 ? current.meta.total : current.meta.total + 1,
              },
            }
          },
        )

        void queryClient.invalidateQueries({
          queryKey: userActivityKeys.continueWatching,
          refetchType: "none",
        })
        void queryClient.invalidateQueries({
          queryKey: userActivityKeys.anime(anime.id),
          refetchType: "none",
        })
      }).catch(() => {
        lastSavedRef.current.delete(snapshot.episode.id)
      })
    },
    [anime, enabled, queryClient],
  )

  useEffect(() => {
    saveRef.current = saveProgress
  }, [saveProgress])

  useEffect(() => {
    if (
      !episode ||
      !manifestUrl ||
      player.loadedManifestUrl !== manifestUrl ||
      startedEpisodeRef.current !== episode.id
    ) {
      return
    }

    latestEpisodeIdRef.current = episode.id
    snapshotsRef.current.set(episode.id, {
      episode,
      currentTime: player.currentTime,
      duration: player.duration,
    })
  }, [episode, manifestUrl, player.currentTime, player.duration, player.loadedManifestUrl])

  useEffect(() => {
    if (
      player.status !== "loaded" ||
      !episode ||
      !manifestUrl ||
      player.loadedManifestUrl !== manifestUrl ||
      startedEpisodeRef.current === episode.id
    ) {
      return
    }

    startedEpisodeRef.current = episode.id

    if (savedProgress && !savedProgress.completed && savedProgress.positionSeconds > 0) {
      player.seekTo(savedProgress.positionSeconds)
    }

    player.play()
  }, [episode, manifestUrl, player, player.loadedManifestUrl, player.status, savedProgress])

  useEffect(() => {
    if (!enabled || !episode || !player.isPlaying || player.currentTime < 15) {
      return
    }

    const bucket = Math.floor(player.currentTime / 15)

    if (periodicBucketRef.current.get(episode.id) === bucket) {
      return
    }

    periodicBucketRef.current.set(episode.id, bucket)
    saveProgress(snapshotsRef.current.get(episode.id))
  }, [enabled, episode, player.currentTime, player.isPlaying, saveProgress])

  useEffect(() => {
    if (
      enabled &&
      episode &&
      previousPlayingRef.current &&
      !player.isPlaying
    ) {
      saveProgress(snapshotsRef.current.get(episode.id))
    }

    previousPlayingRef.current = player.isPlaying
  }, [enabled, episode, player.isPlaying, saveProgress])

  useEffect(() => {
    if (!episode) {
      return
    }

    const episodeId = episode.id
    const snapshots = snapshotsRef.current
    return () => saveRef.current(snapshots.get(episodeId))
  }, [episode])

  useEffect(() => {
    function saveOnPageHide() {
      const episodeId = latestEpisodeIdRef.current
      saveRef.current(episodeId ? snapshotsRef.current.get(episodeId) : undefined, true)
    }

    window.addEventListener("pagehide", saveOnPageHide)
    return () => {
      window.removeEventListener("pagehide", saveOnPageHide)
      saveOnPageHide()
    }
  }, [])

  return null
}

function WatchOverlay({
  player,
  animeId,
  animeTitle,
  currentEpisode,
  currentVideo,
  previousEpisode,
  nextEpisode,
  episodes,
  videos,
  progressByEpisode,
  isEpisodePending,
  isEpisodeError,
  isPanelOpen,
  hasMoreEpisodes,
  isLoadingMore,
  onPanelOpen,
  onPanelClose,
  onEpisodeSelect,
  onVideoSelect,
  onLoadMore,
}: {
  player: ShakaVideoController
  animeId: string
  animeTitle: string
  currentEpisode?: Episode
  currentVideo?: EpisodeVideo
  previousEpisode?: Episode
  nextEpisode?: Episode
  episodes: Episode[]
  videos: EpisodeVideo[]
  progressByEpisode: Map<string, { positionSeconds: number; completed: boolean }>
  isEpisodePending: boolean
  isEpisodeError: boolean
  isPanelOpen: boolean
  hasMoreEpisodes: boolean
  isLoadingMore: boolean
  onPanelOpen: () => void
  onPanelClose: () => void
  onEpisodeSelect: (id: string) => void
  onVideoSelect: (id: string) => void
  onLoadMore: () => void
}) {
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const controlsLocked = !player.isPlaying || player.isBuffering || isPanelOpen || isSettingsOpen
  const controlsShown = controlsLocked || isControlsVisible

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()

    if (!controlsLocked) {
      hideTimerRef.current = setTimeout(() => setIsControlsVisible(false), 3000)
    }
  }, [clearHideTimer, controlsLocked])

  const showControls = useCallback(() => {
    setIsControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  useEffect(() => {
    if (controlsLocked) {
      clearHideTimer()
      return
    }

    scheduleHide()
    return clearHideTimer
  }, [clearHideTimer, controlsLocked, scheduleHide])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        return
      }

      switch (event.key.toLocaleLowerCase()) {
        case " ":
        case "k":
          event.preventDefault()
          player.togglePlay()
          break
        case "arrowleft":
          event.preventDefault()
          player.seekTo(player.currentTime - 10)
          break
        case "arrowright":
          event.preventDefault()
          player.seekTo(player.currentTime + 10)
          break
        case "m":
          player.toggleMute()
          break
        case "f":
          player.toggleFullscreen()
          break
        case "escape":
          if (isSettingsOpen) {
            setIsSettingsOpen(false)
          } else if (isPanelOpen) {
            onPanelClose()
          }
          break
      }

      showControls()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isPanelOpen, isSettingsOpen, onPanelClose, player, showControls])

  function openEpisodePanel() {
    setIsSettingsOpen(false)
    onPanelOpen()
  }

  function toggleSettings() {
    onPanelClose()
    setIsSettingsOpen((isOpen) => !isOpen)
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-30",
        !controlsShown && "cursor-none",
      )}
      onPointerMove={showControls}
      onPointerDown={showControls}
      onClick={() => {
        if (isSettingsOpen) {
          setIsSettingsOpen(false)
        } else {
          player.togglePlay()
        }
      }}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 pb-14 pt-3 transition-opacity duration-[600ms] sm:px-6 sm:pt-5",
          controlsShown ? "visible opacity-100" : "invisible opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          to={`/anime/${animeId}`}
          aria-label="Вернуться на страницу тайтла"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <p className="truncate text-sm font-bold drop-shadow sm:text-base">{animeTitle}</p>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pb-3 pt-24 transition-opacity duration-[600ms] sm:px-6 sm:pb-5",
          controlsShown ? "visible opacity-100" : "invisible opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-end justify-between gap-4">
          <div className="min-w-0 drop-shadow-lg">
            <p className="text-sm font-bold sm:text-base">
              {currentEpisode ? `Эпизод ${currentEpisode.number}` : "Загрузка эпизода..."}
            </p>
            {currentEpisode?.name && (
              <p className="mt-0.5 truncate text-[11px] text-white/70 sm:text-xs">
                {currentEpisode.name}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-white/75 sm:text-xs">
            {formatPlayerTime(player.currentTime)} / {formatPlayerTime(player.duration)}
          </span>
        </div>

        <PlayerProgress player={player} />

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center justify-start gap-1">
            <ControlButton label="Открыть эпизоды" onClick={openEpisodePanel}>
              <ListVideo className="size-4.5" />
            </ControlButton>
            <span className="hidden max-w-40 truncate text-[10px] font-semibold text-white/55 lg:block">
              {currentVideo?.voiceoverName || "Эпизоды"}
            </span>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <ControlButton
              label="Предыдущий эпизод"
              disabled={!previousEpisode}
              onClick={() => previousEpisode && onEpisodeSelect(previousEpisode.id)}
            >
              <ChevronLeft className="size-5" />
            </ControlButton>
            <button
              type="button"
              aria-label={player.isPlaying ? "Пауза" : "Воспроизвести"}
              className="flex size-11 items-center justify-center rounded-full bg-black/50 text-white shadow-xl backdrop-blur transition hover:bg-black/75 sm:size-12"
              onClick={player.togglePlay}
            >
              {player.isPlaying ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="ml-0.5 size-5 fill-current" />
              )}
            </button>
            <ControlButton
              label="Следующий эпизод"
              disabled={!nextEpisode}
              onClick={() => nextEpisode && onEpisodeSelect(nextEpisode.id)}
            >
              <ChevronRight className="size-5" />
            </ControlButton>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1">
            <div className="group/volume hidden items-center sm:flex">
              <ControlButton
                label={player.isMuted ? "Включить звук" : "Выключить звук"}
                onClick={player.toggleMute}
              >
                <VolumeIcon player={player} />
              </ControlButton>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={player.isMuted ? 0 : player.volume}
                aria-label="Громкость"
                className="anime-player-volume h-8 w-0 opacity-0 transition-all duration-200 group-hover/volume:w-20 group-hover/volume:opacity-100 focus:w-20 focus:opacity-100"
                onChange={(event) => player.setVolume(Number(event.target.value))}
              />
            </div>

            <ControlButton label="Настройки" active={isSettingsOpen} onClick={toggleSettings}>
              <Settings className="size-4.5" />
            </ControlButton>

            {player.canPictureInPicture && (
              <ControlButton
                label="Картинка в картинке"
                className="hidden sm:flex"
                onClick={player.togglePictureInPicture}
              >
                <PictureInPicture className="size-4.5" />
              </ControlButton>
            )}

            {player.canFullscreen && (
              <ControlButton
                label={player.isFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
                onClick={player.toggleFullscreen}
              >
                {player.isFullscreen ? (
                  <Minimize className="size-4.5" />
                ) : (
                  <Maximize className="size-4.5" />
                )}
              </ControlButton>
            )}
          </div>
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsPanel
          player={player}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isPanelOpen && (
        <EpisodePanel
          episodes={episodes}
          videos={videos}
          progressByEpisode={progressByEpisode}
          currentEpisode={currentEpisode}
          currentVideo={currentVideo}
          isEpisodePending={isEpisodePending}
          isEpisodeError={isEpisodeError}
          hasMoreEpisodes={hasMoreEpisodes}
          isLoadingMore={isLoadingMore}
          onClose={onPanelClose}
          onEpisodeSelect={onEpisodeSelect}
          onVideoSelect={onVideoSelect}
          onLoadMore={onLoadMore}
        />
      )}
    </div>
  )
}

function PlayerProgress({ player }: { player: ShakaVideoController }) {
  const [hoverPosition, setHoverPosition] = useState<{
    percent: number
    time: number
  } | null>(null)
  const duration = Math.max(player.duration, 0)
  const playedPercent = duration ? (player.currentTime / duration) * 100 : 0
  const bufferedPercent = duration
    ? Math.max(playedPercent, (player.bufferedEnd / duration) * 100)
    : 0
  const style = {
    "--played-percent": `${Math.min(playedPercent, 100)}%`,
    "--buffered-percent": `${Math.min(bufferedPercent, 100)}%`,
    "--hover-percent": `${hoverPosition?.percent ?? 0}%`,
  } as CSSProperties

  function updateHoverPosition(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || duration === 0) {
      setHoverPosition(null)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const percent = Math.max(0, Math.min((event.clientX - bounds.left) / bounds.width, 1))
    setHoverPosition({ percent: percent * 100, time: percent * duration })
  }

  return (
    <div
      className="anime-player-progress-area relative h-5 w-full"
      onPointerEnter={updateHoverPosition}
      onPointerMove={updateHoverPosition}
      onPointerLeave={() => setHoverPosition(null)}
    >
      {hoverPosition && (
        <span
          className="anime-player-progress-tooltip"
          style={{
            left: `clamp(2.25rem, ${hoverPosition.percent}%, calc(100% - 2.25rem))`,
          }}
        >
          {formatPlayerTime(hoverPosition.time)}
        </span>
      )}
      <div className="anime-player-progress-track" style={style} />
      <input
        type="range"
        min="0"
        max={duration || 0}
        step="0.1"
        value={Math.min(player.currentTime, duration || 0)}
        aria-label="Позиция воспроизведения"
        className="anime-player-progress absolute inset-0 h-full w-full"
        disabled={duration === 0}
        onChange={(event) => player.seekTo(Number(event.target.value))}
      />
    </div>
  )
}

function SettingsPanel({
  player,
  onClose,
}: {
  player: ShakaVideoController
  onClose: () => void
}) {
  return (
    <div
      className="absolute bottom-20 right-3 z-50 max-h-[min(70dvh,36rem)] w-[min(92vw,21rem)] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl sm:bottom-24 sm:right-6"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-bold">Настройки воспроизведения</h2>
        <button
          type="button"
          aria-label="Закрыть настройки"
          className="flex size-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      <SettingsGroup icon={<Gauge className="size-4" />} title="Качество">
        <SettingsChoice
          label="Авто"
          active={player.selectedQuality === "auto"}
          onClick={() => player.selectQuality("auto")}
        />
        {player.qualities.map((quality) => (
          <SettingsChoice
            key={quality.id}
            label={quality.label}
            active={player.selectedQuality === quality.id}
            onClick={() => player.selectQuality(quality.id)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup icon={<Settings className="size-4" />} title="Скорость">
        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
          <SettingsChoice
            key={rate}
            label={rate === 1 ? "Обычная" : `${rate}×`}
            active={player.playbackRate === rate}
            onClick={() => player.setPlaybackRate(rate)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup icon={<Captions className="size-4" />} title="Субтитры">
        <SettingsChoice
          label="Выключены"
          active={player.selectedTextTrack === null}
          onClick={() => player.selectTextTrack(null)}
        />
        {player.textTracks.map((track) => (
          <SettingsChoice
            key={track.id}
            label={track.label}
            active={player.selectedTextTrack === track.id}
            onClick={() => player.selectTextTrack(track.id)}
          />
        ))}
      </SettingsGroup>
    </div>
  )
}

function SettingsGroup({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-white/10 py-3 first:border-0 first:pt-0">
      <h3 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </section>
  )
}

function SettingsChoice({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-0 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-semibold transition hover:bg-white/10",
        active && "bg-white text-black hover:bg-white/85",
      )}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="size-3.5 shrink-0" />}
    </button>
  )
}

function EpisodePanel({
  episodes,
  videos,
  progressByEpisode,
  currentEpisode,
  currentVideo,
  isEpisodePending,
  isEpisodeError,
  hasMoreEpisodes,
  isLoadingMore,
  onClose,
  onEpisodeSelect,
  onVideoSelect,
  onLoadMore,
}: {
  episodes: Episode[]
  videos: EpisodeVideo[]
  progressByEpisode: Map<string, { positionSeconds: number; completed: boolean }>
  currentEpisode?: Episode
  currentVideo?: EpisodeVideo
  isEpisodePending: boolean
  isEpisodeError: boolean
  hasMoreEpisodes: boolean
  isLoadingMore: boolean
  onClose: () => void
  onEpisodeSelect: (id: string) => void
  onVideoSelect: (id: string) => void
  onLoadMore: () => void
}) {
  const activeEpisodeRef = useRef<HTMLButtonElement | null>(null)
  const [search, setSearch] = useState("")
  const normalizedSearch = search.trim().toLocaleLowerCase("ru-RU")
  const filteredEpisodes = episodes.filter((episode) => {
    if (!normalizedSearch) {
      return true
    }

    return (
      String(episode.number).includes(normalizedSearch) ||
      episode.name?.toLocaleLowerCase("ru-RU").includes(normalizedSearch)
    )
  })

  useEffect(() => {
    activeEpisodeRef.current?.scrollIntoView({ block: "center" })
  }, [])

  return (
    <div
      data-episode-panel
      className="absolute inset-0 z-50 animate-in bg-black/45 fade-in backdrop-blur-[2px] duration-200"
      onClick={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <aside className="flex h-full w-[min(92vw,26rem)] animate-in flex-col border-r border-white/10 bg-zinc-950/97 shadow-2xl slide-in-from-left-10 duration-200">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4">
          <div>
            <h2 className="text-sm font-bold">Эпизоды</h2>
            <p className="mt-0.5 text-[11px] text-white/45">{episodes.length} загружено</p>
          </div>
          <button
            type="button"
            aria-label="Закрыть список эпизодов"
            className="flex size-9 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-white/10 p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            Озвучка
          </p>
          {isEpisodePending ? (
            <p className="flex items-center gap-2 text-xs text-white/55">
              <Loader2 className="size-4 animate-spin" />
              Загрузка вариантов...
            </p>
          ) : isEpisodeError ? (
            <p className="text-xs text-red-300">Не удалось загрузить варианты видео.</p>
          ) : videos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {videos.map((video) => {
                const isReady = isPlayableVideo(video)

                return (
                  <button
                    key={video.id}
                    type="button"
                    disabled={!isReady}
                    title={
                      isReady
                        ? undefined
                        : video.statusReason || `Видео недоступно: ${video.status || "нет статуса"}`
                    }
                    className={cn(
                      "flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] font-semibold transition hover:bg-white/10",
                      currentVideo?.id === video.id && "border-white/70 bg-white text-black hover:bg-white/85",
                      !isReady && "cursor-not-allowed opacity-30 hover:bg-white/5",
                    )}
                    onClick={() => onVideoSelect(video.id)}
                  >
                    <span className="truncate">{video.voiceoverName || "Оригинальная дорожка"}</span>
                    {currentVideo?.id === video.id && <Check className="size-3.5 shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-white/45">Нет доступных вариантов видео.</p>
          )}
        </div>

        <label className="relative mx-4 mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={search}
            placeholder="Номер или название"
            className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/35"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-2">
            {filteredEpisodes.map((episode) => {
              const isActive = currentEpisode?.id === episode.id
              const progress = progressByEpisode.get(episode.id)

              return (
                <button
                  key={episode.id}
                  ref={isActive ? activeEpisodeRef : undefined}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:bg-white/8",
                    isActive && "border-white/15 bg-white/10",
                  )}
                  onClick={() => onEpisodeSelect(episode.id)}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-xs font-bold",
                      isActive && "bg-white text-black",
                    )}
                  >
                    {episode.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {episode.name || `Эпизод ${episode.number}`}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-white/40">
                      {[formatEpisodeDuration(episode.duration), episode.isFiller ? "Филлер" : undefined]
                        .filter(Boolean)
                        .join(" · ") || "Эпизод"}
                    </span>
                    {progress && (
                      <EpisodePanelProgress episode={episode} progress={progress} />
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {filteredEpisodes.length === 0 && (
            <p className="py-8 text-center text-xs text-white/40">Эпизоды не найдены.</p>
          )}

          {hasMoreEpisodes && !normalizedSearch && (
            <button
              type="button"
              disabled={isLoadingMore}
              className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2.5 text-xs font-semibold text-white/65 transition hover:bg-white/8 hover:text-white disabled:opacity-40"
              onClick={onLoadMore}
            >
              {isLoadingMore ? "Загрузка..." : "Показать ещё"}
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

function EpisodePanelProgress({
  episode,
  progress,
}: {
  episode: Episode
  progress: { positionSeconds: number; completed: boolean }
}) {
  const durationSeconds =
    episode.duration && /^\d+$/.test(episode.duration) ? Number(episode.duration) * 60 : 0
  const percent = progress.completed
    ? 100
    : durationSeconds
      ? Math.min((progress.positionSeconds / durationSeconds) * 100, 100)
      : 0

  return (
    <>
      <span className="mt-1.5 block text-[9px] font-semibold text-white/55">
        {progress.completed ? "Просмотрено" : `Продолжить с ${formatPlayerTime(progress.positionSeconds)}`}
      </span>
      <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-white/70" style={{ width: `${percent}%` }} />
      </span>
    </>
  )
}

function ControlButton({
  label,
  active = false,
  disabled = false,
  className,
  children,
  onClick,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  className?: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 sm:size-10",
        active && "bg-white/15 text-white",
        className,
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function VolumeIcon({ player }: { player: ShakaVideoController }) {
  if (player.isMuted || player.volume === 0) {
    return <VolumeX className="size-4.5" />
  }

  if (player.volume < 0.5) {
    return <Volume1 className="size-4.5" />
  }

  return <Volume2 className="size-4.5" />
}

function WatchError({ text, animeId }: { text: string; animeId?: string }) {
  return (
    <main className="flex h-dvh items-center justify-center bg-black px-5 text-white">
      <div className="max-w-md text-center">
        <AlertCircle className="mx-auto size-10 text-red-400" />
        <h1 className="mt-4 text-lg font-bold">Не удалось открыть плеер</h1>
        <p className="mt-2 text-sm text-white/55">{text}</p>
        <Link
          to={animeId ? `/anime/${animeId}` : "/"}
          className="mt-6 inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-black"
        >
          Вернуться назад
        </Link>
      </div>
    </main>
  )
}

function sortEpisodes(episodes: Episode[]) {
  return Array.from(new Map(episodes.map((episode) => [episode.id, episode])).values()).sort(
    (left, right) => left.number - right.number,
  )
}

function getEffectiveVideo(videos: EpisodeVideo[], selectedId: string | null) {
  return (
    videos.find((video) => video.id === selectedId && isPlayableVideo(video)) ??
    videos.find(isPlayableVideo)
  )
}

function isPlayableVideo(video: EpisodeVideo) {
  return video.status === "READY" && Boolean(video.manifestUrl)
}

function isUuid(value?: string): value is string {
  return Boolean(value && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}

function formatEpisodeDuration(duration?: string | null) {
  if (!duration) {
    return undefined
  }

  return /^\d+$/.test(duration) ? `${duration} мин.` : duration
}

function formatPlayerTime(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "00:00"
  }

  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const seconds = Math.floor(value % 60)

  return hours > 0
    ? [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")
    : [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":")
}

function getAnimeTitle(title: {
  russian: string
  romaji: string
  english?: string | null
}) {
  return title.russian || title.romaji || title.english || "Без названия"
}
