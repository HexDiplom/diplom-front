import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AlertCircle, Loader2, Play, RotateCcw, X } from "lucide-react"
import shaka from "shaka-player/dist/shaka-player.compiled"

import {
  getPlayerPreferences,
  updatePlayerPreferences,
  type PlayerPreferences,
} from "@/lib/player-preferences"
import { cn } from "@/lib/utils"
import "@/styles/shaka-player.css"

type PlayerStatus = "idle" | "ready" | "loading" | "loaded" | "error"

export type ShakaQualityOption = {
  id: number
  label: string
  height?: number | null
  active: boolean
}

export type ShakaTextTrackOption = {
  id: number
  label: string
  active: boolean
}

export type ShakaVideoController = {
  status: PlayerStatus
  loadedManifestUrl: string | null
  isPlaying: boolean
  isEnded: boolean
  isBuffering: boolean
  currentTime: number
  duration: number
  bufferedEnd: number
  volume: number
  isMuted: boolean
  playbackRate: number
  qualities: ShakaQualityOption[]
  selectedQuality: number | "auto"
  textTracks: ShakaTextTrackOption[]
  selectedTextTrack: number | null
  canPictureInPicture: boolean
  isPictureInPicture: boolean
  canFullscreen: boolean
  isFullscreen: boolean
  play: () => void
  togglePlay: () => void
  seekTo: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  selectQuality: (quality: number | "auto") => void
  selectTextTrack: (trackId: number | null) => void
  togglePictureInPicture: () => void
  toggleFullscreen: () => void
}

type ShakaVideoProps = {
  manifestUrl?: string | null
  sourceReady?: boolean
  startTime?: number | null
  poster?: string | null
  title?: string
  className?: string
  overlay?: ReactNode | ((controller: ShakaVideoController) => ReactNode)
}

type PlaybackState = Pick<
  ShakaVideoController,
  | "isPlaying"
  | "isEnded"
  | "isBuffering"
  | "currentTime"
  | "duration"
  | "bufferedEnd"
  | "volume"
  | "isMuted"
  | "playbackRate"
  | "qualities"
  | "selectedQuality"
  | "textTracks"
  | "selectedTextTrack"
  | "canPictureInPicture"
  | "isPictureInPicture"
  | "canFullscreen"
  | "isFullscreen"
>

const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  isEnded: false,
  isBuffering: false,
  currentTime: 0,
  duration: 0,
  bufferedEnd: 0,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  qualities: [],
  selectedQuality: "auto",
  textTracks: [],
  selectedTextTrack: null,
  canPictureInPicture: false,
  isPictureInPicture: false,
  canFullscreen: false,
  isFullscreen: false,
}

export default function ShakaVideo({
  manifestUrl,
  sourceReady = true,
  startTime = null,
  poster,
  title = "Видео",
  className,
  overlay,
}: ShakaVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<shaka.Player | null>(null)
  const variantTracksRef = useRef<Map<number, shaka.extern.Track>>(new Map())
  const textTracksRef = useRef<Map<number, shaka.extern.TextTrack>>(new Map())
  const startTimeRef = useRef(startTime)
  const shouldResumePlaybackRef = useRef(false)
  const hasPlaybackErrorRef = useRef(false)
  const [initialPreferences] = useState(getPlayerPreferences)
  const preferencesRef = useRef(initialPreferences)
  const [isRuntimeReady, setIsRuntimeReady] = useState(false)
  const [reloadRequest, setReloadRequest] = useState(0)
  const [status, setStatus] = useState<PlayerStatus>("idle")
  const [loadedManifestUrl, setLoadedManifestUrl] = useState<string | null>(null)
  const [criticalError, setCriticalError] = useState<string | null>(null)
  const [recoverableError, setRecoverableError] = useState<string | null>(null)
  const [isCriticalErrorDismissed, setIsCriticalErrorDismissed] = useState(false)
  const [playback, setPlayback] = useState(initialPlaybackState)

  useEffect(() => {
    startTimeRef.current = startTime
  }, [startTime])

  const syncMediaState = useCallback(() => {
    const video = videoRef.current
    const container = containerRef.current

    if (!video || !container) {
      return
    }

    setPlayback((current) => ({
      ...current,
      isPlaying: !video.paused && !video.ended,
      isEnded: video.ended,
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      bufferedEnd: getBufferedEnd(video),
      volume: video.volume,
      isMuted: video.muted,
      playbackRate: video.playbackRate,
      canPictureInPicture:
        "requestPictureInPicture" in video && document.pictureInPictureEnabled !== false,
      isPictureInPicture: document.pictureInPictureElement === video,
      canFullscreen: Boolean(container.requestFullscreen),
      isFullscreen: document.fullscreenElement === container,
    }))
  }, [])

  const syncTracks = useCallback(() => {
    const player = playerRef.current

    if (!player) {
      return
    }

    const variants = getQualityTracks(player.getVariantTracks())
    const texts = player.getTextTracks()
    const isAbrEnabled = player.getConfiguration().abr.enabled

    variantTracksRef.current = new Map(variants.map((track) => [track.id, track]))
    textTracksRef.current = new Map(texts.map((track) => [track.id, track]))

    setPlayback((current) => ({
      ...current,
      qualities: variants.map((track) => ({
        id: track.id,
        label: formatQualityLabel(track),
        height: track.height,
        active: track.active,
      })),
      selectedQuality: isAbrEnabled
        ? "auto"
        : variants.find((track) => track.active)?.id ?? current.selectedQuality,
      textTracks: texts.map((track) => ({
        id: track.id,
        label: track.label || track.language || `Субтитры ${track.id}`,
        active: track.active,
      })),
      selectedTextTrack: texts.find((track) => track.active)?.id ?? null,
    }))
  }, [])

  const applyTrackPreferences = useCallback(() => {
    const player = playerRef.current

    if (!player) {
      return
    }

    const preferences = preferencesRef.current
    const variants = getQualityTracks(player.getVariantTracks())
    const texts = player.getTextTracks()

    if (preferences.quality === "auto") {
      player.configure({ abr: { enabled: true } })
    } else {
      const track = findClosestQualityTrack(variants, preferences.quality)

      if (track) {
        player.configure({ abr: { enabled: false } })
        player.selectVariantTrack(track, true, 5)
      }
    }

    const textTrack = findPreferredTextTrack(texts, preferences.subtitles)
    player.selectTextTrack(textTrack)
    syncTracks()
  }, [syncTracks])

  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current

    if (!video || !container) {
      return
    }

    let isActive = true

    shaka.polyfill.installAll()

    if (!shaka.Player.isBrowserSupported()) {
      queueMicrotask(() => {
        if (!isActive) {
          return
        }

        setStatus("error")
        hasPlaybackErrorRef.current = true
        setCriticalError("Этот браузер не поддерживает воспроизведение потокового видео.")
        setIsCriticalErrorDismissed(false)
      })

      return () => {
        isActive = false
      }
    }

    const player = new shaka.Player(video)
    applyMediaPreferences(video, preferencesRef.current)
    const handleError = (event: Event) => {
      const detail = "detail" in event ? (event as CustomEvent<unknown>).detail : event

      if (isRecoverableShakaError(detail)) {
        hasPlaybackErrorRef.current = true
        setRecoverableError(formatRecoverableShakaError(detail))
        return
      }

      setStatus("error")
      hasPlaybackErrorRef.current = true
      setRecoverableError(null)
      setCriticalError(formatShakaError(detail))
      setIsCriticalErrorDismissed(false)
    }
    const handleBuffering = () => {
      const isBuffering = player.isBuffering()
      setPlayback((current) => ({ ...current, isBuffering }))

      if (!isBuffering) {
        setRecoverableError(null)
      }
    }
    const handleRecovery = () => {
      if (
        !hasPlaybackErrorRef.current ||
        video.paused ||
        video.ended ||
        player.isBuffering()
      ) {
        return
      }

      hasPlaybackErrorRef.current = false
      setStatus((current) => (current === "error" ? "loaded" : current))
      setLoadedManifestUrl(player.getAssetUri())
      setCriticalError(null)
      setRecoverableError(null)
      setIsCriticalErrorDismissed(false)
    }
    const handleFullscreenChange = () => syncMediaState()
    const mediaEvents = [
      "play",
      "pause",
      "ended",
      "seeking",
      "seeked",
      "timeupdate",
      "durationchange",
      "progress",
      "volumechange",
      "ratechange",
      "enterpictureinpicture",
      "leavepictureinpicture",
    ]
    const trackEvents = [
      "trackschanged",
      "variantchanged",
      "textchanged",
      "adaptation",
      "abrstatuschanged",
    ]

    playerRef.current = player
    player.addEventListener("error", handleError)
    player.addEventListener("buffering", handleBuffering)
    trackEvents.forEach((eventName) => player.addEventListener(eventName, syncTracks))
    mediaEvents.forEach((eventName) => video.addEventListener(eventName, syncMediaState))
    video.addEventListener("playing", handleRecovery)
    video.addEventListener("timeupdate", handleRecovery)
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    queueMicrotask(() => {
      if (!isActive) {
        return
      }

      setStatus("ready")
      setIsRuntimeReady(true)
      syncMediaState()
    })

    return () => {
      isActive = false
      player.removeEventListener("error", handleError)
      player.removeEventListener("buffering", handleBuffering)
      trackEvents.forEach((eventName) => player.removeEventListener(eventName, syncTracks))
      mediaEvents.forEach((eventName) => video.removeEventListener(eventName, syncMediaState))
      video.removeEventListener("playing", handleRecovery)
      video.removeEventListener("timeupdate", handleRecovery)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      playerRef.current = null
      void player.destroy()
    }
  }, [syncMediaState, syncTracks])

  useEffect(() => {
    const player = playerRef.current

    if (!isRuntimeReady || !player || !sourceReady) {
      return
    }

    let isCancelled = false

    async function loadSource() {
      const video = videoRef.current
      const shouldResumePlayback =
        shouldResumePlaybackRef.current || Boolean(video && !video.paused && !video.ended)

      await player?.unload()
      setLoadedManifestUrl(null)

      if (isCancelled) {
        return
      }

      if (!manifestUrl) {
        setStatus("idle")
        hasPlaybackErrorRef.current = false
        setCriticalError(null)
        setRecoverableError(null)
        setIsCriticalErrorDismissed(false)
        setPlayback((current) => ({
          ...initialPlaybackState,
          canPictureInPicture: current.canPictureInPicture,
          canFullscreen: current.canFullscreen,
        }))
        return
      }

      setStatus("loading")
      hasPlaybackErrorRef.current = false
      setCriticalError(null)
      setRecoverableError(null)
      setIsCriticalErrorDismissed(false)

      try {
        await player?.load(manifestUrl, startTimeRef.current)

        if (!isCancelled) {
          setStatus("loaded")
          setLoadedManifestUrl(manifestUrl)
          applyMediaPreferences(video, preferencesRef.current)
          applyTrackPreferences()
          syncMediaState()

          if (shouldResumePlayback) {
            void video?.play().catch(() => undefined)
          }
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setStatus("error")
          hasPlaybackErrorRef.current = true
          setLoadedManifestUrl(null)
          setCriticalError(formatShakaError(caughtError))
          setIsCriticalErrorDismissed(false)
        }
      }
    }

    void loadSource()

    return () => {
      isCancelled = true
    }
  }, [
    applyTrackPreferences,
    isRuntimeReady,
    manifestUrl,
    reloadRequest,
    sourceReady,
    syncMediaState,
  ])

  const togglePlay = useCallback(() => {
    const video = videoRef.current

    if (!video) {
      return
    }

    if (video.paused) {
      shouldResumePlaybackRef.current = true
      void video.play().catch((caughtError: unknown) => {
        setStatus("error")
        hasPlaybackErrorRef.current = true
        setCriticalError(formatShakaError(caughtError))
        setIsCriticalErrorDismissed(false)
      })
    } else {
      shouldResumePlaybackRef.current = false
      video.pause()
    }
  }, [])

  const play = useCallback(() => {
    const video = videoRef.current

    if (video?.paused) {
      shouldResumePlaybackRef.current = true
      void video.play().catch(() => undefined)
    }
  }, [])

  const retryCurrentSource = useCallback(() => {
    const video = videoRef.current

    if (!manifestUrl) {
      return
    }

    if (video && Number.isFinite(video.currentTime)) {
      startTimeRef.current = video.currentTime
    }

    setRecoverableError(null)
    setCriticalError(null)
    setIsCriticalErrorDismissed(false)
    hasPlaybackErrorRef.current = false
    setStatus("loading")
    setReloadRequest((current) => current + 1)
  }, [manifestUrl])

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current

    if (!video || !Number.isFinite(time)) {
      return
    }

    const nextTime = Math.max(
      0,
      Math.min(time, Number.isFinite(video.duration) ? video.duration : time),
    )
    video.currentTime = nextTime
  }, [])

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current

    if (!video) {
      return
    }

    video.volume = Math.max(0, Math.min(volume, 1))
    video.muted = video.volume === 0
    preferencesRef.current = updatePlayerPreferences({
      volume: video.volume,
      muted: video.muted,
    })
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current

    if (video) {
      video.muted = !video.muted
      preferencesRef.current = updatePlayerPreferences({ muted: video.muted })
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current

    if (video) {
      video.playbackRate = rate
      preferencesRef.current = updatePlayerPreferences({ playbackRate: video.playbackRate })
    }
  }, [])

  const selectQuality = useCallback(
    (quality: number | "auto") => {
      const player = playerRef.current

      if (!player) {
        return
      }

      if (quality === "auto") {
        player.configure({ abr: { enabled: true } })
        preferencesRef.current = updatePlayerPreferences({ quality: "auto" })
      } else {
        const track = variantTracksRef.current.get(quality)

        if (!track) {
          return
        }

        player.configure({ abr: { enabled: false } })
        player.selectVariantTrack(track, true, 5)
        preferencesRef.current = updatePlayerPreferences({
          quality: track.height ?? preferencesRef.current.quality,
        })
      }

      syncTracks()
    },
    [syncTracks],
  )

  const selectTextTrack = useCallback(
    (trackId: number | null) => {
      const player = playerRef.current

      if (!player) {
        return
      }

      const track = trackId === null ? undefined : textTracksRef.current.get(trackId)
      player.selectTextTrack(track ?? null)
      preferencesRef.current = updatePlayerPreferences({
        subtitles: track
          ? {
              language: track.language,
              label: track.label,
            }
          : null,
      })
      syncTracks()
    },
    [syncTracks],
  )

  const togglePictureInPicture = useCallback(() => {
    const video = videoRef.current

    if (!video || !("requestPictureInPicture" in video)) {
      return
    }

    void (document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : video.requestPictureInPicture())
  }, [])

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current

    if (!container?.requestFullscreen) {
      return
    }

    void (document.fullscreenElement ? document.exitFullscreen() : container.requestFullscreen())
  }, [])

  const controller = useMemo<ShakaVideoController>(
    () => ({
      status,
      loadedManifestUrl,
      ...playback,
      play,
      togglePlay,
      seekTo,
      setVolume,
      toggleMute,
      setPlaybackRate,
      selectQuality,
      selectTextTrack,
      togglePictureInPicture,
      toggleFullscreen,
    }),
    [
      playback,
      play,
      loadedManifestUrl,
      seekTo,
      selectQuality,
      selectTextTrack,
      setPlaybackRate,
      setVolume,
      status,
      toggleFullscreen,
      toggleMute,
      togglePictureInPicture,
      togglePlay,
    ],
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10",
        className,
      )}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        controls={false}
        playsInline
        poster={poster || undefined}
        aria-label={title}
      />

      {sourceReady && (status === "idle" || status === "ready") && (
        <PlayerMessage icon={<Play className="size-8" />} text="Нет доступного видео" />
      )}

      {(!sourceReady || status === "loading" || playback.isBuffering) && (
        <PlayerMessage
          icon={<Loader2 className="size-8 animate-spin" />}
          text={!sourceReady || status === "loading" ? "Загрузка видео..." : "Буферизация..."}
          transparent={sourceReady && status === "loaded"}
        />
      )}

      {sourceReady && status === "error" && (
        !isCriticalErrorDismissed && (
          <CriticalErrorMessage
            text={criticalError || "Не удалось загрузить видео"}
            canRetry={Boolean(manifestUrl)}
            onRetry={retryCurrentSource}
            onClose={() => setIsCriticalErrorDismissed(true)}
          />
        )
      )}

      {recoverableError && <RecoverableErrorNotice text={recoverableError} />}

      {/* Controller callbacks access refs only after user interaction. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {typeof overlay === "function" ? overlay(controller) : overlay}
    </div>
  )
}

function PlayerMessage({
  icon,
  text,
  transparent = false,
}: {
  icon: ReactNode
  text: string
  transparent?: boolean
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm font-medium text-white",
        transparent ? "bg-black/25" : "bg-black/70",
      )}
    >
      {icon}
      <span>{text}</span>
    </div>
  )
}

function RecoverableErrorNotice({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 top-4 z-40 flex max-w-[min(90%,32rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300/20 bg-zinc-950/90 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl"
    >
      <AlertCircle className="size-4 shrink-0 text-amber-300" />
      <span>{text}</span>
    </div>
  )
}

function CriticalErrorMessage({
  text,
  canRetry,
  onRetry,
  onClose,
}: {
  text: string
  canRetry: boolean
  onRetry: () => void
  onClose: () => void
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Ошибка воспроизведения"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-5 text-center text-white backdrop-blur-[2px]"
    >
      <button
        type="button"
        aria-label="Закрыть сообщение об ошибке"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/75 transition hover:bg-white/20 hover:text-white"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>

      <div className="flex max-w-md flex-col items-center">
        <AlertCircle className="size-10 text-red-400" />
        <p className="mt-4 text-base font-bold">Не удалось продолжить воспроизведение</p>
        <p className="mt-2 text-sm text-white/60">{text}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {canRetry && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black transition hover:bg-white/85"
              onClick={onRetry}
            >
              <RotateCcw className="size-4" />
              Повторить
            </button>
          )}
          <button
            type="button"
            className="rounded-full px-4 py-2 text-xs font-semibold text-white/55 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

function getBufferedEnd(video: HTMLVideoElement) {
  if (video.buffered.length === 0) {
    return 0
  }

  return video.buffered.end(video.buffered.length - 1)
}

function getQualityTracks(tracks: shaka.extern.Track[]) {
  const tracksByHeight = new Map<number, shaka.extern.Track>()

  tracks
    .filter((track) => track.height !== null)
    .sort((left, right) => right.bandwidth - left.bandwidth)
    .forEach((track) => {
      const height = track.height ?? 0
      const existing = tracksByHeight.get(height)

      if (!existing || track.active) {
        tracksByHeight.set(height, track)
      }
    })

  return Array.from(tracksByHeight.values()).sort(
    (left, right) => (right.height ?? 0) - (left.height ?? 0),
  )
}

function applyMediaPreferences(video: HTMLVideoElement | null, preferences: PlayerPreferences) {
  if (!video) {
    return
  }

  video.volume = preferences.volume
  video.muted = preferences.muted
  video.playbackRate = preferences.playbackRate
}

function findClosestQualityTrack(tracks: shaka.extern.Track[], preferredHeight: number) {
  return tracks.reduce<shaka.extern.Track | undefined>((closest, track) => {
    if (track.height === null) {
      return closest
    }

    if (!closest?.height) {
      return track
    }

    return Math.abs(track.height - preferredHeight) < Math.abs(closest.height - preferredHeight)
      ? track
      : closest
  }, undefined)
}

function findPreferredTextTrack(
  tracks: shaka.extern.TextTrack[],
  preference: PlayerPreferences["subtitles"],
) {
  if (!preference) {
    return null
  }

  return (
    tracks.find(
      (track) =>
        track.language === preference.language && track.label === preference.label,
    ) ?? null
  )
}

function formatQualityLabel(track: shaka.extern.Track) {
  return track.height ? `${track.height}p` : `${Math.round(track.bandwidth / 1000)} Кбит/с`
}

function formatShakaError(error: unknown) {
  const code = getShakaErrorCode(error)

  if (code) {
    return `Не удалось загрузить видео. Код ошибки: ${code}`
  }

  return "Не удалось загрузить видео."
}

function formatRecoverableShakaError(error: unknown) {
  const code = getShakaErrorCode(error)
  const message = "Проблемы с соединением. Пытаемся восстановить воспроизведение."

  return code ? `${message} Код ошибки: ${code}` : message
}

function getShakaErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : null
}

function isRecoverableShakaError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "severity" in error &&
    error.severity === shaka.util.Error.Severity.RECOVERABLE
  )
}
