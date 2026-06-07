export function nullableString(value: string): string | null {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

export function optionalString(value: string): string | undefined {
  return nullableString(value) ?? undefined
}

export function nullableNumber(value: string): number | null {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)

  return Number.isFinite(parsed) ? parsed : null
}

export function optionalNumber(value: string): number | undefined {
  return nullableNumber(value) ?? undefined
}

export function listToInput(value?: string[] | null): string {
  return Array.isArray(value) ? value.join(", ") : ""
}

export function inputToNullableList(value: string): string[] | null {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

  return items.length > 0 ? items : null
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString("ru-RU")
}

export function toInputString(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value)
}
