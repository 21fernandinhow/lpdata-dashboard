import { useState, type FormEvent } from "react"
import { Link, useLocation } from "react-router-dom"
import { userMessage } from "@/api/errors"
import { useSession } from "@/session/context"
import type { LoginState } from "@/session/guards"

export default function LoginPage() {
  const { signIn } = useSession()
  const location = useLocation()
  const notice = (location.state as LoginState | null)?.notice
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Com o login certo, a sessão muda e o GuestOnly leva à rota pedida.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setPending(true)
    try {
      await signIn(String(form.get("email")), String(form.get("password")))
    } catch (caught) {
      setError(userMessage(caught, "sign-in"))
      setPending(false)
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-page__form" onSubmit={handleSubmit}>
        <h1 className="auth-page__title">Entrar no dashboard</h1>
        {notice && !error && (
          <p className="auth-page__notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="auth-page__error" role="alert">
            {error}
          </p>
        )}
        <label className="auth-page__field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="auth-page__field">
          <span>Senha</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="auth-page__submit" type="submit" disabled={pending}>
          Entrar
        </button>
        <p className="auth-page__alternative">
          Ainda não tem conta? <Link to="/signup">Criar conta</Link>
        </p>
      </form>
    </section>
  )
}
