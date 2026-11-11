import { BrowserRouter } from "react-router-dom"
import { AppRoutes } from "@/AppRoutes"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
