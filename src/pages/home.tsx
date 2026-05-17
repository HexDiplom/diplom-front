import { useState } from "react"

import { useAnimeList } from "@/hooks/use-anime-list"

import { AnimeCard } from "@/components/anime/anime-card"

export default function Home() {
  const [page] = useState(1)

  const {
    data: animeList,
    isPending,
    isError,
    error,
  } = useAnimeList({
    page,
    limit: 10,
    sortBy: "updatedAt",
    sortOrder: "desc",
  })

  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="mb-6 text-3xl font-bold">
          Новинки
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="h-[320px] animate-pulse rounded-2xl bg-muted"
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-10 text-red-400">
        Ошибка: {error.message}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section>
        <h2 className="mb-6 text-3xl font-bold">
          Новинки
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {animeList?.map((anime: any) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
            />
          ))}
        </div>
      </section>
    </div>
  )
}