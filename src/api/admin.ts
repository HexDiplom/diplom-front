export const ADMIN_ANIME_STATUSES = [
  "FINISHED",
  "RELEASING",
  "NOT_YET_RELEASED",
  "CANCELLED",
  "HIATUS",
] as const

export const ADMIN_ANIME_FORMATS = [
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
  "OTHER",
] as const

export const ADMIN_ANIME_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const

export const ADMIN_ANIME_SOURCES = [
  "ORIGINAL",
  "MANGA",
  "LIGHT_NOVEL",
  "VISUAL_NOVEL",
  "VIDEO_GAME",
  "OTHER",
] as const

export type EntityId = string | number
export type AdminSortOrder = "asc" | "desc"
export type AnimeStatus = (typeof ADMIN_ANIME_STATUSES)[number]
export type AnimeFormat = (typeof ADMIN_ANIME_FORMATS)[number]
export type AnimeSeason = (typeof ADMIN_ANIME_SEASONS)[number]
export type AnimeSource = (typeof ADMIN_ANIME_SOURCES)[number]

export type AdminListParams = {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: AdminSortOrder
  animeId?: number | string
  episodeId?: string
}

export type AdminListMeta = {
  page?: number
  limit?: number
  total?: number
  totalPages?: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export type AdminListResponse<T> = {
  data: T[]
  meta?: AdminListMeta
}

export type AnimeTitle = {
  romaji?: string
  russian?: string
  native?: string | null
  english?: string | null
  other?: string[] | null
}

export type AnimeCoverImage = {
  original?: string | null
  extraLarge?: string | null
  large?: string | null
  medium?: string | null
  color?: string | null
}

export type Anime = {
  id: number
  title?: AnimeTitle
  status?: AnimeStatus
  format?: AnimeFormat | null
  description?: string | null
  startDateDay?: number | null
  startDateMonth?: number | null
  startDateYear?: number | null
  endDateDay?: number | null
  endDateMonth?: number | null
  endDateYear?: number | null
  season?: AnimeSeason | null
  seasonYear?: number | null
  episodes?: number | null
  duration?: number | null
  source?: AnimeSource | null
  bannerImage?: string | null
  genres?: string[] | null
  tags?: string[] | null
  studioId?: number | null
  isAdult?: boolean
  coverImage?: AnimeCoverImage | null
  createdAt?: string
  updatedAt?: string
}

export type AnimeCreatePayload = Omit<AnimeUpdatePayload, "title" | "coverImage"> & {
  status: AnimeStatus
  title: Required<Pick<AnimeTitle, "romaji" | "russian">> & AnimeTitle
  coverImage?: AnimeCoverImage
}

export type AnimeUpdatePayload = {
  format?: AnimeFormat
  status?: AnimeStatus
  description?: string | null
  startDateDay?: number | null
  startDateMonth?: number | null
  startDateYear?: number | null
  endDateDay?: number | null
  endDateMonth?: number | null
  endDateYear?: number | null
  season?: AnimeSeason | null
  seasonYear?: number | null
  episodes?: number | null
  duration?: number | null
  source?: AnimeSource | null
  bannerImage?: string | null
  genres?: string[] | null
  tags?: string[] | null
  studioId?: number | null
  isAdult?: boolean
}

export type Studio = {
  id: number
  logo?: string | null
  createdAt?: string
  updatedAt?: string
}

export type StudioPayload = {
  logo?: string | null
}

export type Episode = {
  id: string
  animeId?: number
  number?: number
  duration?: string | null
  thumbnailUrl?: string | null
  name?: string | null
  description?: string | null
  isFiller?: boolean | null
  createdAt?: string
  updatedAt?: string
}

export type EpisodeCreatePayload = {
  animeId: number
  number: number
  duration?: string | null
  thumbnailUrl?: string | null
  name?: string | null
  description?: string | null
  isFiller?: boolean | null
}

export type EpisodeUpdatePayload = Partial<EpisodeCreatePayload>

export type EpisodeVideo = {
  id: string
  episodeId?: string
  manifestUrl?: string
  container?: string | null
  availableResolutions?: string[] | null
  voiceoverName?: string | null
  status?: string | null
  createdAt?: string
  updatedAt?: string
}

export type EpisodeVideoCreatePayload = {
  episodeId: string
  manifestUrl: string
  container?: string | null
  availableResolutions?: string[] | null
  voiceoverName?: string | null
  status?: string | null
}

export type EpisodeVideoUpdatePayload = Partial<EpisodeVideoCreatePayload>

export type AnimeTrailer = {
  id?: EntityId
  trailerId?: EntityId
  videoUrl?: string
  thumbnailUrl?: string | null
  createdAt?: string
}

export type AnimeTrailerPayload = {
  videoUrl: string
  thumbnailUrl?: string | null
}

export type AnimeRelation = {
  id?: EntityId
  relationId?: EntityId
  relatedAnimeId?: number
  relationType?: string
  createdAt?: string
}

export type AnimeRelationPayload = {
  relatedAnimeId: number
  relationType: string
}

type QueryValue = string | number | boolean | null | undefined
type RequestOptions = RequestInit & {
  query?: Record<string, QueryValue>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(path, import.meta.env.VITE_API_URL)

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  return url
}

function getApiErrorMessage(payload: unknown, status: number) {
  if (isRecord(payload)) {
    const message = payload.message ?? payload.error

    if (typeof message === "string") {
      return message
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload
  }

  return `Request failed with status ${status}`
}

async function readPayload(response: Response) {
  if (response.status === 204) {
    return undefined
  }

  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    try {
      return await response.json()
    } catch {
      return undefined
    }
  }

  return response.text()
}

async function adminRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, headers, ...init } = options
  const response = await fetch(buildUrl(path, query), {
    credentials: "include",
    headers,
    ...init,
  })
  const payload = await readPayload(response)

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, response.status))
  }

  return payload as T
}

function getJson<T>(path: string, query?: Record<string, QueryValue>) {
  return adminRequest<T>(path, { method: "GET", query })
}

function sendJson<T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown) {
  return adminRequest<T>(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function sendFile<T>(path: string, file: File) {
  const formData = new FormData()
  formData.append("file", file)

  return adminRequest<T>(path, {
    method: "POST",
    body: formData,
  })
}

function normalizeListResponse<T>(payload: unknown): AdminListResponse<T> {
  if (Array.isArray(payload)) {
    return {
      data: payload as T[],
      meta: {
        page: 1,
        limit: payload.length,
        total: payload.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  }

  if (isRecord(payload)) {
    const data = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.items)
        ? payload.items
        : []

    return {
      data: data as T[],
      meta: isRecord(payload.meta) ? (payload.meta as AdminListMeta) : undefined,
    }
  }

  return { data: [] }
}

async function getList<T>(path: string, query?: AdminListParams) {
  return normalizeListResponse<T>(await getJson<unknown>(path, query))
}

const encodeId = (id: EntityId) => encodeURIComponent(String(id))

export const adminApi = {
  listAnime: (params?: AdminListParams) => getList<Anime>("/v1/anime/", params),
  getAnime: (id: EntityId) => getJson<Anime>(`/v1/anime/${encodeId(id)}`),
  createAnime: (payload: AnimeCreatePayload) => sendJson<Anime>("/v1/anime/", "POST", payload),
  updateAnime: (id: EntityId, payload: AnimeUpdatePayload) =>
    sendJson<Anime>(`/v1/anime/${encodeId(id)}`, "PUT", payload),
  deleteAnime: (id: EntityId) => sendJson<void>(`/v1/anime/${encodeId(id)}`, "DELETE"),
  updateAnimeTitle: (id: EntityId, payload: AnimeTitle) =>
    sendJson<Anime>(`/v1/anime/${encodeId(id)}/title`, "PUT", payload),
  updateAnimeCover: (id: EntityId, payload: AnimeCoverImage) =>
    sendJson<Anime>(`/v1/anime/${encodeId(id)}/cover`, "PUT", payload),
  uploadAnimeBanner: (id: EntityId, file: File) =>
    sendFile<Anime>(`/v1/anime/${encodeId(id)}/images/banner`, file),
  uploadAnimeCover: (id: EntityId, file: File) =>
    sendFile<Anime>(`/v1/anime/${encodeId(id)}/images/cover`, file),
  listAnimeTrailers: (id: EntityId, params?: AdminListParams) =>
    getList<AnimeTrailer>(`/v1/anime/${encodeId(id)}/trailers`, params),
  createAnimeTrailer: (id: EntityId, payload: AnimeTrailerPayload) =>
    sendJson<AnimeTrailer>(`/v1/anime/${encodeId(id)}/trailers`, "POST", payload),
  deleteAnimeTrailer: (trailerId: EntityId) =>
    sendJson<void>(`/v1/anime/trailers/${encodeId(trailerId)}`, "DELETE"),
  uploadAnimeTrailerThumbnail: (trailerId: EntityId, file: File) =>
    sendFile<AnimeTrailer>(`/v1/anime/trailers/${encodeId(trailerId)}/images/thumbnail`, file),
  listAnimeRelations: (id: EntityId, params?: AdminListParams) =>
    getList<AnimeRelation>(`/v1/anime/${encodeId(id)}/relations`, params),
  createAnimeRelation: (id: EntityId, payload: AnimeRelationPayload) =>
    sendJson<AnimeRelation>(`/v1/anime/${encodeId(id)}/relations`, "POST", payload),
  deleteAnimeRelation: (relationId: EntityId) =>
    sendJson<void>(`/v1/anime/relations/${encodeId(relationId)}`, "DELETE"),

  listStudios: (params?: AdminListParams) => getList<Studio>("/v1/studio/", params),
  getStudio: (id: EntityId) => getJson<Studio>(`/v1/studio/${encodeId(id)}`),
  createStudio: (payload: StudioPayload) => sendJson<Studio>("/v1/studio/", "POST", payload),
  updateStudio: (id: EntityId, payload: StudioPayload) =>
    sendJson<Studio>(`/v1/studio/${encodeId(id)}`, "PUT", payload),
  deleteStudio: (id: EntityId) => sendJson<void>(`/v1/studio/${encodeId(id)}`, "DELETE"),
  uploadStudioLogo: (id: EntityId, file: File) =>
    sendFile<Studio>(`/v1/studio/${encodeId(id)}/images/logo`, file),

  listEpisodes: (params?: AdminListParams) => getList<Episode>("/v1/episode/", params),
  getEpisode: (id: EntityId) => getJson<Episode>(`/v1/episode/${encodeId(id)}`),
  createEpisode: (payload: EpisodeCreatePayload) =>
    sendJson<Episode>("/v1/episode/", "POST", payload),
  updateEpisode: (id: EntityId, payload: EpisodeUpdatePayload) =>
    sendJson<Episode>(`/v1/episode/${encodeId(id)}`, "PUT", payload),
  deleteEpisode: (id: EntityId) => sendJson<void>(`/v1/episode/${encodeId(id)}`, "DELETE"),
  uploadEpisodeThumbnail: (id: EntityId, file: File) =>
    sendFile<Episode>(`/v1/episode/${encodeId(id)}/images/thumbnail`, file),

  listEpisodeVideos: (params?: AdminListParams) =>
    getList<EpisodeVideo>("/v1/episode-video/", params),
  getEpisodeVideo: (id: EntityId) =>
    getJson<EpisodeVideo>(`/v1/episode-video/${encodeId(id)}`),
  createEpisodeVideo: (payload: EpisodeVideoCreatePayload) =>
    sendJson<EpisodeVideo>("/v1/episode-video/", "POST", payload),
  updateEpisodeVideo: (id: EntityId, payload: EpisodeVideoUpdatePayload) =>
    sendJson<EpisodeVideo>(`/v1/episode-video/${encodeId(id)}`, "PUT", payload),
  deleteEpisodeVideo: (id: EntityId) =>
    sendJson<void>(`/v1/episode-video/${encodeId(id)}`, "DELETE"),
}
