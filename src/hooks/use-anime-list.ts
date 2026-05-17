import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { getAnimeList } from "@/api/anime"
import type { AnimeListQueryParams } from "@/api/anime"

export function useAnimeList(params?: AnimeListQueryParams) {
  return useQuery({
    queryKey: ["anime", params],
    queryFn: () => getAnimeList(params),
  })
}

export function useInfiniteAnimeList(params?: Omit<AnimeListQueryParams, "page">) {
  return useInfiniteQuery({
    queryKey: ["anime", "infinite", params],
    queryFn: ({ pageParam }) => getAnimeList({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  })
}
