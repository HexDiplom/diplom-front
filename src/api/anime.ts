export const ANIME_STATUSES = [
  "FINISHED",
  "RELEASING",
  "NOT_YET_RELEASED",
  "CANCELLED",
  "HIATUS",
] as const
export type AnimeStatus = (typeof ANIME_STATUSES)[number]

export const ANIME_FORMATS = [
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
  "OTHER",
] as const
export type AnimeFormat = (typeof ANIME_FORMATS)[number]

export const ANIME_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"] as const
export type AnimeSeason = (typeof ANIME_SEASONS)[number]

export const ANIME_SOURCES = [
  "ORIGINAL",
  "MANGA",
  "LIGHT_NOVEL",
  "VISUAL_NOVEL",
  "VIDEO_GAME",
  "OTHER",
] as const
export type AnimeSource = (typeof ANIME_SOURCES)[number]

export const ANIME_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "startDate",
  "endDate",
  "seasonYear",
  "episodes",
  "duration",
  "titleRussian",
  "id",
] as const
export type AnimeSortBy = (typeof ANIME_SORT_FIELDS)[number]

export type AnimeSortOrder = "asc" | "desc"

export type AnimeListQueryParams = {
  page?: number
  limit?: number
  sortBy?: AnimeSortBy
  sortOrder?: AnimeSortOrder
}

export type AnimeTitle = {
  romaji: string
  russian: string
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

export type AnimeTrailer = {
  id?: string | number
  trailerId?: string | number
  videoUrl?: string | null
  thumbnailUrl?: string | null
}

export type AnimeRelation = {
  id?: string | number
  relationId?: string | number
  relatedAnimeId?: number
  relationType?: string | null
}

export type Anime = {
  id: number
  title: AnimeTitle
  averageRating?: number | null
  ratingCount?: number
  status: AnimeStatus
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
  trailers?: AnimeTrailer[] | null
  createdAt: string
  updatedAt: string
}

export type Studio = {
  id: number
  logo?: string | null
}

export type EpisodeVideo = {
  id: string
  episodeId: string
  manifestUrl?: string | null
  container?: string | null
  availableResolutions?: string[] | null
  voiceoverName?: string | null
  status?: string | null
  statusReason?: string | null
}

export type Episode = {
  id: string
  animeId: number
  number: number
  duration?: string | null
  thumbnailUrl?: string | null
  name?: string | null
  description?: string | null
  isFiller?: boolean | null
  videos?: EpisodeVideo[] | null
}

export type ListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type ListResponse<T> = {
  data: T[]
  meta: ListMeta
}

export type AnimeListResponse = ListResponse<Anime>

type QueryValue = string | number | boolean | null | undefined

function buildUrl(path: string, query?: object) {
  const url = new URL(path, import.meta.env.VITE_API_URL)

  Object.entries(query ?? {}).forEach(([key, value]: [string, QueryValue]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })

  return url
}

async function getJson<T>(path: string, query?: object) {
  const response = await fetch(buildUrl(path, query), {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "Запрошенные данные не найдены"
        : `Не удалось загрузить данные (${response.status})`,
    )
  }

  return response.json() as Promise<T>
}

export function getAnimeList(params?: AnimeListQueryParams) {
  return getJson<AnimeListResponse>("/v1/anime/", params)
}

export function getAnime(id: number | string) {
  return getJson<Anime>(`/v1/anime/${encodeURIComponent(String(id))}`)
}

export function getStudio(id: number | string) {
  return getJson<Studio>(`/v1/studio/${encodeURIComponent(String(id))}`)
}

export function getAnimeTrailers(id: number | string) {
  return getJson<ListResponse<AnimeTrailer>>(
    `/v1/anime/${encodeURIComponent(String(id))}/trailers`,
    { page: 1, limit: 100, sortBy: "id", sortOrder: "asc" },
  )
}

export function getAnimeRelations(id: number | string) {
  return getJson<ListResponse<AnimeRelation>>(
    `/v1/anime/${encodeURIComponent(String(id))}/relations`,
    { page: 1, limit: 100, sortBy: "id", sortOrder: "asc" },
  )
}

export function getAnimeEpisodes(animeId: number | string, page = 1) {
  return getJson<ListResponse<Episode>>("/v1/episode/", {
    animeId,
    page,
    limit: 100,
    sortBy: "number",
    sortOrder: "asc",
  })
}

export function getEpisode(id: string) {
  return getJson<Episode>(`/v1/episode/${encodeURIComponent(id)}`)
}
