export const ADMIN_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp"
export const ADMIN_IMAGE_MAX_SIZE = 10 * 1024 * 1024

const ADMIN_IMAGE_TYPES = new Set(ADMIN_IMAGE_ACCEPT.split(","))

export function getImageFileError(file: File) {
  if (!ADMIN_IMAGE_TYPES.has(file.type)) {
    return "Поддерживаются только JPEG, PNG и WebP"
  }

  if (file.size > ADMIN_IMAGE_MAX_SIZE) {
    return "Размер изображения не должен превышать 10 МБ"
  }

  return null
}

export function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} КБ`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}
