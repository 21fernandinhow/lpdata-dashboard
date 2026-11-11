import { lazy } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/AppShell"

const LoginPage = lazy(() => import("@/pages/LoginPage"))
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Sem sessão ainda (#11), o início leva sempre ao login. */}
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
