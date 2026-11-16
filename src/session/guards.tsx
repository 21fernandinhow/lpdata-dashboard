import { Navigate, Outlet, useLocation, type Location } from "react-router-dom"
import { Loader } from "@/components/Loader"
import { useSession } from "@/session/context"

// O que o login recebe pelo state da navegação.
export type LoginState = { from?: Location; notice?: string | null }

// Rotas que pedem sessão. Sem ela, leva ao login, que depois devolve o usuário para cá.
export function RequireSession() {
  const { status, notice } = useSession()
  const location = useLocation()

  if (status === "checking") return <Loader />
  if (status === "signed-out") {
    const state: LoginState = { from: location, notice }
    return <Navigate to="/login" state={state} replace />
  }
  return <Outlet />
}

// Login e cadastro. Com sessão, leva à rota que o usuário tinha pedido.
export function GuestOnly() {
  const { status } = useSession()
  const location = useLocation()

  if (status === "checking") return <Loader />
  if (status === "signed-in") {
    const from = (location.state as LoginState | null)?.from
    return <Navigate to={from ?? "/"} replace />
  }
  return <Outlet />
}
