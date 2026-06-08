import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import {
  getAnimeUserState,
  getContinueWatching,
  getFavorites,
  getWatchHistory,
} from "@/api/user-activity"

export const userActivityKeys = {
  all: ["user-activity"] as const,
  history: ["user-activity", "history"] as const,
  continueWatching: ["user-activity", "continue-watching"] as const,
  favorites: ["user-activity", "favorites"] as const,
  anime: (animeId: number | string) => ["user-activity", "anime", String(animeId)] as const,
}

export function useWatchHistory(enabled: boolean) {
  return useQuery({
    queryKey: userActivityKeys.history,
    queryFn: () => getWatchHistory({ page: 1, limit: 100, sortOrder: "desc" }),
    enabled,
  })
}

export function useContinueWatching(enabled: boolean) {
  return useQuery({
    queryKey: userActivityKeys.continueWatching,
    queryFn: () => getContinueWatching({ page: 1, limit: 1, sortOrder: "desc" }),
    enabled,
  })
}

export function useInfiniteFavorites(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: userActivityKeys.favorites,
    queryFn: ({ pageParam }) =>
      getFavorites({ page: pageParam, limit: 20, sortOrder: "desc" }),
    enabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  })
}

export function useAnimeUserState(animeId: number | string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: userActivityKeys.anime(animeId ?? ""),
    queryFn: () => getAnimeUserState(animeId ?? ""),
    enabled: enabled && animeId !== undefined,
  })
}
