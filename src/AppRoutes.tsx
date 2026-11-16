import { lazy } from "react"
import { Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { GuestOnly, RequireSession } from "@/session/guards"

const HomePage = lazy(() => import("@/pages/HomePage"))
const LoginPage = lazy(() => import("@/pages/LoginPage"))
const SignupPage = lazy(() => import("@/pages/SignupPage"))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<RequireSession />}>
          <Route index element={<HomePage />} />
        </Route>
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
