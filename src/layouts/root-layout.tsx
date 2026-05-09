import { Outlet } from "react-router"
import Header from "@/components/layout/header"

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-card text-foreground">
      <Header />

      <main>
        <Outlet />
      </main>
    </div>
  )
}
