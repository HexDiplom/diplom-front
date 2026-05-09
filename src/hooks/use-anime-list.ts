import { useQuery } from "@tanstack/react-query"
import { getAnimeList } from "@/api/anime"

export function useAnimeList() {
  return useQuery({
    queryKey: ["anime"],
    queryFn: getAnimeList,
  })
}
