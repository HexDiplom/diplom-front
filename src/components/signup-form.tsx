import { cn, getRandomBackgroundImage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Link, useLocation, useNavigate } from "react-router"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { getAuthErrorMessage } from "@/lib/auth-errors"
import { getAuthReturnPath } from "@/lib/auth-return"
import { useDocumentTitle } from "@/hooks/use-document-title"

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
                <Field className="grid grid-cols-2 gap-4">
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
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                или
              </FieldSeparator>
              <Field className="grid grid-cols-2 gap-4">
                <Button variant="outline" type="button">
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-6"viewBox="0 0 24 24">
                    <path
                      d="M19.303 5.337A17.3 17.3 0 0 0 14.963 4c-.191.329-.403.775-.552 1.125a16.6 16.6 0 0 0-4.808 0C9.454 4.775 9.23 4.329 9.05 4a17 17 0 0 0-4.342 1.337C1.961 9.391 1.218 13.35 1.59 17.255a17.7 17.7 0 0 0 5.318 2.664a13 13 0 0 0 1.136-1.836c-.627-.234-1.22-.52-1.794-.86c.149-.106.297-.223.435-.34c3.46 1.582 7.207 1.582 10.624 0c.149.117.287.234.435.34c-.573.34-1.167.626-1.793.86a13 13 0 0 0 1.135 1.836a17.6 17.6 0 0 0 5.318-2.664c.457-4.52-.722-8.448-3.1-11.918M8.52 14.846c-1.04 0-1.889-.945-1.889-2.101s.828-2.102 1.89-2.102c1.05 0 1.91.945 1.888 2.102c0 1.156-.838 2.1-1.889 2.1m6.974 0c-1.04 0-1.89-.945-1.89-2.101s.828-2.102 1.89-2.102c1.05 0 1.91.945 1.889 2.102c0 1.156-.828 2.1-1.89 2.1"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Войти с Discord</span>
                </Button>
                <Button variant="outline" type="button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Войти с Google</span>
                </Button>
              </Field>
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
