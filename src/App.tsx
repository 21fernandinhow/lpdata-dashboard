import { useState } from "react"
import { RouterProvider } from "react-router-dom"
import { createAppRouter } from "@/AppRoutes"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { SessionProvider } from "@/session/SessionProvider"
import type { Session } from "@/session/session"

export function App({ session }: { session: Session }) {
  // Um router por montagem do app, como um carregamento da página.
  const [router] = useState(createAppRouter)

  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        <RouterProvider router={router} />
      </SessionProvider>
    </ErrorBoundary>
  )
}
