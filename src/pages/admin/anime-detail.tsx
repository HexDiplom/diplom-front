import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { Link, Navigate, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { adminApi, type AnimeCoverImage, type AnimeRelation, type AnimeTitle, type AnimeTrailer, type EntityId } from "@/api/admin"
import { AnimeSelector } from "@/components/admin/entity-selectors"
import { FileUploadForm } from "@/components/admin/file-upload-form"
import { TextField } from "@/components/admin/form-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime, inputToNullableList, listToInput, nullableNumber, nullableString } from "@/lib/admin-form"

type TitleForm = {
  romaji: string
  russian: string
  native: string
  english: string
  other: string
}

type CoverForm = {
  original: string
  extraLarge: string
  large: string
  medium: string
  color: string
}

type TrailerForm = {
  videoUrl: string
  thumbnailUrl: string
}

type RelationForm = {
  relatedAnimeId: string
  relationType: string
}

const emptyTitleForm: TitleForm = {
  romaji: "",
  russian: "",
  native: "",
  english: "",
  other: "",
}

const emptyCoverForm: CoverForm = {
  original: "",
  extraLarge: "",
  large: "",
  medium: "",
  color: "",
}

const emptyTrailerForm: TrailerForm = {
  videoUrl: "",
  thumbnailUrl: "",
}

const emptyRelationForm: RelationForm = {
  relatedAnimeId: "",
  relationType: "",
}

export default function AdminAnimeDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [titleForm, setTitleForm] = useState<TitleForm>(emptyTitleForm)
  const [coverForm, setCoverForm] = useState<CoverForm>(emptyCoverForm)
  const [trailerForm, setTrailerForm] = useState<TrailerForm>(emptyTrailerForm)
  const [relationForm, setRelationForm] = useState<RelationForm>(emptyRelationForm)

  const animeQuery = useQuery({
    queryKey: ["admin-anime", "detail", id],
    queryFn: () => adminApi.getAnime(id ?? ""),
    enabled: Boolean(id),
  })

  const trailersQuery = useQuery({
    queryKey: ["admin-anime", "trailers", id],
    queryFn: () => adminApi.listAnimeTrailers(id ?? "", { page: 1, limit: 20, sortBy: "id", sortOrder: "desc" }),
    enabled: Boolean(id),
  })

  const relationsQuery = useQuery({
    queryKey: ["admin-anime", "relations", id],
    queryFn: () => adminApi.listAnimeRelations(id ?? "", { page: 1, limit: 20, sortBy: "id", sortOrder: "desc" }),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!animeQuery.data) {
      return
    }

    setTitleForm({
      romaji: animeQuery.data.title?.romaji ?? "",
      russian: animeQuery.data.title?.russian ?? "",
      native: animeQuery.data.title?.native ?? "",
      english: animeQuery.data.title?.english ?? "",
      other: listToInput(animeQuery.data.title?.other),
    })
    setCoverForm({
      original: animeQuery.data.coverImage?.original ?? "",
      extraLarge: animeQuery.data.coverImage?.extraLarge ?? "",
      large: animeQuery.data.coverImage?.large ?? "",
      medium: animeQuery.data.coverImage?.medium ?? "",
      color: animeQuery.data.coverImage?.color ?? "",
    })
  }, [animeQuery.data])

  const updateTitleMutation = useMutation({
    mutationFn: (payload: AnimeTitle) => adminApi.updateAnimeTitle(id ?? "", payload),
    onSuccess: handleMutationSuccess("Название обновлено"),
    onError: handleMutationError,
  })

  const updateCoverMutation = useMutation({
    mutationFn: (payload: AnimeCoverImage) => adminApi.updateAnimeCover(id ?? "", payload),
    onSuccess: handleMutationSuccess("Обложка обновлена"),
    onError: handleMutationError,
  })

  const createTrailerMutation = useMutation({
    mutationFn: () => adminApi.createAnimeTrailer(id ?? "", buildTrailerPayload(trailerForm)),
    onSuccess: async () => {
      toast.success("Трейлер создан")
      setTrailerForm(emptyTrailerForm)
      await invalidateAnime()
    },
    onError: handleMutationError,
  })

  const deleteTrailerMutation = useMutation({
    mutationFn: adminApi.deleteAnimeTrailer,
    onSuccess: handleMutationSuccess("Трейлер удален"),
    onError: handleMutationError,
  })

  const createRelationMutation = useMutation({
    mutationFn: () => adminApi.createAnimeRelation(id ?? "", buildRelationPayload(relationForm)),
    onSuccess: async () => {
      toast.success("Связь создана")
      setRelationForm(emptyRelationForm)
      await invalidateAnime()
    },
    onError: handleMutationError,
  })

  const deleteRelationMutation = useMutation({
    mutationFn: adminApi.deleteAnimeRelation,
    onSuccess: handleMutationSuccess("Связь удалена"),
    onError: handleMutationError,
  })

  if (!id) {
    return <Navigate to="/admin/anime" replace />
  }

  const anime = animeQuery.data
  const isBusy = updateTitleMutation.isPending || updateCoverMutation.isPending

  async function invalidateAnime() {
    await queryClient.invalidateQueries({ queryKey: ["admin-anime"] })
  }

  function handleMutationSuccess(message: string) {
    return async () => {
      toast.success(message)
      await invalidateAnime()
    }
  }

  function handleMutationError(error: Error) {
    toast.error(error.message)
  }

  async function handleTitleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await updateTitleMutation.mutateAsync({
        romaji: nullableString(titleForm.romaji) ?? undefined,
        russian: nullableString(titleForm.russian) ?? undefined,
        native: nullableString(titleForm.native),
        english: nullableString(titleForm.english),
        other: inputToNullableList(titleForm.other),
      })
    } catch {
      // The mutation onError handler owns user-facing feedback.
    }
  }

  async function handleCoverSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await updateCoverMutation.mutateAsync({
        original: nullableString(coverForm.original),
        extraLarge: nullableString(coverForm.extraLarge),
        large: nullableString(coverForm.large),
        medium: nullableString(coverForm.medium) ?? undefined,
        color: nullableString(coverForm.color),
      })
    } catch {
      // The mutation onError handler owns user-facing feedback.
    }
  }

  async function handleTrailerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await createTrailerMutation.mutateAsync()
    } catch {
      // The mutation onError handler owns user-facing feedback.
    }
  }

  async function handleRelationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await createRelationMutation.mutateAsync()
    } catch {
      // The mutation onError handler owns user-facing feedback.
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/anime">
            <ArrowLeft className="size-4" />
            К списку
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          Anime ID: {id}
        </div>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>{anime ? getAnimeTitle(anime) : "Аниме"}</CardTitle>
          <CardDescription>
            {animeQuery.isPending
              ? "Загрузка..."
              : animeQuery.isError
                ? animeQuery.error.message
                : `Статус: ${anime?.status ?? "—"}, обновлено: ${formatDateTime(anime?.updatedAt)}`}
          </CardDescription>
        </CardHeader>
        {anime?.coverImage?.medium && (
          <CardContent>
            <img
              src={anime.coverImage.medium}
              alt={getAnimeTitle(anime)}
              className="h-48 w-32 rounded-2xl object-cover"
            />
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Название</CardTitle>
            <CardDescription>PUT /v1/anime/{id}/title</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleTitleSubmit}>
              <TextField label="Romaji" value={titleForm.romaji} disabled={isBusy} onValueChange={(romaji) => setTitleForm((current) => ({ ...current, romaji }))} />
              <TextField label="Русское название" value={titleForm.russian} disabled={isBusy} onValueChange={(russian) => setTitleForm((current) => ({ ...current, russian }))} />
              <TextField label="Native" value={titleForm.native} disabled={isBusy} onValueChange={(native) => setTitleForm((current) => ({ ...current, native }))} />
              <TextField label="English" value={titleForm.english} disabled={isBusy} onValueChange={(english) => setTitleForm((current) => ({ ...current, english }))} />
              <TextField label="Other" description="Через запятую" value={titleForm.other} disabled={isBusy} onValueChange={(other) => setTitleForm((current) => ({ ...current, other }))} />
              <Button type="submit" disabled={isBusy}>
                Сохранить название
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Обложка</CardTitle>
            <CardDescription>PUT /v1/anime/{id}/cover и image upload endpoints</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <form className="grid gap-4" onSubmit={handleCoverSubmit}>
              <TextField label="Original URL" value={coverForm.original} disabled={isBusy} onValueChange={(original) => setCoverForm((current) => ({ ...current, original }))} />
              <TextField label="Extra large URL" value={coverForm.extraLarge} disabled={isBusy} onValueChange={(extraLarge) => setCoverForm((current) => ({ ...current, extraLarge }))} />
              <TextField label="Large URL" value={coverForm.large} disabled={isBusy} onValueChange={(large) => setCoverForm((current) => ({ ...current, large }))} />
              <TextField label="Medium URL" value={coverForm.medium} disabled={isBusy} onValueChange={(medium) => setCoverForm((current) => ({ ...current, medium }))} />
              <TextField label="Color" value={coverForm.color} disabled={isBusy} onValueChange={(color) => setCoverForm((current) => ({ ...current, color }))} />
              <Button type="submit" disabled={isBusy}>
                Сохранить обложку
              </Button>
            </form>

            <div className="grid gap-4 md:grid-cols-2">
              <FileUploadForm
                label="Загрузить banner"
                onUpload={(file) => adminApi.uploadAnimeBanner(id, file)}
                onSuccess={invalidateAnime}
              />
              <FileUploadForm
                label="Загрузить cover"
                onUpload={(file) => adminApi.uploadAnimeCover(id, file)}
                onSuccess={invalidateAnime}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Трейлеры</CardTitle>
          <CardDescription>Список, создание, удаление и загрузка thumbnail.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" onSubmit={handleTrailerSubmit}>
            <TextField label="Video URL" value={trailerForm.videoUrl} required disabled={createTrailerMutation.isPending} onValueChange={(videoUrl) => setTrailerForm((current) => ({ ...current, videoUrl }))} />
            <TextField label="Thumbnail URL" value={trailerForm.thumbnailUrl} disabled={createTrailerMutation.isPending} onValueChange={(thumbnailUrl) => setTrailerForm((current) => ({ ...current, thumbnailUrl }))} />
            <Button type="submit" disabled={createTrailerMutation.isPending}>
              <Plus className="size-4" />
              Создать
            </Button>
          </form>

          <NestedTable
            isLoading={trailersQuery.isPending}
            emptyText="Трейлеров нет"
            headers={["ID", "Video URL", "Thumbnail", "Действия"]}
          >
            {(trailersQuery.data?.data ?? []).map((trailer) => {
              const trailerId = getNestedId(trailer, "trailerId")

              return (
                <tr key={String(trailerId ?? trailer.videoUrl)} className="border-t">
                  <td className="px-4 py-3 text-muted-foreground">{trailerId ?? "—"}</td>
                  <td className="px-4 py-3">{trailer.videoUrl ?? "—"}</td>
                  <td className="px-4 py-3">{trailer.thumbnailUrl ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="grid min-w-64 gap-3">
                      {trailerId && (
                        <FileUploadForm
                          label="Thumbnail"
                          buttonLabel="Загрузить"
                          onUpload={(file) => adminApi.uploadAnimeTrailerThumbnail(trailerId, file)}
                          onSuccess={invalidateAnime}
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={!trailerId || deleteTrailerMutation.isPending}
                        onClick={() => trailerId && deleteTrailerMutation.mutate(trailerId)}
                      >
                        <Trash2 className="size-4" />
                        Удалить
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </NestedTable>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Связи</CardTitle>
          <CardDescription>Relations между аниме.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <form className="grid gap-4 md:grid-cols-[minmax(14rem,1fr)_minmax(0,1fr)_auto] md:items-end" onSubmit={handleRelationSubmit}>
            <AnimeSelector
              label="Связанное аниме"
              value={relationForm.relatedAnimeId}
              required
              disabled={createRelationMutation.isPending}
              excludeIds={[id]}
              onValueChange={(relatedAnimeId) => setRelationForm((current) => ({ ...current, relatedAnimeId }))}
            />
            <TextField label="Relation type" value={relationForm.relationType} required disabled={createRelationMutation.isPending} onValueChange={(relationType) => setRelationForm((current) => ({ ...current, relationType }))} />
            <Button type="submit" disabled={createRelationMutation.isPending}>
              <Plus className="size-4" />
              Создать
            </Button>
          </form>

          <NestedTable
            isLoading={relationsQuery.isPending}
            emptyText="Связей нет"
            headers={["ID", "Related Anime ID", "Тип", "Создано", "Действия"]}
          >
            {(relationsQuery.data?.data ?? []).map((relation) => {
              const relationId = getNestedId(relation, "relationId")

              return (
                <tr key={String(relationId ?? `${relation.relatedAnimeId}-${relation.relationType}`)} className="border-t">
                  <td className="px-4 py-3 text-muted-foreground">{relationId ?? "—"}</td>
                  <td className="px-4 py-3">{relation.relatedAnimeId ?? "—"}</td>
                  <td className="px-4 py-3">{relation.relationType ?? "—"}</td>
                  <td className="px-4 py-3">{formatDateTime(relation.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={!relationId || deleteRelationMutation.isPending}
                      onClick={() => relationId && deleteRelationMutation.mutate(relationId)}
                    >
                      <Trash2 className="size-4" />
                      Удалить
                    </Button>
                  </td>
                </tr>
              )
            })}
          </NestedTable>
        </CardContent>
      </Card>
    </div>
  )
}

type NestedTableProps = {
  headers: string[]
  isLoading: boolean
  emptyText: string
  children: ReactNode
}

function NestedTable({ headers, isLoading, emptyText, children }: NestedTableProps) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children)

  return (
    <div className="overflow-hidden rounded-3xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-muted-foreground">
                  Загрузка...
                </td>
              </tr>
            ) : hasRows ? (
              children
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-muted-foreground">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function buildTrailerPayload(form: TrailerForm) {
  return {
    videoUrl: form.videoUrl.trim(),
    thumbnailUrl: nullableString(form.thumbnailUrl),
  }
}

function buildRelationPayload(form: RelationForm) {
  return {
    relatedAnimeId: nullableNumber(form.relatedAnimeId) ?? 0,
    relationType: form.relationType.trim(),
  }
}

function getNestedId(item: AnimeTrailer | AnimeRelation, fallbackKey: "trailerId" | "relationId") {
  if (fallbackKey === "trailerId") {
    return item.id ?? (item as AnimeTrailer).trailerId ?? null
  }

  return item.id ?? (item as AnimeRelation).relationId ?? null
}

function getAnimeTitle(item: { id: EntityId; title?: AnimeTitle }) {
  return item.title?.russian || item.title?.romaji || `Anime #${item.id}`
}
