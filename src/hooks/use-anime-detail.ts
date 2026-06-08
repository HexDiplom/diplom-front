import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import {
  getAnime,
  getAnimeEpisodes,
  getAnimeRelations,
  getAnimeTrailers,
  getEpisode,
  getStudio,
} from "@/api/anime"

export function useAnimeDetail(id?: string) {
  return useQuery({
    queryKey: ["anime", "detail", id],
    queryFn: () => getAnime(id ?? ""),
    enabled: Boolean(id),
  })
}

export function useAnimeStudio(studioId?: number | null) {
  return useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => getStudio(studioId ?? 0),
    enabled: Boolean(studioId),
  })
}

export function useAnimeTrailers(id?: string) {
  return useQuery({
    queryKey: ["anime", "trailers", id],
    queryFn: () => getAnimeTrailers(id ?? ""),
    enabled: Boolean(id),
  })
}

export function useAnimeRelations(id?: string) {
  return useQuery({
    queryKey: ["anime", "relations", id],
    queryFn: () => getAnimeRelations(id ?? ""),
    enabled: Boolean(id),
  })
}

export function useAnimeEpisodes(id?: string) {
  return useInfiniteQuery({
    queryKey: ["anime", "episodes", id],
    queryFn: ({ pageParam }) => getAnimeEpisodes(id ?? "", pageParam),
    enabled: Boolean(id),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  })
}

export function useEpisode(id?: string) {
  return useQuery({
    queryKey: ["episode", id],
    queryFn: () => getEpisode(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  })
}
