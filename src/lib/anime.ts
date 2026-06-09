import type { Anime } from "@/api/anime"

export function getAnimeTitle(anime: Anime) {
  return (
    anime.title.russian ||
    anime.title.romaji ||
    anime.title.english ||
    "Без названия"
  )
}

export function getAnimeYear(anime: Anime) {
  return anime.seasonYear || anime.startDateYear || anime.endDateYear || undefined
}

export function getAnimeCoverImage(anime: Anime) {
  return (
    anime.coverImage?.large ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.medium ||
    anime.coverImage?.original
  )
}
