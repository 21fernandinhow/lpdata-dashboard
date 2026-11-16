import { isAxiosError, type AxiosInstance } from "axios"
import { createApiClient } from "@/api/client"
import { MESSAGES, userMessage } from "@/api/errors"
import { createHttpClient } from "@/api/http"

// O desenho da sessão está na ADR 0003: o access token vive só em memória, e o refresh token
// vive só no localStorage, que é o que sobrevive ao recarregamento.
export const REFRESH_TOKEN_KEY = "lpdata-refresh-token"

// Trava da Web Locks API: uma renovação por vez, entre todas as abas.
const RENEW_LOCK = "lpdata-session-renew"

export type User = { id: number; email: string }

type AuthResponse = { user: User; access_token: string; refresh_token: string }

export type SessionState =
  | { status: "checking"; user: null; notice: null }
  | { status: "signed-in"; user: User; notice: null }
  // notice: por que a sessão acabou, para mostrar no login. Nulo quando o usuário saiu.
  | { status: "signed-out"; user: null; notice: string | null }

export type Session = ReturnType<typeof createSession>

export function createSession() {
  // Chamadas de auth vão pelo cliente sem renovação: a renovação nunca dispara outra renovação.
  const http = createHttpClient()
  let accessToken: string | null = null
  let renewal: Promise<void> | null = null
  let started = false
  // Muda a cada entrada e saída. Uma renovação que termina depois de uma saída não vale mais.
  let version = 0
  let state: SessionState = readRefreshToken()
    ? { status: "checking", user: null, notice: null }
    : { status: "signed-out", user: null, notice: null }
  const listeners = new Set<() => void>()

  function setState(next: SessionState) {
    state = next
    listeners.forEach((listener) => listener())
  }

  function readRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  function applyTokens({ user, access_token, refresh_token }: AuthResponse) {
    version += 1
    accessToken = access_token
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
    setState({ status: "signed-in", user, notice: null })
  }

  function signedOut(notice: string | null) {
    version += 1
    accessToken = null
    setState({ status: "signed-out", user: null, notice })
  }

  function clearSession(notice: string | null) {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    signedOut(notice)
  }

  // Encerra um par de tokens na API. A resposta é ignorada.
  function revoke(refreshToken: string, token: string | null) {
    http
      .delete("/auth/sign_out", {
        data: { refresh_token: refreshToken },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .catch(() => {})
  }

  // Uma renovação por vez dentro da aba: quem pede durante uma renovação espera a mesma.
  function renew(): Promise<void> {
    const startedAt = version
    const stillCurrent = () => version === startedAt

    renewal ??= navigator.locks
      .request<void>(RENEW_LOCK, async () => {
        if (!stillCurrent()) throw new Error("A sessão acabou antes da renovação")
        // Relido dentro da trava: outra aba pode ter acabado de girar o token.
        const refreshToken = readRefreshToken()
        if (!refreshToken) {
          clearSession(MESSAGES.sessionExpired)
          throw new Error("Sessão sem refresh token")
        }
        try {
          const { data } = await http.post<AuthResponse>("/auth/refresh", {
            refresh_token: refreshToken,
          })
          if (!stillCurrent()) {
            // O usuário saiu durante a renovação: o par novo não volta a abrir a sessão.
            revoke(data.refresh_token, data.access_token)
            throw new Error("A sessão acabou durante a renovação")
          }
          applyTokens(data)
        } catch (error) {
          // Só a recusa da API encerra a sessão. Sem rede, o refresh token continua válido.
          if (isAxiosError(error) && error.response?.status === 401 && stillCurrent()) {
            clearSession(MESSAGES.sessionExpired)
          }
          throw error
        }
      })
      .finally(() => {
        renewal = null
      })
    return renewal
  }

  const api: AxiosInstance = createApiClient({
    getAccessToken: () => accessToken,
    renew,
    // Mesmo renovado, o token foi recusado: a sessão não vale mais.
    expire: () => {
      if (state.status === "signed-in") clearSession(MESSAGES.sessionExpired)
    },
  })

  return {
    api,

    getState: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    // Renovação ao abrir o app. Sem refresh token salvo, não chama a API.
    start() {
      if (started || state.status !== "checking") return
      started = true
      renew().catch((error: unknown) => {
        if (state.status === "checking") {
          signedOut(userMessage(error))
        }
      })
    },

    // Sair numa aba tira as outras da sessão: elas ouvem a remoção do refresh token.
    listenToOtherTabs() {
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea !== localStorage) return
        if (event.key !== REFRESH_TOKEN_KEY && event.key !== null) return
        if (readRefreshToken() || state.status === "signed-out") return
        signedOut(null)
      }
      window.addEventListener("storage", onStorage)
      return () => window.removeEventListener("storage", onStorage)
    },

    async signIn(email: string, password: string) {
      const { data } = await http.post<AuthResponse>("/auth/sign_in", { user: { email, password } })
      applyTokens(data)
    },

    // A API já abre uma sessão no cadastro, mas o fluxo leva ao login: ela é encerrada.
    async signUp(email: string, password: string, passwordConfirmation: string) {
      const { data } = await http.post<AuthResponse>("/auth/sign_up", {
        user: { email, password, password_confirmation: passwordConfirmation },
      })
      revoke(data.refresh_token, data.access_token)
    },

    // A sessão local acaba na hora, mesmo se a API falhar. A resposta do sign_out é ignorada.
    signOut() {
      const refreshToken = readRefreshToken()
      const token = accessToken
      clearSession(null)
      const signedOutAt = version

      // Dentro da trava, depois de qualquer renovação em curso: outra aba pode ter girado o
      // token enquanto esta esperava, e é o token girado que precisa ser encerrado.
      void navigator.locks.request(RENEW_LOCK, async () => {
        const rotated = version === signedOutAt ? readRefreshToken() : null
        if (rotated) localStorage.removeItem(REFRESH_TOKEN_KEY)
        const current = rotated ?? refreshToken
        if (current) revoke(current, token)
      })
    },
  }
}
