import { useQuery } from "@tanstack/react-query"
import { getAnimeList } from "@/api/anime"
import type { AnimeListQueryParams } from "@/api/anime"

export function useAnimeList(params?: AnimeListQueryParams) {
  return useQuery({
    queryKey: ["anime", params],
    queryFn: () => getAnimeList(params),
  })
}
