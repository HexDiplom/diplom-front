import { useEffect } from "react"

const SITE_NAME = import.meta.env.VITE_SITE_NAME?.trim() || "Anime"

type DocumentTitlePart = string | null | undefined

export function useDocumentTitle(...parts: DocumentTitlePart[]) {
  const title = [...parts, SITE_NAME]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" | ")

  useEffect(() => {
    document.title = title
  }, [title])
}
