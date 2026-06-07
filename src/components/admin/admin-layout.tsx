import { Link, Navigate, NavLink, Outlet } from "react-router"
import { ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { isAdminUser } from "@/lib/admin-auth"
import { cn } from "@/lib/utils"

const adminNavItems = [
  { title: "Аниме", to: "/admin/anime" },
  { title: "Студии", to: "/admin/studios" },
  { title: "Эпизоды", to: "/admin/episodes" },
  { title: "Видео", to: "/admin/episode-videos" },
]

export default function AdminLayout() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl items-center justify-center px-4">
        <div className="h-10 w-48 rounded-3xl bg-muted" />
      </div>
    )
  }

  if (!session?.user) {
    return <Navigate to="/auth/login" replace />
  }

  if (!isAdminUser(session.user)) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <ShieldAlert className="size-8" />
        </div>
        <div className="grid gap-2">
          <h1 className="text-2xl font-bold">Недостаточно прав</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Для доступа к админ-панели нужен пользователь с ролью admin.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/">На главную</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Админ-панель</h1>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-3xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground",
                )
              }
            >
              {item.title}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  )
}
