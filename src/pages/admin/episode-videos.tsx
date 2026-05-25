import { useState } from "react"

import {
  adminApi,
  type EpisodeVideo,
  type EpisodeVideoCreatePayload,
  type EpisodeVideoUpdatePayload,
} from "@/api/admin"
import { TextField } from "@/components/admin/form-fields"
import { AdminResourcePage, type ResourceFormProps } from "@/components/admin/resource-page"
import { formatDateTime, inputToNullableList, listToInput, nullableString, optionalString } from "@/lib/admin-form"

type EpisodeVideoForm = {
  episodeId: string
  manifestUrl: string
  container: string
  availableResolutions: string
  voiceoverName: string
  status: string
}

const emptyEpisodeVideoForm: EpisodeVideoForm = {
  episodeId: "",
  manifestUrl: "",
  container: "",
  availableResolutions: "",
  voiceoverName: "",
  status: "",
}

export default function AdminEpisodeVideosPage() {
  const [episodeIdFilter, setEpisodeIdFilter] = useState("")

  return (
    <AdminResourcePage<EpisodeVideo, EpisodeVideoForm, EpisodeVideoCreatePayload, EpisodeVideoUpdatePayload>
      resourceKey="admin-episode-videos"
      title="Видео эпизодов"
      description="CRUD для записей episode-video."
      createLabel="Создать видео"
      editLabel="Редактировать видео"
      emptyText="Видео не найдены"
      initialForm={emptyEpisodeVideoForm}
      sortOptions={[
        { label: "ID", value: "id" },
        { label: "Episode ID", value: "episodeId" },
        { label: "Озвучка", value: "voiceoverName" },
        { label: "Статус", value: "status" },
        { label: "Контейнер", value: "container" },
      ]}
      defaultSortBy="id"
      filter={{
        label: "Фильтр Episode ID",
        param: "episodeId",
        value: episodeIdFilter,
        placeholder: "UUID эпизода",
        onChange: setEpisodeIdFilter,
      }}
      columns={[
        { header: "ID", className: "w-36 text-muted-foreground", render: (item) => item.id },
        { header: "Episode ID", render: (item) => item.episodeId ?? "—" },
        { header: "Manifest", render: (item) => item.manifestUrl ?? "—" },
        { header: "Озвучка", render: (item) => item.voiceoverName || "—" },
        { header: "Статус", render: (item) => item.status || "—" },
        { header: "Обновлено", render: (item) => formatDateTime(item.updatedAt) },
      ]}
      getId={(item) => item.id}
      getTitle={(item) => item.voiceoverName || `Video #${item.id}`}
      list={adminApi.listEpisodeVideos}
      create={adminApi.createEpisodeVideo}
      update={adminApi.updateEpisodeVideo}
      remove={adminApi.deleteEpisodeVideo}
      toForm={toEpisodeVideoForm}
      buildCreatePayload={buildEpisodeVideoCreatePayload}
      buildUpdatePayload={buildEpisodeVideoUpdatePayload}
      renderForm={(props) => <EpisodeVideoFormFields {...props} />}
    />
  )
}

function EpisodeVideoFormFields({
  value,
  disabled,
  onChange,
}: ResourceFormProps<EpisodeVideoForm>) {
  return (
    <>
      <TextField
        label="Episode ID"
        value={value.episodeId}
        required
        disabled={disabled}
        onValueChange={(episodeId) => onChange({ episodeId })}
      />
      <TextField
        label="Manifest URL"
        value={value.manifestUrl}
        required
        disabled={disabled}
        onValueChange={(manifestUrl) => onChange({ manifestUrl })}
      />
      <TextField
        label="Контейнер"
        value={value.container}
        disabled={disabled}
        onValueChange={(container) => onChange({ container })}
      />
      <TextField
        label="Доступные разрешения"
        description="Через запятую"
        value={value.availableResolutions}
        disabled={disabled}
        onValueChange={(availableResolutions) => onChange({ availableResolutions })}
      />
      <TextField
        label="Озвучка"
        value={value.voiceoverName}
        disabled={disabled}
        onValueChange={(voiceoverName) => onChange({ voiceoverName })}
      />
      <TextField
        label="Статус"
        value={value.status}
        disabled={disabled}
        onValueChange={(status) => onChange({ status })}
      />
    </>
  )
}

function toEpisodeVideoForm(item: EpisodeVideo): EpisodeVideoForm {
  return {
    episodeId: item.episodeId ?? "",
    manifestUrl: item.manifestUrl ?? "",
    container: item.container ?? "",
    availableResolutions: listToInput(item.availableResolutions),
    voiceoverName: item.voiceoverName ?? "",
    status: item.status ?? "",
  }
}

function buildEpisodeVideoCreatePayload(form: EpisodeVideoForm): EpisodeVideoCreatePayload {
  return {
    episodeId: form.episodeId.trim(),
    manifestUrl: form.manifestUrl.trim(),
    container: nullableString(form.container),
    availableResolutions: inputToNullableList(form.availableResolutions),
    voiceoverName: nullableString(form.voiceoverName),
    status: nullableString(form.status),
  }
}

function buildEpisodeVideoUpdatePayload(form: EpisodeVideoForm): EpisodeVideoUpdatePayload {
  return {
    episodeId: optionalString(form.episodeId),
    manifestUrl: optionalString(form.manifestUrl),
    container: nullableString(form.container),
    availableResolutions: inputToNullableList(form.availableResolutions),
    voiceoverName: nullableString(form.voiceoverName),
    status: nullableString(form.status),
  }
}
