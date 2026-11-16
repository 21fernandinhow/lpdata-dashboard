// Imitação da API do LPData para os testes, no nível da rede (MSW).
// Reproduz o que muda o comportamento do cliente: rotação do refresh token, 401 no reuso,
// os dois envelopes de erro e o 302 para quem não pede JSON.
import { http, HttpResponse } from "msw/http"
import { setupServer } from "msw/node"
import { env } from "@/env"

type User = { id: number; email: string; password: string }
type LoggedRequest = { method: string; path: string; headers: Headers; body: unknown }

const WARDEN_401 = { error: "You need to sign in or sign up before continuing." }
const INVALID_REFRESH = { errors: ["Invalid or expired refresh token"] }

export const url = (path: string) => `${env.apiBaseUrl}${path}`

// A API aceita a origem do dashboard no CORS, e o jsdom confere o cabeçalho como o navegador.
const CORS = { "Access-Control-Allow-Origin": window.location.origin }

function json(body: Parameters<typeof HttpResponse.json>[0], status = 200) {
  return HttpResponse.json(body, { status, headers: CORS })
}

function empty(status: number, headers: Record<string, string> = {}) {
  return new HttpResponse(null, { status, headers: { ...CORS, ...headers } })
}

function createFakeApi() {
  let users: User[] = []
  let accessTokens = new Map<string, number>()
  let refreshTokens = new Map<string, number>()
  let expireNext = false
  let refusingRefreshes = false
  let refreshGate: Promise<void> | null = null
  let sequence = 0
  let log: LoggedRequest[] = []

  function issueTokens(user: User) {
    sequence += 1
    const access = `access-${sequence}`
    const refresh = `refresh-${sequence}`
    // Um token "vencido" é emitido e nunca aceito, como um JWT que passou das 2 horas.
    if (expireNext) expireNext = false
    else accessTokens.set(access, user.id)
    refreshTokens.set(refresh, user.id)
    return {
      user: { id: user.id, email: user.email },
      access_token: access,
      refresh_token: refresh,
    }
  }

  function bearerUser(request: Request) {
    const token = request.headers.get("Authorization")?.replace(/^Bearer /, "")
    const id = token ? accessTokens.get(token) : undefined
    return users.find((user) => user.id === id)
  }

  async function record(request: Request) {
    const text = await request.clone().text()
    log.push({
      method: request.method,
      path: new URL(request.url).pathname,
      headers: request.headers,
      body: text ? JSON.parse(text) : undefined,
    })
  }

  // Com o Accept do navegador, o Rails trata a requisição como navegação e redireciona.
  function wantsJson(request: Request) {
    return request.headers.get("Accept") === "application/json"
  }

  const redirect = () => empty(302, { Location: "/" })

  const handlers = [
    // Preflight do CORS: só Authorization e Content-Type passam. Um cabeçalho próprio é recusado,
    // e o jsdom, como o navegador, não manda a requisição.
    http.options(url("/*"), () =>
      empty(204, {
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      }),
    ),

    http.all(url("/*"), async ({ request }) => {
      await record(request)
      if (!wantsJson(request)) return redirect()
    }),

    http.post(url("/auth/sign_up"), async ({ request }) => {
      const { user } = (await request.json()) as {
        user: { email: string; password: string; password_confirmation: string }
      }
      const errors: string[] = []
      if (users.some((existing) => existing.email === user.email))
        errors.push("Email has already been taken")
      if (user.password.length < 6) errors.push("Password is too short (minimum is 6 characters)")
      if (user.password !== user.password_confirmation)
        errors.push("Password confirmation doesn't match Password")
      if (errors.length) return json({ errors }, 422)

      const created = { id: users.length + 1, email: user.email, password: user.password }
      users.push(created)
      return json(issueTokens(created), 201)
    }),

    http.post(url("/auth/sign_in"), async ({ request }) => {
      const { user } = (await request.json()) as { user: { email: string; password: string } }
      const found = users.find(
        (existing) => existing.email === user.email && existing.password === user.password,
      )
      if (!found) return json({ errors: ["Invalid email or password"] }, 401)
      return json(issueTokens(found))
    }),

    http.post(url("/auth/refresh"), async ({ request }) => {
      const { refresh_token } = (await request.json()) as { refresh_token?: string }
      if (refreshGate) await refreshGate
      const id = refresh_token ? refreshTokens.get(refresh_token) : undefined
      const user = users.find((existing) => existing.id === id)
      if (!refresh_token || !user || refusingRefreshes) return json(INVALID_REFRESH, 401)
      // Uso único: a renovação invalida o refresh token usado.
      refreshTokens.delete(refresh_token)
      return json(issueTokens(user))
    }),

    http.get(url("/auth/me"), ({ request }) => {
      const user = bearerUser(request)
      if (!user) return json(WARDEN_401, 401)
      return json({ user: { id: user.id, email: user.email } })
    }),

    http.delete(url("/auth/sign_out"), async ({ request }) => {
      const { refresh_token } = (await request.json()) as { refresh_token?: string }
      if (refresh_token) refreshTokens.delete(refresh_token)
      const token = request.headers.get("Authorization")?.replace(/^Bearer /, "")
      if (token) accessTokens.delete(token)
      return empty(204)
    }),
  ]

  return {
    server: setupServer(...handlers),

    reset() {
      users = []
      accessTokens = new Map()
      refreshTokens = new Map()
      expireNext = false
      refusingRefreshes = false
      refreshGate = null
      sequence = 0
      log = []
    },

    createUser(email: string, password: string) {
      const user = { id: users.length + 1, email, password }
      users.push(user)
      return user
    },

    // Abre uma sessão para o usuário, como um login anterior, e devolve o refresh token.
    openSession(email: string) {
      const user = users.find((existing) => existing.email === email)
      if (!user) throw new Error(`Usuário inexistente: ${email}`)
      return issueTokens(user).refresh_token
    },

    // Todo access token emitido até aqui vence, como depois de 2 horas.
    expireAccessTokens() {
      accessTokens = new Map()
    },

    // O próximo access token emitido já nasce vencido.
    expireNextAccessToken() {
      expireNext = true
    },

    // Recusa toda renovação, como se cada refresh token emitido já tivesse sido revogado.
    refuseRefreshes() {
      refusingRefreshes = true
    },

    // Segura as renovações no servidor até a função devolvida ser chamada.
    holdRefreshes() {
      let release = () => {}
      refreshGate = new Promise<void>((resolve) => {
        release = () => {
          refreshGate = null
          resolve()
        }
      })
      return release
    },

    // Os refresh tokens que ainda renovam uma sessão.
    validRefreshTokens() {
      return [...refreshTokens.keys()]
    },

    requests(method: string, path: string) {
      return log.filter((request) => request.method === method && request.path === path)
    },

    allRequests() {
      return log
    },
  }
}

export const fakeApi = createFakeApi()
