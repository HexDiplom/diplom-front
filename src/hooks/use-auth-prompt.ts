import { createContext, useContext } from "react"

export type AuthPromptContextValue = {
  openAuthPrompt: () => void
}

export const AuthPromptContext = createContext<AuthPromptContextValue | null>(null)

export function useAuthPrompt() {
  const context = useContext(AuthPromptContext)

  if (!context) {
    throw new Error("useAuthPrompt must be used inside AuthPromptProvider")
  }

  return context
}
