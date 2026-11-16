import { useEffect, type ReactNode } from "react"
import { SessionContext } from "@/session/context"
import type { Session } from "@/session/session"

type SessionProviderProps = { session: Session; children: ReactNode }

export function SessionProvider({ session, children }: SessionProviderProps) {
  useEffect(() => {
    session.start()
    return session.listenToOtherTabs()
  }, [session])

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
