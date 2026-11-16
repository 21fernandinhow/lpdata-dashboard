import { useEffect, useState } from "react"
import { userMessage } from "@/api/errors"
import { Loader } from "@/components/Loader"
import { useApi } from "@/session/context"
import type { User } from "@/session/session"

export default function HomePage() {
  const api = useApi()
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api
      .get<{ user: User }>("/auth/me", { signal: controller.signal })
      .then(({ data }) => setUser(data.user))
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) setError(userMessage(caught))
      })
    return () => controller.abort()
  }, [api])

  if (error) {
    return (
      <section className="status-page">
        <p className="status-page__text" role="alert">
          {error}
        </p>
      </section>
    )
  }
  if (!user) return <Loader />

  return (
    <section className="status-page">
      <div className="status-page__box">
        <h1 className="status-page__title">Olá, {user.email}</h1>
        <p className="status-page__text">As landing pages chegam na #12.</p>
      </div>
    </section>
  )
}
