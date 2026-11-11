import { Suspense } from "react"
import { Outlet } from "react-router-dom"
import { Header } from "@/components/Header"
import { Loader } from "@/components/Loader"

export function AppShell() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-shell__content">
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
