// src/components/layout/header.tsx

import { Link, NavLink, useNavigate } from "react-router"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  {
    title: "Главная",
    to: "/",
  },
  {
    title: "Каталог",
    to: "/anime",
  },
  {
    title: "Избранное",
    to: "/favorites",
  },
]

export default function Header() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  const user = session?.user

  async function handleLogout() {
    await authClient.signOut()
    navigate("/auth/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Anime
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                  )
                }
              >
                {item.title}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isPending ? (
            <div className="h-9 w-24 rounded-md bg-muted" />
          ) : user ? (
            <UserMenu
              email={user.email}
              name={user.displayUsername}
              image={user.image}
              onLogout={handleLogout}
            />
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/auth/login">Войти</Link>
              </Button>

              <Button asChild>
                <Link to="/auth/signup">Регистрация</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <MobileMenu
            user={user}
            isPending={isPending}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  )
}

type UserMenuProps = {
  email?: string | null
  name?: string | null
  image?: string | null
  onLogout: () => void
}

function UserMenu({ email, name, image, onLogout }: UserMenuProps) {
  const fallback = name?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative text-muted-foreground rounded-full px-2 py-6">
          <span>{name}</span>
          <Avatar className="size-9">
            <AvatarImage src={image || undefined} alt={name || email || "User"} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {name || "Пользователь"}
            </span>
            {email && (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/profile">Профиль</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/settings">Настройки</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onLogout}>
          Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type MobileMenuProps = {
  user: {
    email?: string | null
    name?: string | null
    image?: string | null
    displayUsername?: string | null
  } | null | undefined
  isPending: boolean
  onLogout: () => void
}

function MobileMenu({ user, isPending, onLogout }: MobileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Открыть меню">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Меню</SheetTitle>
        </SheetHeader>

        <nav className="px-4 mt-6 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground",
                )
              }
            >
              {item.title}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 mt-6 border-t pt-6">
          {isPending ? (
            <div className="h-10 rounded-md bg-muted" />
          ) : user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-1">
                <Avatar className="size-9">
                  <AvatarImage src={user.image || undefined} />
                  <AvatarFallback>
                    {user.displayUsername?.[0]?.toUpperCase() ||
                      user.email?.[0]?.toUpperCase() ||
                      "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.displayUsername || "Пользователь"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={onLogout}>
                Выйти
              </Button>
            </div>
          ) : (
            <div className="grid gap-2">
              <Button variant="outline" asChild>
                <Link to="/auth/login">Войти</Link>
              </Button>

              <Button asChild>
                <Link to="/auth/signup">Регистрация</Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
