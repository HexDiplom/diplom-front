import { authClient } from "@/lib/auth-client"
import { Navigate, Outlet } from "react-router"
import { useLocation } from "react-router"
import { getAuthReturnPath } from "@/lib/auth-return"

export default function Auth() {
  const location = useLocation()
  // Выход со страницы авторизации если сессия существует
  if (authClient.useSession().data) {
    return <Navigate to={getAuthReturnPath(location.state)} replace />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Outlet />
      </div>
    </div>
  )
}
