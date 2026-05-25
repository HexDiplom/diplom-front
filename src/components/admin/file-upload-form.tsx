import { useState } from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FileInput } from "@/components/admin/form-fields"

type FileUploadFormProps = {
  label: string
  description?: string
  buttonLabel?: string
  disabled?: boolean
  onUpload: (file: File) => Promise<unknown>
  onSuccess?: () => void
}

export function FileUploadForm({
  label,
  description,
  buttonLabel = "Загрузить",
  disabled,
  onUpload,
  onSuccess,
}: FileUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  async function handleSubmit() {
    if (!file) {
      toast.error("Выберите файл")
      return
    }

    setIsUploading(true)

    try {
      await onUpload(file)
      toast.success("Файл загружен")
      setFile(null)
      setInputKey((current) => current + 1)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось загрузить файл")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="grid gap-3 rounded-3xl border bg-muted/20 p-4">
      <FileInput
        inputKey={inputKey}
        label={label}
        description={description}
        disabled={disabled || isUploading}
        onFileChange={setFile}
      />
      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || isUploading}
          onClick={handleSubmit}
        >
          <Upload className="size-4" />
          {isUploading ? "Загрузка..." : buttonLabel}
        </Button>
      </div>
    </div>
  )
}
