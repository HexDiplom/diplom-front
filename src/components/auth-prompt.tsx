import { useState, type ReactNode } from "react"
import { Bookmark, History, LogIn, Star, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Link, useLocation } from "react-router"

import { Button } from "@/components/ui/button"
import { AuthPromptContext } from "@/hooks/use-auth-prompt"
import { cn } from "@/lib/utils"

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const returnPath = `${location.pathname}${location.search}${location.hash}`
  const authState = { from: returnPath }

  return (
    <AuthPromptContext.Provider value={{ openAuthPrompt: () => setOpen(true) }}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-[101] w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border bg-popover p-6 text-popover-foreground shadow-2xl outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 rounded-full"
                aria-label="Закрыть"
              >
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>

            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <LogIn className="size-6" />
            </div>
            <DialogPrimitive.Title className="mt-5 text-2xl font-bold">
              Войдите в аккаунт
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted-foreground">
              Авторизация позволит сохранить вашу коллекцию и продолжать просмотр с любого
              устройства.
            </DialogPrimitive.Description>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Benefit icon={<History className="size-4" />} text="Сохранять прогресс" />
              <Benefit icon={<Bookmark className="size-4" />} text="Собирать избранное" />
              <Benefit icon={<Star className="size-4" />} text="Оценивать аниме" />
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <DialogPrimitive.Close asChild>
                <Button asChild>
                  <Link to="/auth/login" state={authState}>
                    Войти
                  </Link>
                </Button>
              </DialogPrimitive.Close>
              <DialogPrimitive.Close asChild>
                <Button asChild variant="outline">
                  <Link to="/auth/signup" state={authState}>
                    Зарегистрироваться
                  </Link>
                </Button>
              </DialogPrimitive.Close>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </AuthPromptContext.Provider>
  )
}

function Benefit({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-muted/65 px-3 py-3 text-xs font-semibold">
      <span className="text-muted-foreground">{icon}</span>
      {text}
    </div>
  )
}
