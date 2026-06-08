import { useRef, useState, type FormEvent } from "react"
import { Ban, Upload } from "lucide-react"
import { toast } from "sonner"

import { adminApi, uploadFileToPresignedUrl } from "@/api/admin"
import { EpisodeSelector } from "@/components/admin/entity-selectors"
import { FileInput, TextField } from "@/components/admin/form-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type UploadPhase = "idle" | "creating" | "uploading" | "completing"

type EpisodeVideoUploadFormProps = {
  onChanged: () => Promise<unknown> | unknown
}

export function EpisodeVideoUploadForm({ onChanged }: EpisodeVideoUploadFormProps) {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [episodeId, setEpisodeId] = useState("")
  const [voiceoverName, setVoiceoverName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [phase, setPhase] = useState<UploadPhase>("idle")
  const [progress, setProgress] = useState(0)

  const isBusy = phase !== "idle"

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!episodeId.trim()) {
      toast.error("Укажите Episode ID")
      return
    }

    if (!file) {
      toast.error("Выберите MP4-файл")
      return
    }

    if ((file.type && file.type !== "video/mp4") || !file.name.toLowerCase().endsWith(".mp4")) {
      toast.error("Поддерживаются только MP4-файлы")
      return
    }

    setProgress(0)
    setPhase("creating")

    try {
      const uploadResult = await adminApi.createEpisodeVideoUpload({
        episodeId: episodeId.trim(),
        contentType: "video/mp4",
        fileName: file.name,
        fileSize: file.size,
        voiceoverName: voiceoverName.trim() || undefined,
      })
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setPhase("uploading")
      await uploadFileToPresignedUrl(uploadResult.upload, file, {
        signal: abortController.signal,
        onProgress: setProgress,
      })

      abortControllerRef.current = null
      setPhase("completing")
      await adminApi.completeEpisodeVideoUpload(uploadResult.video.id)

      toast.success("Видео загружено и отправлено на обработку")
      setEpisodeId("")
      setVoiceoverName("")
      setFile(null)
      setInputKey((current) => current + 1)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.info("Загрузка отменена")
      } else {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить видео")
      }
    } finally {
      abortControllerRef.current = null
      setPhase("idle")
      await onChanged()
    }
  }

  function cancelUpload() {
    abortControllerRef.current?.abort()
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>Загрузить видео серии</CardTitle>
        <CardDescription>
          MP4 будет загружен напрямую в хранилище и автоматически отправлен на обработку.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <EpisodeSelector
            className="md:col-span-2"
            value={episodeId}
            required
            disabled={isBusy}
            onValueChange={setEpisodeId}
          />
          <TextField
            label="Озвучка"
            value={voiceoverName}
            disabled={isBusy}
            onValueChange={setVoiceoverName}
          />
          <FileInput
            className="md:col-span-2"
            inputKey={inputKey}
            label="MP4-файл"
            description={file ? `${file.name} · ${formatFileSize(file.size)}` : undefined}
            accept="video/mp4,.mp4"
            disabled={isBusy}
            onFileChange={setFile}
          />

          {isBusy && (
            <div className="grid gap-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{getPhaseLabel(phase)}</span>
                {phase === "uploading" && <span className="text-muted-foreground">{progress}%</span>}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${phase === "uploading" ? progress : 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={isBusy}>
              <Upload className="size-4" />
              {isBusy ? getPhaseLabel(phase) : "Загрузить MP4"}
            </Button>
            {phase === "uploading" && (
              <Button type="button" variant="outline" onClick={cancelUpload}>
                <Ban className="size-4" />
                Отменить
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function getPhaseLabel(phase: UploadPhase) {
  switch (phase) {
    case "creating":
      return "Подготовка загрузки..."
    case "uploading":
      return "Загрузка файла..."
    case "completing":
      return "Запуск обработки..."
    default:
      return "Загрузить MP4"
  }
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} КБ`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}
