import { useState } from "react"

import { adminApi, type Episode, type EpisodeCreatePayload, type EpisodeUpdatePayload } from "@/api/admin"
import { AnimeSelector } from "@/components/admin/entity-selectors"
import { FileUploadForm } from "@/components/admin/file-upload-form"
import { CheckboxField, ImageFileField, NumberField, TextareaField, TextField } from "@/components/admin/form-fields"
import { AdminResourcePage, type ResourceFormProps } from "@/components/admin/resource-page"
import { formatDateTime, nullableNumber, nullableString, optionalNumber, toInputString } from "@/lib/admin-form"

type EpisodeForm = {
  animeId: string
  number: string
  duration: string
  thumbnailUrl: string
  name: string
  description: string
  isFiller: boolean
  thumbnailFile: File | null
}

const emptyEpisodeForm: EpisodeForm = {
  animeId: "",
  number: "",
  duration: "",
  thumbnailUrl: "",
  name: "",
  description: "",
  isFiller: false,
  thumbnailFile: null,
}

export default function AdminEpisodesPage() {
  const [animeIdFilter, setAnimeIdFilter] = useState("")

  return (
    <AdminResourcePage<Episode, EpisodeForm, EpisodeCreatePayload, EpisodeUpdatePayload>
      resourceKey="admin-episodes"
      title="Эпизоды"
      description="CRUD для записей episode."
      createLabel="Создать эпизод"
      editLabel="Редактировать эпизод"
      emptyText="Эпизоды не найдены"
      initialForm={emptyEpisodeForm}
      sortOptions={[
        { label: "ID", value: "id" },
        { label: "Номер", value: "number" },
        { label: "Название", value: "name" },
        { label: "Anime ID", value: "animeId" },
      ]}
      defaultSortBy="id"
      filter={{
        label: "Фильтр по аниме",
        param: "animeId",
        value: animeIdFilter,
        placeholder: "Выберите аниме",
        onChange: setAnimeIdFilter,
        render: ({ value, onChange }) => (
          <AnimeSelector
            label="Фильтр по аниме"
            value={value}
            onValueChange={onChange}
            allowClear
            placeholder="Все аниме"
          />
        ),
      }}
      columns={[
        { header: "ID", className: "w-36 text-muted-foreground", render: (item) => item.id },
        { header: "Anime ID", render: (item) => item.animeId ?? "—" },
        { header: "Номер", render: (item) => item.number ?? "—" },
        { header: "Название", render: (item) => item.name || "—" },
        { header: "Filler", render: (item) => (item.isFiller ? "Да" : "Нет") },
        { header: "Обновлено", render: (item) => formatDateTime(item.updatedAt) },
      ]}
      getId={(item) => item.id}
      getTitle={(item) => item.name || `Episode #${item.id}`}
      list={adminApi.listEpisodes}
      create={adminApi.createEpisode}
      afterCreate={(item, form) =>
        form.thumbnailFile
          ? adminApi.uploadEpisodeThumbnail(item.id, form.thumbnailFile).then(() => undefined)
          : Promise.resolve()
      }
      update={adminApi.updateEpisode}
      remove={adminApi.deleteEpisode}
      toForm={toEpisodeForm}
      buildCreatePayload={buildEpisodeCreatePayload}
      buildUpdatePayload={buildEpisodeUpdatePayload}
      renderForm={(props) => <EpisodeFormFields {...props} />}
      renderFormExtra={({ editingItem, disabled, refresh }) =>
        editingItem ? (
          <FileUploadForm
            label="Загрузить thumbnail"
            disabled={disabled}
            onUpload={(file) => adminApi.uploadEpisodeThumbnail(editingItem.id, file)}
            onSuccess={refresh}
          />
        ) : null
      }
    />
  )
}

function EpisodeFormFields({ value, disabled, isEditing, onChange }: ResourceFormProps<EpisodeForm>) {
  return (
    <>
      <AnimeSelector
        label="Аниме"
        value={value.animeId}
        required
        disabled={disabled}
        onValueChange={(animeId) => onChange({ animeId })}
      />
      <NumberField
        label="Номер"
        value={value.number}
        required
        disabled={disabled}
        onValueChange={(number) => onChange({ number })}
      />
      <TextField
        label="Длительность"
        value={value.duration}
        disabled={disabled}
        onValueChange={(duration) => onChange({ duration })}
      />
      <TextField
        label="Thumbnail URL"
        value={value.thumbnailUrl}
        disabled={disabled}
        onValueChange={(thumbnailUrl) => onChange({ thumbnailUrl })}
      />
      {!isEditing && (
        <ImageFileField
          label="Thumbnail"
          description="JPEG, PNG или WebP, до 10 МБ. Выбранный файл имеет приоритет над URL."
          value={value.thumbnailFile}
          disabled={disabled}
          onFileChange={(thumbnailFile) => onChange({ thumbnailFile })}
        />
      )}
      <TextField
        label="Название"
        value={value.name}
        disabled={disabled}
        onValueChange={(name) => onChange({ name })}
      />
      <TextareaField
        label="Описание"
        value={value.description}
        disabled={disabled}
        onValueChange={(description) => onChange({ description })}
      />
      <CheckboxField
        label="Филлер"
        checked={value.isFiller}
        disabled={disabled}
        onCheckedChange={(isFiller) => onChange({ isFiller })}
      />
    </>
  )
}

function toEpisodeForm(item: Episode): EpisodeForm {
  return {
    animeId: toInputString(item.animeId),
    number: toInputString(item.number),
    duration: item.duration ?? "",
    thumbnailUrl: item.thumbnailUrl ?? "",
    name: item.name ?? "",
    description: item.description ?? "",
    isFiller: Boolean(item.isFiller),
    thumbnailFile: null,
  }
}

function buildEpisodeCreatePayload(form: EpisodeForm): EpisodeCreatePayload {
  return {
    animeId: nullableNumber(form.animeId) ?? 0,
    number: nullableNumber(form.number) ?? 0,
    duration: nullableString(form.duration),
    thumbnailUrl: nullableString(form.thumbnailUrl),
    name: nullableString(form.name),
    description: nullableString(form.description),
    isFiller: form.isFiller,
  }
}

function buildEpisodeUpdatePayload(form: EpisodeForm): EpisodeUpdatePayload {
  return {
    animeId: optionalNumber(form.animeId),
    number: optionalNumber(form.number),
    duration: nullableString(form.duration),
    thumbnailUrl: nullableString(form.thumbnailUrl),
    name: nullableString(form.name),
    description: nullableString(form.description),
    isFiller: form.isFiller,
  }
}
