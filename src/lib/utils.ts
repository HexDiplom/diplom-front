import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomBackgroundImage() {
  const images = Object.values(
    import.meta.glob('@/assets/backgrounds/*.{png,jpg,jpeg,webp}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ) as string[]

  return images[Math.floor(Math.random() * images.length)]
}
