import { authClient } from "@/lib/auth-client"
import { Navigate, Outlet } from "react-router"

export default function Auth() {
  // Выход со страницы авторизации если сессия существует
  if (authClient.useSession().data) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Outlet />
      </div>
    </div>
  )
}
