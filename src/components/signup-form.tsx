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
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { getAuthErrorMessage } from "@/lib/auth-errors"
import { getAuthReturnPath } from "@/lib/auth-return"
import { useDocumentTitle } from "@/hooks/use-document-title"
// import { SocialAuthButtons } from "@/components/social-auth-buttons"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  useDocumentTitle("Регистрация")

  const navigate = useNavigate()
  const location = useLocation()

  const backgroundImage = useMemo(() => getRandomBackgroundImage(), [])

  const [username, setUsername] = useState("")
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const from = getAuthReturnPath(location.state)

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim()) {
      toast.error("Введите логин")
      return
    }

    if (!nickname.trim()) {
      toast.error("Введите логин")
      return
    }

    if (!password) {
      toast.error("Введите пароль")
      return
    }

    if (!confirmPassword) {
      toast.error("Подтвердите пароль")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают")
      return
    }

    setIsLoading(true)

    const { error } = await authClient.signUp.email({
      email,
      name: username,
      username,
      displayUsername: nickname,
      password
    })

    setIsLoading(false)

    if (error) {
      toast.error(getAuthErrorMessage(error.code, error.message))
      return
    }

    toast.success("Добро пожаловать!")
    navigate(from, { replace: true })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Регистрация</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  Введите Ваши данные, чтобы создать свой аккаунт
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="username">Логин</FieldLabel>
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="nickname">Никнейм</FieldLabel>
                <Input
                  id="nickname"
                  type="nickname"
                  required
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field>
                <Field className="grid grid-cols-2 items-end gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Пароль</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Подтвердить пароль
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Минимальная длина 8 символов
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={isLoading}>Создать аккаунт</Button>
              </Field>
              {/*<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                или
              </FieldSeparator>
              <SocialAuthButtons callbackPath={from} disabled={isLoading} />*/}
              <FieldDescription className="text-center">
                Уже есть аккаунт? <Link to="/auth/login" state={location.state}>Войти</Link>
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
