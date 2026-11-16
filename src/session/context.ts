import { createContext, useContext, useSyncExternalStore } from "react"
import type { Session } from "@/session/session"

export const SessionContext = createContext<Session | null>(null)

function useSessionInstance() {
  const session = useContext(SessionContext)
  if (!session) throw new Error("useSession precisa de um SessionProvider acima.")
  return session
}

// O estado da sessão para os componentes: verificando, logado ou deslogado, e o usuário.
export function useSession() {
  const session = useSessionInstance()
  const state = useSyncExternalStore(session.subscribe, session.getState)
  return {
    ...state,
    signIn: session.signIn,
    signUp: session.signUp,
    signOut: session.signOut,
  }
}

// O cliente central da API, com o token da sessão e a renovação no 401.
export function useApi() {
  return useSessionInstance().api
}
