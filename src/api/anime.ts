// Делаем string union для удобной типизации
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

export const ANIME_SEASONS = [
  "WINTER",
  "SPRING",
  "SUMMER",
  "FALL",
] as const
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
  page?: number,
  limit?: number,
  sortBy?: AnimeSortBy,
  sortOrder?: AnimeSortOrder,
}

export type AnimeTitle = {
  romaji: string,
  russian: string,
  native?: string,
  english?: string,
  other?: string[],
}

export type AnimeCoverImage = {
  original?: string | null,
  extraLarge?: string | null,
  large?: string | null,
  medium?: string | null,
  color?: string | null,
}

// Тип который возвращает бекенд
export type Anime = {
  id: number,
  title: AnimeTitle,
  status: AnimeStatus,
  format?: AnimeFormat,
  description?: string,
  startDateDay?: number,
  startDateMonth?: number,
  startDateYear?: number,
  endDateDay?: number,
  endDateMonth?: number,
  endDateYear?: number,
  season?: AnimeSeason,
  seasonYear?: number,
  episodes?: number,
  duration?: number,
  source?: AnimeSource,
  bannerImage?: string | null,
  genres?: string[],
  tags?: string[],
  studioId?: number,
  isAdult?: boolean,
  coverImage?: AnimeCoverImage | null,
  createdAt: Date,
  updatedAt: Date,
}

export type AnimeListMeta = {
  page: number,
  limit: number,
  total: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPrevPage: boolean,
}

export type AnimeListResponse = {
  data: Anime[],
  meta: AnimeListMeta,
}

// Функция для получения списка аниме (будем использовать в TanStack Query)
export async function getAnimeList(params?: AnimeListQueryParams): Promise<AnimeListResponse> {
  const url = new URL("/v1/anime", import.meta.env.VITE_API_URL)

  if (params?.page !== undefined) {
    url.searchParams.set("page", String(params.page))
  }

  if (params?.limit !== undefined) {
    url.searchParams.set("limit", String(params.limit))
  }

  if (params?.sortBy !== undefined) {
    url.searchParams.set("sortBy", params.sortBy)
  }

  if (params?.sortOrder !== undefined) {
    url.searchParams.set("sortOrder", params.sortOrder)
  }

  const response = await fetch(url, {
    credentials: "include" // Отправляем куки чтобы сервер узнал нас
  })

  if (!response.ok) {
    throw new Error("Failed to fetch anime list")
  }

  return response.json() as Promise<AnimeListResponse>
}
