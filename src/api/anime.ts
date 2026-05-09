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
  "MOVIE",
  "OVA",
  "ONA",
  "SPECIAL",
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

export type AnimeTitle = {
  romaji: string,
  russian: string,
  native?: string,
  english?: string,
  other?: string,
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
  bannerImage?: string,
  genres?: string[],
  tags?: string[],
  studioId?: number,
  isAdult?: boolean,
  coverImage?: string,
  createdAt: Date,
  updatedAt: Date,
}

// Функция для получения списка аниме (будем использовать в TanStack Query)
export async function getAnimeList(): Promise<Anime[]> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/anime`, {
    credentials: "include" // Отправляем куки чтобы сервер узнал нас
  })

  if (!response.ok) {
    throw new Error("Failed to fetch anime list")
  }

  return response.json() as Promise<Anime[]> // Указываем что возвращать будет именно тип массив Anime
}
