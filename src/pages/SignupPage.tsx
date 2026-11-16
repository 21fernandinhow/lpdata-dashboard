import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { userMessage } from "@/api/errors"
import { useSession } from "@/session/context"
import type { LoginState } from "@/session/guards"

// A senha vai duas vezes porque a API não tem recuperação de senha: um erro de digitação
// trancaria a conta. Quem compara os dois valores é a API (ADR 0006).
export default function SignupPage() {
  const { signUp } = useSession()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setPending(true)
    try {
      await signUp(
        String(form.get("email")),
        String(form.get("password")),
        String(form.get("password_confirmation")),
      )
      const state: LoginState = { notice: "Conta criada." }
      navigate("/login", { state })
    } catch (caught) {
      setError(userMessage(caught, "sign-up"))
      setPending(false)
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-page__form" onSubmit={handleSubmit}>
        <h1 className="auth-page__title">Criar conta</h1>
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
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
        <label className="auth-page__field">
          <span>Confirme a senha</span>
          <input
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            required
          />
        </label>
        <button className="auth-page__submit" type="submit" disabled={pending}>
          Criar conta
        </button>
        <p className="auth-page__alternative">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </form>
    </section>
  )
}
