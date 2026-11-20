import { createBrowserRouter, type RouteObject } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { RouteError } from "@/components/ErrorBoundary"
import { HomePage, LandingPagePage, LoginPage, NotFoundPage, SignupPage } from "@/pages/lazy-pages"
import { GuestOnly, RequireSession } from "@/session/guards"

const routes: RouteObject[] = [
  {
    element: <AppShell />,
    // O data router captura os erros de renderização antes do ErrorBoundary de fora.
    errorElement: <RouteError />,
    children: [
      {
        element: <RequireSession />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "landing-pages/:id", element: <LandingPagePage /> },
        ],
      },
      {
        element: <GuestOnly />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "signup", element: <SignupPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]

// Data router, e não BrowserRouter: o aviso de alteração não salva usa useBlocker, que só
// existe nele.
export function createAppRouter() {
  return createBrowserRouter(routes)
}
