import { useEffect, useId, useMemo, useState, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react"
import { useSearchParams } from "react-router"

import {
  ANIME_FORMATS,
  ANIME_SEASONS,
  ANIME_STATUSES,
  type AnimeFormat,
  type AnimeListQueryParams,
  type AnimeSeason,
  type AnimeSortBy,
  type AnimeSortOrder,
  type AnimeStatus,
} from "@/api/anime"
import { AnimeCard, AnimeGridSkeleton } from "@/components/anime-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { useAnimeFilterOptions, useAnimeList } from "@/hooks/use-anime-list"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

const statusLabels: Record<AnimeStatus, string> = {
  FINISHED: "Завершено",
  RELEASING: "Выходит",
  NOT_YET_RELEASED: "Анонс",
  CANCELLED: "Отменено",
  HIATUS: "Приостановлено",
}

const formatLabels: Record<AnimeFormat, string> = {
  TV: "Сериал",
  TV_SHORT: "Короткий сериал",
  MOVIE: "Фильм",
  SPECIAL: "Спешл",
  OVA: "OVA",
  ONA: "ONA",
  OTHER: "Другое",
}

const seasonLabels: Record<AnimeSeason, string> = {
  WINTER: "Зима",
  SPRING: "Весна",
  SUMMER: "Лето",
  FALL: "Осень",
}

const sortOptions: Array<{
  value: `${AnimeSortBy}:${AnimeSortOrder}`
  label: string
}> = [
  { value: "titleRussian:asc", label: "По названию" },
  { value: "startDate:desc", label: "Сначала новые" },
  { value: "startDate:asc", label: "Сначала старые" },
  { value: "seasonYear:desc", label: "По году: новые" },
  { value: "seasonYear:asc", label: "По году: старые" },
  { value: "episodes:desc", label: "Больше эпизодов" },
  { value: "duration:desc", label: "По длительности" },
  { value: "createdAt:desc", label: "Недавно добавленные" },
]

export default function CatalogPage() {
  useDocumentTitle("Каталог аниме")

  const [searchParams, setSearchParams] = useSearchParams()
  const filterOptionsQuery = useAnimeFilterOptions()
  const search = searchParams.get("search") ?? ""
  const debouncedSearch = useDebouncedValue(search.trim(), 300)

  const selectedStatuses = getEnumParams(searchParams, "status", ANIME_STATUSES)
  const selectedFormats = getEnumParams(searchParams, "format", ANIME_FORMATS)
  const selectedSeasons = getEnumParams(searchParams, "season", ANIME_SEASONS)
  const selectedYears = getNumberParams(searchParams, "seasonYear")
  const selectedGenres = getStringParams(searchParams, "genres")
  const page = getPage(searchParams)
  const [sortBy, sortOrder] = getSortParams(searchParams)
  const allowedYears = filterOptionsQuery.data?.seasonYears
  const allowedGenres = filterOptionsQuery.data?.genres
  const validYears = allowedYears
    ? selectedYears.filter((year) => allowedYears.includes(year))
    : selectedYears
  const validGenres = allowedGenres
    ? selectedGenres.filter((genre) => allowedGenres.includes(genre))
    : selectedGenres

  const queryParams = useMemo<AnimeListQueryParams>(
    () => ({
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder,
      search: debouncedSearch || undefined,
      status: selectedStatuses.length ? selectedStatuses : undefined,
      format: selectedFormats.length ? selectedFormats : undefined,
      season: selectedSeasons.length ? selectedSeasons : undefined,
      seasonYear: validYears.length ? validYears : undefined,
      genres: validGenres.length ? validGenres : undefined,
    }),
    [
      debouncedSearch,
      page,
      selectedFormats,
      selectedSeasons,
      selectedStatuses,
      sortBy,
      sortOrder,
      validGenres,
      validYears,
    ],
  )
  const animeQuery = useAnimeList(queryParams)
  const anime = animeQuery.data?.data ?? []
  const meta = animeQuery.data?.meta
  const activeFilterCount =
    selectedStatuses.length +
    selectedFormats.length +
    selectedSeasons.length +
    selectedYears.length +
    selectedGenres.length

  function updateParams(
    updates: Record<string, string | string[] | number | undefined>,
    replace = false,
  ) {
    const next = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      next.delete(key)

      if (Array.isArray(value)) {
        value.forEach((item) => next.append(key, item))
      } else if (value !== undefined && value !== "") {
        next.set(key, String(value))
      }
    })

    setSearchParams(next, { replace })
  }

  function toggleValue(key: string, current: string[], value: string) {
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]

    updateParams({ [key]: next, page: undefined })
  }

  function resetFilters() {
    updateParams({
      search: undefined,
      status: [],
      format: [],
      season: [],
      seasonYear: [],
      genres: [],
      page: undefined,
    })
  }

  const filterContent = (
    <FilterPanel
      selectedStatuses={selectedStatuses}
      selectedFormats={selectedFormats}
      selectedSeasons={selectedSeasons}
      selectedYears={selectedYears}
      selectedGenres={selectedGenres}
      years={filterOptionsQuery.data?.seasonYears ?? []}
      genres={filterOptionsQuery.data?.genres ?? []}
      isOptionsPending={filterOptionsQuery.isPending}
      isOptionsError={filterOptionsQuery.isError}
      onToggle={(key, current, value) => toggleValue(key, current, value)}
      onReset={resetFilters}
      activeFilterCount={activeFilterCount}
    />
  )

  return (
    <div className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Все тайтлы
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Каталог аниме</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Найдите аниме по названию, жанру, формату, сезону или году выхода.
        </p>
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_15rem_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            placeholder="Поиск по названию"
            aria-label="Поиск по названию"
            className="h-11 pl-10 pr-10"
            onChange={(event) =>
              updateParams({ search: event.target.value, page: undefined }, true)
            }
          />
          {search && (
            <button
              type="button"
              aria-label="Очистить поиск"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              onClick={() => updateParams({ search: undefined, page: undefined })}
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Select
          value={`${sortBy}:${sortOrder}`}
          onValueChange={(value) => {
            const [nextSortBy, nextSortOrder] = value.split(":")
            updateParams({
              sortBy: nextSortBy === "titleRussian" ? undefined : nextSortBy,
              sortOrder: nextSortBy === "titleRussian" && nextSortOrder === "asc"
                ? undefined
                : nextSortOrder,
              page: undefined,
            })
          }}
        >
          <SelectTrigger
            aria-label="Сортировка каталога"
            className="w-full data-[size=default]:h-11 md:w-60"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectGroup>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 justify-center lg:hidden">
              <Filter className="size-4" />
              Фильтры
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[min(90vw,24rem)] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
              <SheetDescription>Можно выбрать несколько значений.</SheetDescription>
            </SheetHeader>
            <div className="px-6 pb-8">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="sticky top-24 hidden rounded-3xl border bg-card p-5 lg:block">
          {filterContent}
        </aside>

        <main className="min-w-0">
          <div className="mb-5 flex min-h-8 items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {animeQuery.isPending
                ? "Загрузка..."
                : meta
                  ? `Найдено: ${formatTotal(meta.total)}`
                  : "Результаты поиска"}
            </p>
            {(activeFilterCount > 0 || search) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="size-4" />
                Сбросить
              </Button>
            )}
          </div>

          {animeQuery.isPending ? (
            <AnimeGridSkeleton count={PAGE_SIZE} className="xl:grid-cols-4" />
          ) : animeQuery.isError ? (
            <CatalogMessage
              title="Не удалось загрузить каталог"
              text={animeQuery.error.message}
              action={
                <Button variant="outline" onClick={() => animeQuery.refetch()}>
                  Повторить
                </Button>
              }
            />
          ) : anime.length === 0 ? (
            <CatalogMessage
              title="Ничего не найдено"
              text="Попробуйте изменить запрос или убрать часть фильтров."
              action={
                <Button variant="outline" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 xl:grid-cols-4">
                {anime.map((item) => (
                  <AnimeCard key={item.id} anime={item} />
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <CatalogPagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={(nextPage) =>
                    updateParams({ page: nextPage === 1 ? undefined : nextPage })
                  }
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function FilterPanel({
  selectedStatuses,
  selectedFormats,
  selectedSeasons,
  selectedYears,
  selectedGenres,
  years,
  genres,
  isOptionsPending,
  isOptionsError,
  activeFilterCount,
  onToggle,
  onReset,
}: {
  selectedStatuses: AnimeStatus[]
  selectedFormats: AnimeFormat[]
  selectedSeasons: AnimeSeason[]
  selectedYears: number[]
  selectedGenres: string[]
  years: number[]
  genres: string[]
  isOptionsPending: boolean
  isOptionsError: boolean
  activeFilterCount: number
  onToggle: (key: string, current: string[], value: string) => void
  onReset: () => void
}) {
  const idPrefix = useId()

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <h2 className="font-bold">Фильтры</h2>
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="xs" onClick={onReset}>
            Сбросить
          </Button>
        )}
      </div>

      <FilterGroup
        title="Статус"
        options={ANIME_STATUSES.map((value) => ({ value, label: statusLabels[value] }))}
        selected={selectedStatuses}
        idPrefix={idPrefix}
        onToggle={(value) => onToggle("status", selectedStatuses, value)}
      />
      <FilterGroup
        title="Формат"
        options={ANIME_FORMATS.map((value) => ({ value, label: formatLabels[value] }))}
        selected={selectedFormats}
        idPrefix={idPrefix}
        onToggle={(value) => onToggle("format", selectedFormats, value)}
      />
      <FilterGroup
        title="Сезон"
        options={ANIME_SEASONS.map((value) => ({ value, label: seasonLabels[value] }))}
        selected={selectedSeasons}
        idPrefix={idPrefix}
        onToggle={(value) => onToggle("season", selectedSeasons, value)}
      />

      {isOptionsPending ? (
        <div className="grid gap-3">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      ) : isOptionsError ? (
        <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Жанры и годы недоступны
        </p>
      ) : (
        <>
          <FilterGroup
            title="Год"
            options={years.map((year) => ({ value: String(year), label: String(year) }))}
            selected={selectedYears.map(String)}
            idPrefix={idPrefix}
            onToggle={(value) => onToggle("seasonYear", selectedYears.map(String), value)}
            scrollable
          />
          <FilterGroup
            title="Жанр"
            options={genres.map((genre) => ({ value: genre, label: genre }))}
            selected={selectedGenres}
            idPrefix={idPrefix}
            onToggle={(value) => onToggle("genres", selectedGenres, value)}
            scrollable
          />
        </>
      )}
    </div>
  )
}

function FilterGroup({
  title,
  options,
  selected,
  idPrefix,
  scrollable = false,
  onToggle,
}: {
  title: string
  options: Array<{ value: string; label: string }>
  selected: readonly string[]
  idPrefix: string
  scrollable?: boolean
  onToggle: (value: string) => void
}) {
  return (
    <FieldSet className="gap-0">
      <FieldLegend variant="label">{title}</FieldLegend>
      <FieldGroup
        className={cn("gap-1", scrollable && "max-h-48 overflow-y-auto pr-1")}
      >
        {options.length > 0 ? (
          options.map((option) => {
            const optionId = getFilterOptionId(idPrefix, title, option.value)

            return (
              <Field key={option.value} orientation="horizontal" className="gap-2">
                <Checkbox
                  id={optionId}
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => onToggle(option.value)}
                />
                <FieldLabel
                  htmlFor={optionId}
                  className="w-full cursor-pointer rounded-xl px-2 py-1.5 font-normal transition hover:bg-muted"
                >
                  {option.label}
                </FieldLabel>
              </Field>
            )
          })
        ) : (
          <p className="text-xs text-muted-foreground">Нет доступных значений</p>
        )}
      </FieldGroup>
    </FieldSet>
  )
}

function CatalogPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const pages = getPaginationPages(page, totalPages)

  function goToPage(nextPage: number) {
    onPageChange(nextPage)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <nav aria-label="Пагинация каталога" className="mt-10 flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Предыдущая страница"
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      {pages.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="flex size-9 items-center justify-center text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === page ? "default" : "outline"}
            size="icon"
            aria-label={`Страница ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => goToPage(item)}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        aria-label="Следующая страница"
        disabled={page >= totalPages}
        onClick={() => goToPage(page + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}

function CatalogMessage({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-3xl border bg-card px-6 py-16 text-center">
      <Search className="mx-auto size-9 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])

  return debouncedValue
}

function getPage(params: URLSearchParams) {
  const value = Number(params.get("page"))
  return Number.isInteger(value) && value > 0 ? value : 1
}

function getStringParams(params: URLSearchParams, key: string) {
  return Array.from(new Set(params.getAll(key).map((value) => value.trim()).filter(Boolean)))
}

function getNumberParams(params: URLSearchParams, key: string) {
  return getStringParams(params, key)
    .map(Number)
    .filter((value) => Number.isInteger(value))
}

function getEnumParams<const T extends readonly string[]>(
  params: URLSearchParams,
  key: string,
  values: T,
) {
  return getStringParams(params, key).filter((value): value is T[number] =>
    values.includes(value as T[number]),
  )
}

function getSortParams(params: URLSearchParams): [AnimeSortBy, AnimeSortOrder] {
  const requested = `${params.get("sortBy") ?? "titleRussian"}:${params.get("sortOrder") ?? "asc"}`
  const matched = sortOptions.find((option) => option.value === requested)
  const [sortBy, sortOrder] = (matched?.value ?? "titleRussian:asc").split(":")

  return [sortBy as AnimeSortBy, sortOrder as AnimeSortOrder]
}

function getPaginationPages(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = Array.from(pages)
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b)
  const result: Array<number | "ellipsis"> = []

  sorted.forEach((item, index) => {
    if (index > 0 && item - sorted[index - 1] > 1) {
      result.push("ellipsis")
    }
    result.push(item)
  })

  return result
}

function formatTotal(total: number) {
  return new Intl.NumberFormat("ru-RU").format(total)
}

function getFilterOptionId(prefix: string, group: string, value: string) {
  return `${prefix}-${group}-${value}`.toLocaleLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-")
}
