import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Bookmark, Loader2, LogIn, Trash2 } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { deleteFavorite, type FavoriteItem } from "@/api/user-activity"
import { Button } from "@/components/ui/button"
import { useAuthPrompt } from "@/hooks/use-auth-prompt"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useInfiniteFavorites, userActivityKeys } from "@/hooks/use-user-activity"
import { authClient } from "@/lib/auth-client"

export default function FavoritesPage() {
  useDocumentTitle("Избранное")

  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const { openAuthPrompt } = useAuthPrompt()
  const queryClient = useQueryClient()
  const isAuthenticated = Boolean(session?.user)
  const favoritesQuery = useInfiniteFavorites(isAuthenticated)
  const removeMutation = useMutation({
    mutationFn: deleteFavorite,
    onSuccess: async (_, animeId) => {
      toast.success("Удалено из избранного")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userActivityKeys.favorites }),
        queryClient.invalidateQueries({ queryKey: userActivityKeys.anime(animeId) }),
      ])
    },
    onError: () => toast.error("Не удалось удалить из избранного"),
  })
  const favorites = favoritesQuery.data?.pages.flatMap((page) => page.data) ?? []

  if (isSessionPending) {
    return <FavoritesSkeleton />
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center justify-center px-4 py-12">
        <div className="max-w-lg rounded-4xl border bg-card p-8 text-center shadow-lg">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bookmark className="size-7" />
          </span>
          <h1 className="mt-5 text-3xl font-bold">Ваше избранное</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Войдите, чтобы собирать любимые тайтлы и открывать свою коллекцию с любого
            устройства.
          </p>
          <Button className="mt-6 rounded-full" onClick={openAuthPrompt}>
            <LogIn className="size-4" />
            Войти в аккаунт
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Избранное</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Тайтлы, которые вы сохранили для просмотра.
        </p>
      </div>

      {favoritesQuery.isPending ? (
        <FavoritesGridSkeleton />
      ) : favoritesQuery.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-sm text-destructive">
          Не удалось загрузить избранное.
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-3xl border bg-card px-6 py-12 text-center">
          <Bookmark className="mx-auto size-9 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-bold">Здесь пока пусто</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Добавляйте аниме в избранное на странице тайтла.
          </p>
          <Button asChild variant="outline" className="mt-5 rounded-full">
            <Link to="/">Перейти к новинкам</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5">
            {favorites.map((favorite) => (
              <FavoriteCard
                key={favorite.anime.id}
                favorite={favorite}
                isRemoving={
                  removeMutation.isPending &&
                  String(removeMutation.variables) === String(favorite.anime.id)
                }
                onRemove={() => removeMutation.mutate(favorite.anime.id)}
              />
            ))}
          </div>

          {favoritesQuery.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="secondary"
                className="rounded-full"
                disabled={favoritesQuery.isFetchingNextPage}
                onClick={() => favoritesQuery.fetchNextPage()}
              >
                {favoritesQuery.isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
                {favoritesQuery.isFetchingNextPage ? "Загрузка..." : "Показать ещё"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FavoriteCard({
  favorite,
  isRemoving,
  onRemove,
}: {
  favorite: FavoriteItem
  isRemoving: boolean
  onRemove: () => void
}) {
  const { anime } = favorite
  const title = anime.title.russian || anime.title.romaji || anime.title.english || "Без названия"
  const cover =
    anime.coverImage?.large ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.medium ||
    anime.coverImage?.original

  return (
    <div className="group relative min-w-0">
      <Link to={`/anime/${anime.id}`} className="block min-w-0 rounded-xl outline-none">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-chart-2 shadow-sm transition group-hover:-translate-y-1 group-hover:shadow-xl group-focus-within:-translate-y-1 group-focus-within:shadow-xl">
          {cover ? (
            <img src={cover} alt={title} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-chart-2 to-chart-5" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-14 text-white">
            <p className="line-clamp-2 text-sm font-bold">{title}</p>
          </div>
        </div>
      </Link>
      <button
        type="button"
        aria-label="Удалить из избранного"
        disabled={isRemoving}
        className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/65 text-white opacity-100 backdrop-blur transition hover:bg-destructive disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        onClick={onRemove}
      >
        {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </div>
  )
}

function FavoritesSkeleton() {
  return (
    <div className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-9 w-48 animate-pulse rounded bg-muted" />
      <FavoritesGridSkeleton />
    </div>
  )
}

function FavoritesGridSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  )
}
