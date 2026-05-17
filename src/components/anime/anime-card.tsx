import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

type Props = {
  anime: any
}

export function AnimeCard({ anime }: Props) {
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger asChild>
        <div className="group cursor-pointer">
          <div className="relative overflow-hidden rounded-2xl">
            <div className="aspect-[3/4] bg-muted">
              {anime.coverImage ? (
                <img
                  src={anime.coverImage}
                  alt={anime.title?.romaji}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:blur-[2px]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-secondary text-sm text-muted-foreground">
                  No image
                </div>
              )}

              <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
            </div>
          </div>

          <div className="mt-2">
            <h3 className="line-clamp-1 text-lg font-semibold">
              {anime.title?.russian || anime.title?.romaji}
            </h3>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{anime.format || "TV"}</span>

              <span>{anime.seasonYear || "2025"}</span>
            </div>
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent
        side="right"
        className="w-80 border-border/50 bg-card/95 backdrop-blur"
      >
        <div className="space-y-3">
          <div>
            <h4 className="text-xl font-bold">
              {anime.title?.russian || anime.title?.romaji}
            </h4>

            <p className="text-sm text-muted-foreground">
              {anime.title?.romaji}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {anime.genres?.slice(0, 3).map((genre: string) => (
              <div
                key={genre}
                className="rounded-full bg-secondary px-2 py-1 text-xs"
              >
                {genre}
              </div>
            ))}
          </div>

          <p className="line-clamp-6 text-sm text-muted-foreground">
            {anime.description
              ?.replace(/<[^>]*>/g, "")
              || "Описание отсутствует"}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}