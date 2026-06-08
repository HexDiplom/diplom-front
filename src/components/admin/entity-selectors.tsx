import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
import { Popover as PopoverPrimitive } from "radix-ui"

import {
  adminApi,
  type AdminListParams,
  type AdminListResponse,
  type Anime,
  type Episode,
  type Studio,
} from "@/api/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type EntitySelectorProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  allowClear?: boolean
  className?: string
  placeholder?: string
}

type PaginatedEntitySelectorProps<TItem> = EntitySelectorProps & {
  queryKey: readonly unknown[]
  enabled?: boolean
  selectedItem?: TItem
  list: (params: AdminListParams) => Promise<AdminListResponse<TItem>>
  getById: (id: string) => Promise<TItem>
  getValue: (item: TItem) => string
  getLabel: (item: TItem) => string
  getSearchText: (item: TItem) => string
  excludeValues?: string[]
}

export function AnimeSelector({
  excludeIds,
  ...props
}: EntitySelectorProps & { excludeIds?: Array<string | number> }) {
  return (
    <PaginatedEntitySelector
      {...props}
      queryKey={["admin-options", "anime"]}
      list={(params) => adminApi.listAnime({ ...params, sortBy: "titleRussian", sortOrder: "asc" })}
      getById={(id) => adminApi.getAnime(id)}
      getValue={(item) => String(item.id)}
      getLabel={getAnimeLabel}
      getSearchText={(item) => `${item.id} ${item.title?.russian ?? ""} ${item.title?.romaji ?? ""}`}
      excludeValues={excludeIds?.map(String)}
    />
  )
}

export function StudioSelector(props: EntitySelectorProps) {
  return (
    <PaginatedEntitySelector
      {...props}
      queryKey={["admin-options", "studios"]}
      list={(params) => adminApi.listStudios({ ...params, sortBy: "id", sortOrder: "asc" })}
      getById={(id) => adminApi.getStudio(id)}
      getValue={(item) => String(item.id)}
      getLabel={getStudioLabel}
      getSearchText={(item) => String(item.id)}
    />
  )
}

export function EpisodeSelector({
  value,
  onValueChange,
  disabled,
  required,
  className,
}: Omit<EntitySelectorProps, "label" | "allowClear" | "placeholder">) {
  const [browseSelection, setBrowseSelection] = useState({ episodeValue: "", animeId: "" })
  const selectedEpisodeQuery = useQuery({
    queryKey: ["admin-entity", "episode", value],
    queryFn: () => adminApi.getEpisode(value),
    enabled: Boolean(value),
  })
  const selectedEpisode = selectedEpisodeQuery.data
  const selectedAnimeId = selectedEpisode?.animeId === undefined ? "" : String(selectedEpisode.animeId)
  const animeId = browseSelection.episodeValue === value
    ? browseSelection.animeId
    : selectedAnimeId

  function handleAnimeChange(nextAnimeId: string) {
    setBrowseSelection({ episodeValue: "", animeId: nextAnimeId })
    onValueChange("")
  }

  function handleEpisodeChange(nextEpisodeId: string) {
    setBrowseSelection({ episodeValue: nextEpisodeId, animeId })
    onValueChange(nextEpisodeId)
  }

  return (
    <div className={cn("grid gap-3", className)}>
      <AnimeSelector
        label="Аниме"
        value={animeId}
        onValueChange={handleAnimeChange}
        disabled={disabled}
        allowClear
        placeholder="Выберите аниме"
      />
      <PaginatedEntitySelector
        label="Эпизод"
        value={value}
        onValueChange={handleEpisodeChange}
        disabled={disabled || !animeId}
        required={required}
        allowClear={!required}
        placeholder={animeId ? "Выберите эпизод" : "Сначала выберите аниме"}
        queryKey={["admin-options", "episodes", animeId]}
        enabled={Boolean(animeId)}
        selectedItem={selectedEpisode}
        list={(params) => adminApi.listEpisodes({
          ...params,
          animeId,
          sortBy: "number",
          sortOrder: "asc",
        })}
        getById={(id) => adminApi.getEpisode(id)}
        getValue={(item) => item.id}
        getLabel={getEpisodeLabel}
        getSearchText={(item) => `${item.id} ${item.number ?? ""} ${item.name ?? ""}`}
      />
    </div>
  )
}

function PaginatedEntitySelector<TItem>({
  label,
  value,
  onValueChange,
  disabled,
  required,
  allowClear = !required,
  className,
  placeholder = "Выберите запись",
  queryKey,
  enabled = true,
  selectedItem,
  list,
  getById,
  getValue,
  getLabel,
  getSearchText,
  excludeValues = [],
}: PaginatedEntitySelectorProps<TItem>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const optionsQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => list({
      page: pageParam,
      limit: 100,
      sortBy: "id",
      sortOrder: "asc",
    }),
    initialPageParam: 1,
    enabled: enabled && open,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (typeof lastPage.meta?.hasNextPage === "boolean") {
        return lastPage.meta.hasNextPage
          ? (lastPage.meta.page ?? lastPageParam) + 1
          : undefined
      }

      return lastPage.data.length >= 100 ? lastPageParam + 1 : undefined
    },
  })
  const loadedItems = optionsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const loadedSelectedItem = loadedItems.find((item) => getValue(item) === value)
  const selectedItemQuery = useQuery({
    queryKey: [...queryKey, "selected", value],
    queryFn: () => getById(value),
    enabled: Boolean(value) && !loadedSelectedItem && !selectedItem,
  })
  const resolvedSelectedItem = loadedSelectedItem ?? selectedItem ?? selectedItemQuery.data
  const normalizedSearch = search.trim().toLocaleLowerCase("ru-RU")
  const excluded = new Set(excludeValues)
  const seen = new Set<string>()
  const options = loadedItems.filter((item) => {
    const itemValue = getValue(item)

    if (seen.has(itemValue) || excluded.has(itemValue)) {
      return false
    }

    seen.add(itemValue)
    return !normalizedSearch || getSearchText(item).toLocaleLowerCase("ru-RU").includes(normalizedSearch)
  })

  function selectValue(nextValue: string) {
    onValueChange(nextValue)
    setOpen(false)
    setSearch("")
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {resolvedSelectedItem ? getLabel(resolvedSelectedItem) : value ? `ID: ${value}` : placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className="z-50 grid max-h-[28rem] w-(--radix-popover-trigger-width) min-w-64 gap-2 rounded-3xl bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-foreground/5 dark:ring-foreground/10"
          >
            <Input
              value={search}
              placeholder="Поиск по загруженным записям"
              autoFocus
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="grid max-h-72 gap-1 overflow-y-auto">
              {allowClear && value && (
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => selectValue("")}
                >
                  <X className="size-4" />
                  Очистить
                </button>
              )}
              {options.map((item) => {
                const itemValue = getValue(item)

                return (
                  <button
                    key={itemValue}
                    type="button"
                    className="flex items-start gap-2 rounded-2xl px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => selectValue(itemValue)}
                  >
                    <Check className={cn("mt-0.5 size-4 shrink-0", itemValue !== value && "invisible")} />
                    <span>{getLabel(item)}</span>
                  </button>
                )
              })}
              {optionsQuery.isPending && (
                <div className="flex items-center justify-center gap-2 px-3 py-5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Загрузка...
                </div>
              )}
              {!optionsQuery.isPending && options.length === 0 && (
                <div className="px-3 py-5 text-center text-sm text-muted-foreground">
                  Записи не найдены
                </div>
              )}
            </div>
            {optionsQuery.isError && (
              <div className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {optionsQuery.error.message}
              </div>
            )}
            {optionsQuery.hasNextPage && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={optionsQuery.isFetchingNextPage}
                onClick={() => optionsQuery.fetchNextPage()}
              >
                {optionsQuery.isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
              </Button>
            )}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  )
}

function getAnimeLabel(item: Anime) {
  const title = item.title?.russian || item.title?.romaji || "Без названия"
  return `${title} · #${item.id}`
}

function getStudioLabel(item: Studio) {
  return `Studio #${item.id}`
}

function getEpisodeLabel(item: Episode) {
  const number = item.number === undefined ? "?" : item.number
  return item.name ? `Серия ${number} — ${item.name}` : `Серия ${number}`
}
