import { BrowserRouter } from "react-router-dom"
import { AppRoutes } from "@/AppRoutes"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { SessionProvider } from "@/session/SessionProvider"
import type { Session } from "@/session/session"

export function App({ session }: { session: Session }) {
  return (
    <ErrorBoundary>
      <SessionProvider session={session}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SessionProvider>
    </ErrorBoundary>
  )
}
