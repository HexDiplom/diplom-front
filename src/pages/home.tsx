import { useAnimeList } from "@/hooks/use-anime-list"

export default function Home() {
  const { data: animeList, isPending, isError, error } = useAnimeList()

  if (isPending) {
    console.log("Списка нет в кеше, ожидайте")
  }

  if (isError) {
    console.log("Ошибка при получеии аниме: ", error.message)
  }

  // из-за StrictMode запрос может пройти два раза, это нормально, фикситься если собрать проект.
  if (animeList && animeList.length > 0) {
    console.log(animeList)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-7xl items-center justify-center px-4">
      {/*<div className="w-full rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
      </div>*/}
    </div>
    )
}
