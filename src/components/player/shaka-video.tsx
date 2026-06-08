import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AlertCircle, Loader2, Play } from "lucide-react"
import shaka from "shaka-player/dist/shaka-player.compiled"

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
  poster?: string | null
  title?: string
  className?: string
  overlay?: ReactNode | ((controller: ShakaVideoController) => ReactNode)
}

type PlaybackState = Pick<
  ShakaVideoController,
  | "isPlaying"
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
  const [isRuntimeReady, setIsRuntimeReady] = useState(false)
  const [status, setStatus] = useState<PlayerStatus>("idle")
  const [loadedManifestUrl, setLoadedManifestUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playback, setPlayback] = useState(initialPlaybackState)

  const syncMediaState = useCallback(() => {
    const video = videoRef.current
    const container = containerRef.current

    if (!video || !container) {
      return
    }

    setPlayback((current) => ({
      ...current,
      isPlaying: !video.paused && !video.ended,
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
        setError("Этот браузер не поддерживает воспроизведение потокового видео.")
      })

      return () => {
        isActive = false
      }
    }

    const player = new shaka.Player(video)
    const handleError = (event: Event) => {
      const detail = "detail" in event ? (event as CustomEvent<unknown>).detail : event

      setStatus("error")
      setError(formatShakaError(detail))
    }
    const handleBuffering = () => {
      setPlayback((current) => ({ ...current, isBuffering: player.isBuffering() }))
    }
    const handleFullscreenChange = () => syncMediaState()
    const mediaEvents = [
      "play",
      "pause",
      "ended",
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
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      playerRef.current = null
      void player.destroy()
    }
  }, [syncMediaState, syncTracks])

  useEffect(() => {
    const player = playerRef.current

    if (!isRuntimeReady || !player) {
      return
    }

    let isCancelled = false

    async function loadSource() {
      const video = videoRef.current
      const shouldResumePlayback = Boolean(video && !video.paused && !video.ended)

      await player?.unload()
      setLoadedManifestUrl(null)

      if (isCancelled) {
        return
      }

      if (!manifestUrl) {
        setStatus("idle")
        setError(null)
        setPlayback((current) => ({
          ...initialPlaybackState,
          canPictureInPicture: current.canPictureInPicture,
          canFullscreen: current.canFullscreen,
        }))
        return
      }

      setStatus("loading")
      setError(null)

      try {
        await player?.load(manifestUrl)

        if (!isCancelled) {
          setStatus("loaded")
          setLoadedManifestUrl(manifestUrl)
          syncTracks()
          syncMediaState()

          if (shouldResumePlayback) {
            void video?.play().catch(() => undefined)
          }
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setStatus("error")
          setLoadedManifestUrl(null)
          setError(formatShakaError(caughtError))
        }
      }
    }

    void loadSource()

    return () => {
      isCancelled = true
    }
  }, [isRuntimeReady, manifestUrl, syncMediaState, syncTracks])

  const togglePlay = useCallback(() => {
    const video = videoRef.current

    if (!video) {
      return
    }

    if (video.paused) {
      void video.play().catch((caughtError: unknown) => {
        setStatus("error")
        setError(formatShakaError(caughtError))
      })
    } else {
      video.pause()
    }
  }, [])

  const play = useCallback(() => {
    const video = videoRef.current

    if (video?.paused) {
      void video.play().catch(() => undefined)
    }
  }, [])

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current

    if (!video || !Number.isFinite(time)) {
      return
    }

    video.currentTime = Math.max(0, Math.min(time, Number.isFinite(video.duration) ? video.duration : time))
  }, [])

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current

    if (!video) {
      return
    }

    video.volume = Math.max(0, Math.min(volume, 1))
    video.muted = video.volume === 0
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current

    if (video) {
      video.muted = !video.muted
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current

    if (video) {
      video.playbackRate = rate
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
      } else {
        const track = variantTracksRef.current.get(quality)

        if (!track) {
          return
        }

        player.configure({ abr: { enabled: false } })
        player.selectVariantTrack(track, true, 5)
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

      player.selectTextTrack(trackId === null ? null : textTracksRef.current.get(trackId))
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

      {(status === "idle" || status === "ready") && (
        <PlayerMessage icon={<Play className="size-8" />} text="Нет доступного видео" />
      )}

      {(status === "loading" || playback.isBuffering) && (
        <PlayerMessage
          icon={<Loader2 className="size-8 animate-spin" />}
          text={status === "loading" ? "Загрузка видео..." : "Буферизация..."}
          transparent={status === "loaded"}
        />
      )}

      {status === "error" && (
        <PlayerMessage
          icon={<AlertCircle className="size-8 text-destructive" />}
          text={error || "Не удалось загрузить видео"}
        />
      )}

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

function formatQualityLabel(track: shaka.extern.Track) {
  return track.height ? `${track.height}p` : `${Math.round(track.bandwidth / 1000)} Кбит/с`
}

function formatShakaError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    return `Не удалось загрузить видео. Код ошибки: ${String(error.code)}`
  }

  return "Не удалось загрузить видео."
}
