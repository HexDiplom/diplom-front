import { cn, getRandomBackgroundImage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  // FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Link, useLocation, useNavigate } from "react-router"
import { useMemo, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { getAuthErrorMessage } from "@/lib/auth-errors"
import { getAuthReturnPath } from "@/lib/auth-return"
import { useDocumentTitle } from "@/hooks/use-document-title"
// import { SocialAuthButtons } from "@/components/social-auth-buttons"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  useDocumentTitle("Авторизация")

  const navigate = useNavigate()
  const location = useLocation()

  const backgroundImage = useMemo(() => getRandomBackgroundImage(), [])

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const from = getAuthReturnPath(location.state)

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim()) {
      toast.error("Введите логин")
      return
    }

    if (!password) {
      toast.error("Введите пароль")
      return
    }

    setIsLoading(true)

    const { error } = await authClient.signIn.username({
      username,
      password
    })

    setIsLoading(false)

    if (error) {
      toast.error(getAuthErrorMessage(error.code, error.message))
      return
    }

    toast.success("Успешная авторизация!")
    navigate(from, { replace: true })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Авторизация</h1>
                <p className="text-balance text-muted-foreground">
                  Введите имя пользователя и пароль, чтобы войти в свой аккаунт
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="username">Логин</FieldLabel>
                <Input
                  id="username"
                  type="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Забыли пароль?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required                />
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>{isLoading ? "Вход..." : "Войти"}</Button>
              </Field>
              {/*<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                или
              </FieldSeparator>*/}
              {/*<SocialAuthButtons callbackPath={from} disabled={isLoading} />*/}
              <FieldDescription className="text-center">
                Ещё нет аккаунта? <Link to="/auth/signup" state={location.state}>Регистрация</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src={backgroundImage}
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.7]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
