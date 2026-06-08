import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import {
  adminApi,
  type EpisodeVideo,
  type EpisodeVideoCreatePayload,
  type EpisodeVideoUpdatePayload,
} from "@/api/admin"
import { EpisodeSelector } from "@/components/admin/entity-selectors"
import { EpisodeVideoUploadForm } from "@/components/admin/episode-video-upload-form"
import { TextField } from "@/components/admin/form-fields"
import { AdminResourcePage, type ResourceFormProps } from "@/components/admin/resource-page"
import { Button } from "@/components/ui/button"
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
  const queryClient = useQueryClient()
  const [episodeIdFilter, setEpisodeIdFilter] = useState("")

  async function refreshVideos() {
    await queryClient.invalidateQueries({ queryKey: ["admin-episode-videos"] })
  }

  return (
    <div className="grid gap-6">
      <EpisodeVideoUploadForm onChanged={refreshVideos} />
      <AdminResourcePage<EpisodeVideo, EpisodeVideoForm, EpisodeVideoCreatePayload, EpisodeVideoUpdatePayload>
        resourceKey="admin-episode-videos"
        title="Видео эпизодов"
        description="CRUD для записей episode-video и управление обработкой."
        createLabel="Создать видео вручную"
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
          label: "Фильтр по эпизоду",
          param: "episodeId",
          value: episodeIdFilter,
          placeholder: "Выберите эпизод",
          onChange: setEpisodeIdFilter,
          render: ({ value, onChange }) => (
            <EpisodeSelector
              value={value}
              onValueChange={onChange}
            />
          ),
        }}
        columns={[
          { header: "ID", className: "w-36 text-muted-foreground", render: (item) => item.id },
          { header: "Episode ID", render: (item) => item.episodeId ?? "—" },
          { header: "Manifest", render: (item) => item.manifestUrl ?? "—" },
          { header: "Озвучка", render: (item) => item.voiceoverName || "—" },
          { header: "Статус", render: renderVideoStatus },
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
        renderItemActions={(props) => <EpisodeVideoActions {...props} />}
      />
    </div>
  )
}

function EpisodeVideoFormFields({
  value,
  disabled,
  onChange,
}: ResourceFormProps<EpisodeVideoForm>) {
  return (
    <>
      <EpisodeSelector
        value={value.episodeId}
        required
        disabled={disabled}
        onValueChange={(episodeId) => onChange({ episodeId })}
      />
      <TextField
        label="Manifest URL"
        value={value.manifestUrl}
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
    manifestUrl: nullableString(form.manifestUrl),
    container: nullableString(form.container),
    availableResolutions: inputToNullableList(form.availableResolutions),
    voiceoverName: nullableString(form.voiceoverName),
    status: optionalString(form.status),
  }
}

function buildEpisodeVideoUpdatePayload(form: EpisodeVideoForm): EpisodeVideoUpdatePayload {
  return {
    episodeId: optionalString(form.episodeId),
    manifestUrl: nullableString(form.manifestUrl),
    container: nullableString(form.container),
    availableResolutions: inputToNullableList(form.availableResolutions),
    voiceoverName: nullableString(form.voiceoverName),
    status: optionalString(form.status),
  }
}

function renderVideoStatus(item: EpisodeVideo) {
  return (
    <div className="grid max-w-48 gap-1">
      <span>{item.status || "—"}</span>
      {item.statusReason && (
        <span className="line-clamp-2 text-xs text-destructive" title={item.statusReason}>
          {item.statusReason}
        </span>
      )}
    </div>
  )
}

function EpisodeVideoActions({
  item,
  disabled,
  refresh,
}: {
  item: EpisodeVideo
  disabled: boolean
  refresh: () => void
}) {
  const [isPending, setIsPending] = useState(false)

  if (item.status !== "UPLOADING" && item.status !== "QUEUE_FAILED") {
    return null
  }

  async function runAction() {
    setIsPending(true)

    try {
      if (item.status === "UPLOADING") {
        await adminApi.completeEpisodeVideoUpload(item.id)
        toast.success("Видео отправлено на обработку")
      } else {
        await adminApi.retryEpisodeVideoProcessing(item.id)
        toast.success("Обработка запущена повторно")
      }

      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось выполнить действие")
    } finally {
      setIsPending(false)
    }
  }

  const isCompleting = item.status === "UPLOADING"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={isCompleting ? "Завершить загрузку" : "Повторить обработку"}
      aria-label={isCompleting ? "Завершить загрузку" : "Повторить обработку"}
      disabled={disabled || isPending}
      onClick={runAction}
    >
      {isCompleting ? <CheckCircle2 className="size-4" /> : <RotateCcw className="size-4" />}
    </Button>
  )
}
