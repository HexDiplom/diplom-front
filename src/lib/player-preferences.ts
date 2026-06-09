const PLAYER_PREFERENCES_KEY = "anime-player-preferences"
const PLAYER_PREFERENCES_VERSION = 1
const ALLOWED_PLAYBACK_RATES = new Set([0.5, 0.75, 1, 1.25, 1.5, 2])

export type PlayerSubtitlePreference = {
  language: string
  label: string | null
}

export type PlayerPreferences = {
  version: typeof PLAYER_PREFERENCES_VERSION
  volume: number
  muted: boolean
  playbackRate: number
  quality: "auto" | number
  subtitles: PlayerSubtitlePreference | null
  voiceoverName: string | null
}

export const defaultPlayerPreferences: PlayerPreferences = {
  version: PLAYER_PREFERENCES_VERSION,
  volume: 1,
  muted: false,
  playbackRate: 1,
  quality: "auto",
  subtitles: null,
  voiceoverName: null,
}

export function getPlayerPreferences(): PlayerPreferences {
  try {
    const stored = localStorage.getItem(PLAYER_PREFERENCES_KEY)

    if (!stored) {
      return { ...defaultPlayerPreferences }
    }

    return parsePlayerPreferences(JSON.parse(stored))
  } catch {
    return { ...defaultPlayerPreferences }
  }
}

export function updatePlayerPreferences(
  patch: Partial<Omit<PlayerPreferences, "version">>,
) {
  const preferences = parsePlayerPreferences({
    ...getPlayerPreferences(),
    ...patch,
    version: PLAYER_PREFERENCES_VERSION,
  })

  try {
    localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Playback preferences are optional when browser storage is unavailable.
  }

  return preferences
}

function parsePlayerPreferences(value: unknown): PlayerPreferences {
  if (!isRecord(value) || value.version !== PLAYER_PREFERENCES_VERSION) {
    return { ...defaultPlayerPreferences }
  }

  return {
    version: PLAYER_PREFERENCES_VERSION,
    volume: isFiniteNumber(value.volume) ? Math.max(0, Math.min(value.volume, 1)) : 1,
    muted: typeof value.muted === "boolean" ? value.muted : false,
    playbackRate:
      isFiniteNumber(value.playbackRate) && ALLOWED_PLAYBACK_RATES.has(value.playbackRate)
        ? value.playbackRate
        : 1,
    quality:
      value.quality === "auto" || (isFiniteNumber(value.quality) && value.quality > 0)
        ? value.quality
        : "auto",
    subtitles: parseSubtitlePreference(value.subtitles),
    voiceoverName: typeof value.voiceoverName === "string" ? value.voiceoverName : null,
  }
}

function parseSubtitlePreference(value: unknown): PlayerSubtitlePreference | null {
  if (
    !isRecord(value) ||
    typeof value.language !== "string" ||
    (value.label !== null && typeof value.label !== "string")
  ) {
    return null
  }

  return {
    language: value.language,
    label: value.label,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
