import { authClient } from "@/lib/auth-client"

type AuthErrorCode = keyof typeof authClient.$ERROR_CODES

const authErrorMessages: Partial<Record<AuthErrorCode, string>> = {
  USER_ALREADY_EXISTS: "Пользователь с таким email или логином уже существует",
  INVALID_USERNAME: "Неверное имя пользователя",
  INVALID_USERNAME_OR_PASSWORD: "Неверное имя пользователя или пароль",
  INVALID_EMAIL_OR_PASSWORD: "Неверный email или пароль",
  INVALID_PASSWORD: "Неверный пароль",
  USER_NOT_FOUND: "Пользователь не найден",
  EMAIL_NOT_VERIFIED: "Email не подтверждён",
  PASSWORD_TOO_SHORT: "Пароль слишком короткий",
}

export function getAuthErrorMessage(code?: string, fallback?: string) {
  if (!code) {
    return fallback || "Произошла ошибка авторизации"
  }

  return authErrorMessages[code as AuthErrorCode] || fallback || "Произошла ошибка авторизации"
}
