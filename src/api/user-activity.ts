import type { Anime, Episode, ListResponse } from "@/api/anime"

export type WatchProgress = {
  userId: string
  episodeId: string
  positionSeconds: number
  completed: boolean
  createdAt: string
  updatedAt: string
}

export type WatchHistoryItem = {
  anime: Anime
  episode: Episode
  positionSeconds: number
  completed: boolean
  updatedAt: string
}

export type ContinueWatchingItem = {
  anime: Anime
  episode: Episode
  positionSeconds: number
  lastWatchedAt: string
}

export type FavoriteItem = {
  anime: Anime
  addedAt: string
}

export type AnimeUserState = {
  animeId: number
  isFavorite: boolean
  userRating: number | null
  averageRating: number | null
  ratingCount: number
  continueWatching: ContinueWatchingItem | null
}

export type ActivityListParams = {
  page?: number
  limit?: number
  sortOrder?: "asc" | "desc"
}

type RequestOptions = RequestInit & {
  query?: ActivityListParams
}

function buildUrl(path: string, query?: ActivityListParams) {
  const url = new URL(path, import.meta.env.VITE_API_URL)

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  })

  return url
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const { query, headers, ...init } = options
  const response = await fetch(buildUrl(path, query), {
    credentials: "include",
    headers,
    ...init,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Не удалось выполнить запрос (${response.status})`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

function sendJson<T>(path: string, method: "PUT" | "DELETE", body?: unknown) {
  return request<T>(path, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function updateWatchProgress(
  episodeId: string,
  data: { positionSeconds: number; completed: boolean },
  keepalive = false,
) {
  return request<WatchProgress>(
    `/v1/me/watch-progress/${encodeURIComponent(episodeId)}`,
    {
      method: "PUT",
      keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  )
}

export function getWatchHistory(params?: ActivityListParams) {
  return request<ListResponse<WatchHistoryItem>>("/v1/me/watch-history", {
    query: params,
  })
}

export function getContinueWatching(params?: ActivityListParams) {
  return request<ListResponse<ContinueWatchingItem>>("/v1/me/continue-watching", {
    query: params,
  })
}

export function getFavorites(params?: ActivityListParams) {
  return request<ListResponse<FavoriteItem>>("/v1/me/favorites", { query: params })
}

export function addFavorite(animeId: number | string) {
  return sendJson<unknown>(`/v1/me/favorites/${encodeURIComponent(String(animeId))}`, "PUT")
}

export function deleteFavorite(animeId: number | string) {
  return sendJson<void>(`/v1/me/favorites/${encodeURIComponent(String(animeId))}`, "DELETE")
}

export function setRating(animeId: number | string, rating: number) {
  return sendJson<unknown>(`/v1/me/ratings/${encodeURIComponent(String(animeId))}`, "PUT", {
    rating,
  })
}

export function deleteRating(animeId: number | string) {
  return sendJson<void>(`/v1/me/ratings/${encodeURIComponent(String(animeId))}`, "DELETE")
}

export function getAnimeUserState(animeId: number | string) {
  return request<AnimeUserState>(`/v1/me/anime/${encodeURIComponent(String(animeId))}`)
}
