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
import { Toaster } from '@/components/ui/sonner'
import Home from './pages/home'
import { RootLayout } from './layouts/root-layout'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminLayout from '@/components/admin/admin-layout'
import AdminAnimePage from '@/pages/admin/anime'
import AdminAnimeDetailPage from '@/pages/admin/anime-detail'
import AdminStudiosPage from '@/pages/admin/studios'
import AdminEpisodesPage from '@/pages/admin/episodes'
import AdminEpisodeVideosPage from '@/pages/admin/episode-videos'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <Routes>
            <Route element={<RootLayout />}>
              <Route index element={<Home />}/>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="anime" replace />} />
                <Route path="anime" element={<AdminAnimePage />} />
                <Route path="anime/:id" element={<AdminAnimeDetailPage />} />
                <Route path="studios" element={<AdminStudiosPage />} />
                <Route path="episodes" element={<AdminEpisodesPage />} />
                <Route path="episode-videos" element={<AdminEpisodeVideosPage />} />
              </Route>
            </Route>
            <Route path="auth" element={<Auth />}>
              <Route index element={<Navigate to="login" replace />} />
              <Route path="login" element={<LoginForm />} />
              <Route path="signup" element={<SignupForm />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
