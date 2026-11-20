import { lazy } from "react"

// Cada página num chunk próprio, carregado na primeira visita.
export const HomePage = lazy(() => import("@/pages/HomePage"))
export const LandingPagesPage = lazy(() => import("@/pages/LandingPagesPage"))
export const LandingPagePage = lazy(() => import("@/pages/LandingPagePage"))
export const LoginPage = lazy(() => import("@/pages/LoginPage"))
export const SignupPage = lazy(() => import("@/pages/SignupPage"))
export const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"))
export const AssetsPage = lazy(() => import("@/pages/AssetsPage"))
