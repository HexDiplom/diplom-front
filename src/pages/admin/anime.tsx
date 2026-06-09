import {
  ADMIN_ANIME_FORMATS,
  ADMIN_ANIME_SEASONS,
  ADMIN_ANIME_SOURCES,
  ADMIN_ANIME_STATUSES,
  adminApi,
  type Anime,
  type AnimeCreatePayload,
  type AnimeFormat,
  type AnimeSeason,
  type AnimeSource,
  type AnimeStatus,
  type AnimeUpdatePayload,
} from "@/api/admin"
import { AdminResourcePage, type ResourceFormProps } from "@/components/admin/resource-page"
import { StudioSelector } from "@/components/admin/entity-selectors"
import {
  CheckboxField,
  ImageFileField,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/form-fields"
import {
  formatDateTime,
  inputToNullableList,
  listToInput,
  nullableNumber,
  nullableString,
  optionalString,
  toInputString,
} from "@/lib/admin-form"
import { useDocumentTitle } from "@/hooks/use-document-title"

type AnimeForm = {
  titleRomaji: string
  titleRussian: string
  titleNative: string
  titleEnglish: string
  titleOther: string
  format: string
  status: string
  description: string
  startDateDay: string
  startDateMonth: string
  startDateYear: string
  endDateDay: string
  endDateMonth: string
  endDateYear: string
  season: string
  seasonYear: string
  episodes: string
  duration: string
  source: string
  bannerImage: string
  genres: string
  tags: string
  studioId: string
  isAdult: boolean
  coverOriginal: string
  coverExtraLarge: string
  coverLarge: string
  coverMedium: string
  coverColor: string
  bannerFile: File | null
  coverFile: File | null
}

const emptyAnimeForm: AnimeForm = {
  titleRomaji: "",
  titleRussian: "",
  titleNative: "",
  titleEnglish: "",
  titleOther: "",
  format: "TV",
  status: "FINISHED",
  description: "",
  startDateDay: "",
  startDateMonth: "",
  startDateYear: "",
  endDateDay: "",
  endDateMonth: "",
  endDateYear: "",
  season: "",
  seasonYear: "",
  episodes: "",
  duration: "",
  source: "",
  bannerImage: "",
  genres: "",
  tags: "",
  studioId: "",
  isAdult: false,
  coverOriginal: "",
  coverExtraLarge: "",
  coverLarge: "",
  coverMedium: "",
  coverColor: "",
  bannerFile: null,
  coverFile: null,
}

const enumOptions = (values: readonly string[], includeEmpty = true) => [
  ...(includeEmpty ? [{ label: "Не задано", value: "" }] : []),
  ...values.map((value) => ({ label: value, value })),
]

export default function AdminAnimePage() {
  useDocumentTitle("Аниме — Админ-панель")

  return (
    <AdminResourcePage<Anime, AnimeForm, AnimeCreatePayload, AnimeUpdatePayload>
      resourceKey="admin-anime"
      title="Аниме"
      description="Список, создание, редактирование и удаление записей anime."
      createLabel="Создать аниме"
      editLabel="Редактировать аниме"
      emptyText="Аниме не найдены"
      initialForm={emptyAnimeForm}
      sortOptions={[
        { label: "ID", value: "id" },
        { label: "Создано", value: "createdAt" },
        { label: "Обновлено", value: "updatedAt" },
        { label: "Год сезона", value: "seasonYear" },
        { label: "Название", value: "titleRussian" },
      ]}
      defaultSortBy="id"
      columns={[
        {
          header: "ID",
          className: "w-20 text-muted-foreground",
          render: (item) => item.id,
        },
        {
          header: "Название",
          render: (item) => (
            <div className="grid gap-1">
              <span className="font-medium">{getAnimeTitle(item)}</span>
              <span className="text-xs text-muted-foreground">{item.title?.romaji}</span>
            </div>
          ),
        },
        { header: "Статус", render: (item) => item.status ?? "—" },
        { header: "Формат", render: (item) => item.format ?? "—" },
        { header: "Студия", render: (item) => item.studioId ?? "—" },
        { header: "Обновлено", render: (item) => formatDateTime(item.updatedAt) },
      ]}
      getId={(item) => item.id}
      getTitle={getAnimeTitle}
      detailsPath={(item) => `/admin/anime/${item.id}`}
      list={adminApi.listAnime}
      create={adminApi.createAnime}
      afterCreate={uploadAnimeImages}
      update={adminApi.updateAnime}
      remove={adminApi.deleteAnime}
      toForm={toAnimeForm}
      buildCreatePayload={buildAnimeCreatePayload}
      buildUpdatePayload={buildAnimeUpdatePayload}
      renderForm={(props) => <AnimeFormFields {...props} />}
    />
  )
}

function AnimeFormFields({
  value,
  disabled,
  isEditing,
  onChange,
}: ResourceFormProps<AnimeForm>) {
  return (
    <>
      {!isEditing ? (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold">Название</h3>
          <TextField
            label="Romaji"
            value={value.titleRomaji}
            required
            disabled={disabled}
            onValueChange={(titleRomaji) => onChange({ titleRomaji })}
          />
          <TextField
            label="Русское название"
            value={value.titleRussian}
            required
            disabled={disabled}
            onValueChange={(titleRussian) => onChange({ titleRussian })}
          />
          <TextField
            label="Оригинальное название"
            value={value.titleNative}
            disabled={disabled}
            onValueChange={(titleNative) => onChange({ titleNative })}
          />
          <TextField
            label="English"
            value={value.titleEnglish}
            disabled={disabled}
            onValueChange={(titleEnglish) => onChange({ titleEnglish })}
          />
          <TextField
            label="Другие названия"
            description="Через запятую"
            value={value.titleOther}
            disabled={disabled}
            onValueChange={(titleOther) => onChange({ titleOther })}
          />
        </section>
      ) : (
        <p className="rounded-3xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Название, обложка, трейлеры и связи редактируются на странице деталей.
        </p>
      )}

      <section className="grid gap-3">
        <h3 className="text-sm font-semibold">Основное</h3>
        <SelectField
          label="Статус"
          value={value.status}
          required
          disabled={disabled}
          options={enumOptions(ADMIN_ANIME_STATUSES, false)}
          onValueChange={(status) => onChange({ status })}
        />
        <SelectField
          label="Формат"
          value={value.format}
          disabled={disabled}
          options={enumOptions(ADMIN_ANIME_FORMATS)}
          onValueChange={(format) => onChange({ format })}
        />
        <TextareaField
          label="Описание"
          value={value.description}
          disabled={disabled}
          onValueChange={(description) => onChange({ description })}
        />
        <TextField
          label="Banner image URL"
          value={value.bannerImage}
          disabled={disabled}
          onValueChange={(bannerImage) => onChange({ bannerImage })}
        />
        {!isEditing && (
          <ImageFileField
            label="Banner image"
            description="JPEG, PNG или WebP, до 10 МБ. Выбранный файл имеет приоритет над URL."
            value={value.bannerFile}
            disabled={disabled}
            onFileChange={(bannerFile) => onChange({ bannerFile })}
          />
        )}
        <CheckboxField
          label="18+"
          checked={value.isAdult}
          disabled={disabled}
          onCheckedChange={(isAdult) => onChange({ isAdult })}
        />
      </section>

      <section className="grid gap-3">
        <h3 className="text-sm font-semibold">Даты и выпуск</h3>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Старт день" value={value.startDateDay} disabled={disabled} onValueChange={(startDateDay) => onChange({ startDateDay })} />
          <NumberField label="Месяц" value={value.startDateMonth} disabled={disabled} onValueChange={(startDateMonth) => onChange({ startDateMonth })} />
          <NumberField label="Год" value={value.startDateYear} disabled={disabled} onValueChange={(startDateYear) => onChange({ startDateYear })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Финал день" value={value.endDateDay} disabled={disabled} onValueChange={(endDateDay) => onChange({ endDateDay })} />
          <NumberField label="Месяц" value={value.endDateMonth} disabled={disabled} onValueChange={(endDateMonth) => onChange({ endDateMonth })} />
          <NumberField label="Год" value={value.endDateYear} disabled={disabled} onValueChange={(endDateYear) => onChange({ endDateYear })} />
        </div>
        <SelectField
          label="Сезон"
          value={value.season}
          disabled={disabled}
          options={enumOptions(ADMIN_ANIME_SEASONS)}
          onValueChange={(season) => onChange({ season })}
        />
        <NumberField label="Год сезона" value={value.seasonYear} disabled={disabled} onValueChange={(seasonYear) => onChange({ seasonYear })} />
        <NumberField label="Эпизоды" value={value.episodes} disabled={disabled} onValueChange={(episodes) => onChange({ episodes })} />
        <NumberField label="Длительность, мин" value={value.duration} disabled={disabled} onValueChange={(duration) => onChange({ duration })} />
      </section>

      <section className="grid gap-3">
        <h3 className="text-sm font-semibold">Связанные поля</h3>
        <SelectField
          label="Источник"
          value={value.source}
          disabled={disabled}
          options={enumOptions(ADMIN_ANIME_SOURCES)}
          onValueChange={(source) => onChange({ source })}
        />
        <StudioSelector
          label="Студия"
          value={value.studioId}
          disabled={disabled}
          allowClear
          placeholder="Без студии"
          onValueChange={(studioId) => onChange({ studioId })}
        />
        <TextField label="Жанры" description="Через запятую" value={value.genres} disabled={disabled} onValueChange={(genres) => onChange({ genres })} />
        <TextField label="Теги" description="Через запятую" value={value.tags} disabled={disabled} onValueChange={(tags) => onChange({ tags })} />
      </section>

      {!isEditing && (
        <section className="grid gap-3">
          <h3 className="text-sm font-semibold">Обложка</h3>
          <TextField label="Medium URL" value={value.coverMedium} disabled={disabled} onValueChange={(coverMedium) => onChange({ coverMedium })} />
          <TextField label="Original URL" value={value.coverOriginal} disabled={disabled} onValueChange={(coverOriginal) => onChange({ coverOriginal })} />
          <TextField label="Extra large URL" value={value.coverExtraLarge} disabled={disabled} onValueChange={(coverExtraLarge) => onChange({ coverExtraLarge })} />
          <TextField label="Large URL" value={value.coverLarge} disabled={disabled} onValueChange={(coverLarge) => onChange({ coverLarge })} />
          <TextField label="Color" value={value.coverColor} disabled={disabled} onValueChange={(coverColor) => onChange({ coverColor })} />
          <ImageFileField
            label="Cover image"
            description="JPEG, PNG или WebP, до 10 МБ. Выбранный файл имеет приоритет над URL."
            value={value.coverFile}
            disabled={disabled}
            onFileChange={(coverFile) => onChange({ coverFile })}
          />
        </section>
      )}
    </>
  )
}

function toAnimeForm(item: Anime): AnimeForm {
  return {
    titleRomaji: item.title?.romaji ?? "",
    titleRussian: item.title?.russian ?? "",
    titleNative: item.title?.native ?? "",
    titleEnglish: item.title?.english ?? "",
    titleOther: listToInput(item.title?.other),
    format: item.format ?? "",
    status: item.status ?? "FINISHED",
    description: item.description ?? "",
    startDateDay: toInputString(item.startDateDay),
    startDateMonth: toInputString(item.startDateMonth),
    startDateYear: toInputString(item.startDateYear),
    endDateDay: toInputString(item.endDateDay),
    endDateMonth: toInputString(item.endDateMonth),
    endDateYear: toInputString(item.endDateYear),
    season: item.season ?? "",
    seasonYear: toInputString(item.seasonYear),
    episodes: toInputString(item.episodes),
    duration: toInputString(item.duration),
    source: item.source ?? "",
    bannerImage: item.bannerImage ?? "",
    genres: listToInput(item.genres),
    tags: listToInput(item.tags),
    studioId: toInputString(item.studioId),
    isAdult: Boolean(item.isAdult),
    coverOriginal: item.coverImage?.original ?? "",
    coverExtraLarge: item.coverImage?.extraLarge ?? "",
    coverLarge: item.coverImage?.large ?? "",
    coverMedium: item.coverImage?.medium ?? "",
    coverColor: item.coverImage?.color ?? "",
    bannerFile: null,
    coverFile: null,
  }
}

function buildAnimeCorePayload(form: AnimeForm): AnimeUpdatePayload {
  return {
    format: optionalString(form.format) as AnimeFormat | undefined,
    status: optionalString(form.status) as AnimeStatus | undefined,
    description: nullableString(form.description),
    startDateDay: nullableNumber(form.startDateDay),
    startDateMonth: nullableNumber(form.startDateMonth),
    startDateYear: nullableNumber(form.startDateYear),
    endDateDay: nullableNumber(form.endDateDay),
    endDateMonth: nullableNumber(form.endDateMonth),
    endDateYear: nullableNumber(form.endDateYear),
    season: nullableString(form.season) as AnimeSeason | null,
    seasonYear: nullableNumber(form.seasonYear),
    episodes: nullableNumber(form.episodes),
    duration: nullableNumber(form.duration),
    source: nullableString(form.source) as AnimeSource | null,
    bannerImage: nullableString(form.bannerImage),
    genres: inputToNullableList(form.genres),
    tags: inputToNullableList(form.tags),
    studioId: nullableNumber(form.studioId),
    isAdult: form.isAdult,
  }
}

function buildAnimeCreatePayload(form: AnimeForm): AnimeCreatePayload {
  const coverMedium = nullableString(form.coverMedium)
  const payload: AnimeCreatePayload = {
    ...buildAnimeCorePayload(form),
    status: (optionalString(form.status) ?? "FINISHED") as AnimeStatus,
    title: {
      romaji: nullableString(form.titleRomaji) ?? "",
      russian: nullableString(form.titleRussian) ?? "",
      native: nullableString(form.titleNative),
      english: nullableString(form.titleEnglish),
      other: inputToNullableList(form.titleOther),
    },
  }

  if (coverMedium) {
    payload.coverImage = {
      medium: coverMedium,
      original: nullableString(form.coverOriginal),
      extraLarge: nullableString(form.coverExtraLarge),
      large: nullableString(form.coverLarge),
      color: nullableString(form.coverColor),
    }
  }

  return payload
}

function buildAnimeUpdatePayload(form: AnimeForm): AnimeUpdatePayload {
  return buildAnimeCorePayload(form)
}

async function uploadAnimeImages(item: Anime, form: AnimeForm) {
  const uploads: Array<{ label: string; promise: Promise<Anime> }> = []

  if (form.bannerFile) {
    uploads.push({
      label: "banner",
      promise: adminApi.uploadAnimeBanner(item.id, form.bannerFile),
    })
  }

  if (form.coverFile) {
    uploads.push({
      label: "cover",
      promise: adminApi.uploadAnimeCover(item.id, form.coverFile),
    })
  }

  const results = await Promise.allSettled(uploads.map((upload) => upload.promise))
  const failedLabels = results.flatMap((result, index) =>
    result.status === "rejected" ? [uploads[index].label] : [],
  )

  if (failedLabels.length > 0) {
    throw new Error(`не удалось загрузить: ${failedLabels.join(", ")}`)
  }
}

function getAnimeTitle(item: Anime) {
  return item.title?.russian || item.title?.romaji || `Anime #${item.id}`
}
