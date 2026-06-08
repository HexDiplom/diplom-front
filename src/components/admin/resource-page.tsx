import { useMemo, useState, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AdminListParams, AdminListResponse, AdminSortOrder, EntityId } from "@/api/admin"
import { cn } from "@/lib/utils"

type SortOption = {
  label: string
  value: string
}

export type ResourceFormProps<TForm extends object> = {
  value: TForm
  disabled: boolean
  isEditing: boolean
  onChange: (patch: Partial<TForm>) => void
}

export type ResourceColumn<TItem> = {
  header: string
  className?: string
  render: (item: TItem) => ReactNode
}

type AdminResourcePageProps<TItem, TForm extends object, TCreatePayload, TUpdatePayload> = {
  resourceKey: string
  title: string
  description: string
  createLabel: string
  editLabel: string
  emptyText: string
  initialForm: TForm
  sortOptions: SortOption[]
  defaultSortBy: string
  filter?: {
    label: string
    param: "animeId" | "episodeId"
    value: string
    placeholder: string
    onChange: (value: string) => void
    render?: (props: {
      value: string
      onChange: (value: string) => void
    }) => ReactNode
  }
  columns: ResourceColumn<TItem>[]
  getId: (item: TItem) => EntityId
  getTitle: (item: TItem) => string
  detailsPath?: (item: TItem) => string
  list: (params: AdminListParams) => Promise<AdminListResponse<TItem>>
  create: (payload: TCreatePayload) => Promise<TItem>
  afterCreate?: (item: TItem, form: TForm) => Promise<void>
  update: (id: EntityId, payload: TUpdatePayload) => Promise<unknown>
  remove: (id: EntityId) => Promise<unknown>
  toForm: (item: TItem) => TForm
  buildCreatePayload: (form: TForm) => TCreatePayload
  buildUpdatePayload: (form: TForm) => TUpdatePayload
  renderForm: (props: ResourceFormProps<TForm>) => ReactNode
  renderFormExtra?: (props: {
    editingItem: TItem | null
    disabled: boolean
    refresh: () => void
  }) => ReactNode
  renderItemActions?: (props: {
    item: TItem
    disabled: boolean
    refresh: () => void
  }) => ReactNode
}

export function AdminResourcePage<TItem, TForm extends object, TCreatePayload, TUpdatePayload>({
  resourceKey,
  title,
  description,
  createLabel,
  editLabel,
  emptyText,
  initialForm,
  sortOptions,
  defaultSortBy,
  filter,
  columns,
  getId,
  getTitle,
  detailsPath,
  list,
  create,
  afterCreate,
  update,
  remove,
  toForm,
  buildCreatePayload,
  buildUpdatePayload,
  renderForm,
  renderFormExtra,
  renderItemActions,
}: AdminResourcePageProps<TItem, TForm, TCreatePayload, TUpdatePayload>) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<TForm>(initialForm)
  const [editingItem, setEditingItem] = useState<TItem | null>(null)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState(defaultSortBy)
  const [sortOrder, setSortOrder] = useState<AdminSortOrder>("desc")
  const filterParam = filter?.param
  const filterValue = filter?.value ?? ""

  const params = useMemo<AdminListParams>(() => {
    const nextParams: AdminListParams = {
      page,
      limit: 20,
      sortBy,
      sortOrder,
    }

    if (filterParam === "animeId" && filterValue.trim()) {
      nextParams.animeId = filterValue.trim()
    }

    if (filterParam === "episodeId" && filterValue.trim()) {
      nextParams.episodeId = filterValue.trim()
    }

    return nextParams
  }, [filterParam, filterValue, page, sortBy, sortOrder])

  const listQuery = useQuery({
    queryKey: [resourceKey, "list", params],
    queryFn: () => list(params),
  })

  const createMutation = useMutation({
    mutationFn: async (value: TForm) => {
      const item = await create(buildCreatePayload(value))

      try {
        await afterCreate?.(item, value)
      } catch (error) {
        throw new AfterCreateError(error)
      }

      return item
    },
    onSuccess: async () => {
      toast.success("Запись создана")
      resetForm()
      await invalidate()
    },
    onError: async (error) => {
      if (error instanceof AfterCreateError) {
        toast.error(`Запись создана, но загрузка изображения не завершена: ${error.message}`)
        resetForm()
        await invalidate()
        return
      }

      showMutationError(error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, value }: { id: EntityId; value: TForm }) =>
      update(id, buildUpdatePayload(value)),
    onSuccess: async () => {
      toast.success("Запись обновлена")
      resetForm()
      await invalidate()
    },
    onError: showMutationError,
  })

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: async () => {
      toast.success("Запись удалена")
      await invalidate()
    },
    onError: showMutationError,
  })

  const items = listQuery.data?.data ?? []
  const meta = listQuery.data?.meta
  const currentPage = meta?.page ?? page
  const totalPages = meta?.totalPages
  const canGoBack = meta?.hasPrevPage ?? currentPage > 1
  const canGoForward = meta?.hasNextPage ?? (totalPages ? currentPage < totalPages : items.length >= 20)
  const isSubmitting = createMutation.isPending || updateMutation.isPending
  const isEditing = editingItem !== null

  function patchForm(patch: Partial<TForm>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: [resourceKey] })
  }

  function resetForm() {
    setForm(initialForm)
    setEditingItem(null)
  }

  function handleEdit(item: TItem) {
    setEditingItem(item)
    setForm(toForm(item))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: getId(editingItem), value: form })
        return
      }

      await createMutation.mutateAsync(form)
    } catch {
      // The mutation onError handler owns user-facing feedback.
    }
  }

  function handleDelete(item: TItem) {
    const name = getTitle(item)

    if (window.confirm(`Удалить "${name}"?`)) {
      deleteMutation.mutate(getId(item))
    }
  }

  function handleFilterChange(value: string) {
    filter?.onChange(value)
    setPage(1)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <Card className="min-w-0 rounded-3xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_9rem]">
            {filter ? (
              filter.render ? (
                filter.render({
                  value: filter.value,
                  onChange: handleFilterChange,
                })
              ) : (
                <div className="grid gap-2">
                  <Label>{filter.label}</Label>
                  <Input
                    value={filter.value}
                    placeholder={filter.placeholder}
                    onChange={(event) => handleFilterChange(event.target.value)}
                  />
                </div>
              )
            ) : (
              <div />
            )}

            <div className="grid gap-2">
              <Label>Сортировка</Label>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value)
                  setPage(1)
                }}
                className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Порядок</Label>
              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as AdminSortOrder)
                  setPage(1)
                }}
                className="h-9 rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-3"
              >
                <option value="desc">По убыванию</option>
                <option value="asc">По возрастанию</option>
              </select>
            </div>
          </div>

          {listQuery.isError ? (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {listQuery.error.message}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      {columns.map((column) => (
                        <th key={column.header} className={cn("px-4 py-3 font-semibold", column.className)}>
                          {column.header}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right font-semibold">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listQuery.isPending ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                          Загрузка...
                        </td>
                      </tr>
                    ) : items.length > 0 ? (
                      items.map((item) => (
                        <tr key={String(getId(item))} className="border-t">
                          {columns.map((column) => (
                            <td key={column.header} className={cn("px-4 py-3 align-top", column.className)}>
                              {column.render(item)}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {renderItemActions?.({
                                item,
                                disabled: deleteMutation.isPending,
                                refresh: invalidate,
                              })}
                              {detailsPath && (
                                <Button asChild variant="ghost" size="icon-sm" aria-label="Открыть">
                                  <Link to={detailsPath(item)}>
                                    <Eye className="size-4" />
                                  </Link>
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Редактировать"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-sm"
                                aria-label="Удалить"
                                disabled={deleteMutation.isPending}
                                onClick={() => handleDelete(item)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                          {emptyText}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Страница {currentPage}
              {totalPages ? ` из ${totalPages}` : ""}
              {typeof meta?.total === "number" ? `, всего ${meta.total}` : ""}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoBack || listQuery.isFetching}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="size-4" />
                Назад
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canGoForward || listQuery.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                Далее
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl xl:sticky xl:top-24 xl:self-start">
        <CardHeader>
          <CardTitle>{isEditing ? editLabel : createLabel}</CardTitle>
          <CardDescription>
            {editingItem ? getTitle(editingItem) : "Заполните поля и сохраните запись."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            {renderForm({
              value: form,
              disabled: isSubmitting,
              isEditing,
              onChange: patchForm,
            })}
            {renderFormExtra?.({
              editingItem,
              disabled: isSubmitting,
              refresh: invalidate,
            })}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isSubmitting}>
                <Plus className="size-4" />
                {isSubmitting ? "Сохранение..." : isEditing ? "Сохранить" : "Создать"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                <RotateCcw className="size-4" />
                Сбросить
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function showMutationError(error: Error) {
  toast.error(error.message)
}

class AfterCreateError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "неизвестная ошибка")
    this.name = "AfterCreateError"
  }
}
