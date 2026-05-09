import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/globals.css'
import { BrowserRouter, Navigate } from 'react-router'
import { Routes } from 'react-router'
import { Route } from 'react-router'
import Auth from '@/pages/auth.tsx'
import { LoginForm } from '@/components/login-form.tsx'
import { ThemeProvider } from '@/components/theme-provider.tsx'
import { SignupForm } from '@/components/signup-form'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="auth" element={<Auth />}>
            <Route index element={<Navigate to="login" replace />} />
            <Route path="login" element={<LoginForm />} />
            <Route path="signup" element={<SignupForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
