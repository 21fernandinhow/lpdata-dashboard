// Imitação da API do LPData para os testes, no nível da rede (MSW).
// Reproduz o que muda o comportamento do cliente: rotação do refresh token, 401 no reuso,
// os dois envelopes de erro, o 302 para quem não pede JSON e o 404 da landing page de outra conta.
import { http, HttpResponse } from "msw/http"
import { setupServer } from "msw/node"
import { env } from "@/env"

type User = { id: number; email: string; password: string }
type LoggedRequest = { method: string; path: string; headers: Headers; body: unknown }

// O registro como a API o serializa: todas as colunas da tabela landing_pages.
type LandingPageRecord = {
  id: number
  public_id: number
  name: string
  current_data: unknown
  allowed_hosts: string[]
  user_id: number
  created_at: string
  updated_at: string
}

// O asset como o AssetSerializer da API o devolve.
type AssetRecord = {
  id: number
  user_id: number
  filename: string
  content_type: string
  byte_size: number
  public_url: string
}

type LandingPageParams = { name?: string; current_data?: unknown; allowed_hosts?: string[] }

const WARDEN_401 = { error: "You need to sign in or sign up before continuing." }
const INVALID_REFRESH = { errors: ["Invalid or expired refresh token"] }
const LANDING_PAGE_404 = { error: "Landing page not found" }
const ASSET_404 = { error: "Asset not found" }

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
  let landingPages: LandingPageRecord[] = []
  let landingPageSequence = 0
  let assets: AssetRecord[] = []
  let assetSequence = 0

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
      // Só JSON vira objeto. Um multipart, como o envio de asset, fica como texto.
      body: !text ? undefined : isJson(request) ? JSON.parse(text) : text,
    })
  }

  function isJson(request: Request) {
    return request.headers.get("Content-Type")?.startsWith("application/json") ?? false
  }

  // Com o Accept do navegador, o Rails trata a requisição como navegação e redireciona.
  function wantsJson(request: Request) {
    return request.headers.get("Accept") === "application/json"
  }

  const redirect = () => empty(302, { Location: "/" })

  // As validações do modelo LandingPage, com as mensagens de full_messages do Rails. O contrato
  // do Documento de Conteúdo não é imitado: aqui só o documento nulo é recusado.
  function landingPageErrors(record: LandingPageRecord) {
    const errors: string[] = []
    if (!record.name?.trim()) errors.push("Name can't be blank")
    if (record.current_data == null) errors.push("Current data can't be blank")
    return errors
  }

  // Busca só entre as landing pages do usuário: a de outra conta é 404, como na API.
  function ownLandingPage(request: Request, id: unknown) {
    const user = bearerUser(request)
    if (!user) return { response: json(WARDEN_401, 401) }
    const found = landingPages.find((page) => page.id === Number(id) && page.user_id === user.id)
    if (!found) return { response: json(LANDING_PAGE_404, 404) }
    return { found }
  }

  // O before_validation do modelo: os hosts são gravados em minúsculas.
  function normalizeHosts(hosts: string[] | undefined) {
    return (hosts ?? []).map((host) => String(host).toLowerCase())
  }

  function buildLandingPage(userId: number, params: LandingPageParams): LandingPageRecord {
    landingPageSequence += 1
    const now = new Date().toISOString()
    return {
      id: landingPageSequence,
      public_id: 3400 + landingPageSequence,
      name: params.name ?? "",
      current_data: params.current_data ?? null,
      allowed_hosts: normalizeHosts(params.allowed_hosts),
      user_id: userId,
      created_at: now,
      updated_at: now,
    }
  }

  function buildAsset(userId: number, file: { name: string; type: string; size: number }) {
    assetSequence += 1
    return {
      id: assetSequence,
      user_id: userId,
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      byte_size: file.size,
      public_url: `${env.apiBaseUrl}/rails/active_storage/blobs/redirect/${assetSequence}/${file.name}`,
    }
  }

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

    http.get(url("/manage/landing_pages"), ({ request }) => {
      const user = bearerUser(request)
      if (!user) return json(WARDEN_401, 401)
      return json({ landing_pages: landingPages.filter((page) => page.user_id === user.id) })
    }),

    http.post(url("/manage/landing_pages"), async ({ request }) => {
      const user = bearerUser(request)
      if (!user) return json(WARDEN_401, 401)
      const { landing_page } = (await request.json()) as { landing_page: LandingPageParams }
      const record = buildLandingPage(user.id, landing_page)
      const errors = landingPageErrors(record)
      if (errors.length) return json({ errors }, 422)
      landingPages.push(record)
      return json({ landing_page: record }, 201)
    }),

    http.get(url("/manage/landing_pages/:id"), ({ request, params }) => {
      const { found, response } = ownLandingPage(request, params.id)
      if (!found) return response
      return json({ landing_page: found })
    }),

    // Atualização parcial: só as chaves enviadas mudam.
    http.patch(url("/manage/landing_pages/:id"), async ({ request, params }) => {
      const { found, response } = ownLandingPage(request, params.id)
      if (!found) return response
      const { landing_page } = (await request.json()) as { landing_page: LandingPageParams }
      const updated = { ...found, ...landing_page, updated_at: new Date().toISOString() }
      if (landing_page.allowed_hosts)
        updated.allowed_hosts = normalizeHosts(landing_page.allowed_hosts)
      const errors = landingPageErrors(updated)
      if (errors.length) return json({ errors }, 422)
      landingPages = landingPages.map((page) => (page.id === found.id ? updated : page))
      return json({ landing_page: updated })
    }),

    http.delete(url("/manage/landing_pages/:id"), ({ request, params }) => {
      const { found, response } = ownLandingPage(request, params.id)
      if (!found) return response
      landingPages = landingPages.filter((page) => page.id !== found.id)
      return empty(204)
    }),

    http.get(url("/assets"), ({ request }) => {
      const user = bearerUser(request)
      if (!user) return json(WARDEN_401, 401)
      return json({ assets: assets.filter((asset) => asset.user_id === user.id) })
    }),

    // Envio em multipart, no campo asset[file]. Sem arquivo, o modelo recusa.
    http.post(url("/assets"), async ({ request }) => {
      const user = bearerUser(request)
      if (!user) return json(WARDEN_401, 401)
      const file = (await request.formData()).get("asset[file]")
      // Um campo de arquivo vem como objeto, e um campo de texto, como string. instanceof File
      // não serve: o File do jsdom e o do Node são classes diferentes.
      if (!file || typeof file === "string") {
        return json({ errors: ["File must be attached"] }, 422)
      }
      const record = buildAsset(user.id, file)
      assets.push(record)
      return json({ asset: record }, 201)
    }),

    http.delete(url("/assets/:id"), ({ request, params }) => {
      const user = bearerUser(request)
      if (!user) return json(WARDEN_401, 401)
      const found = assets.find(
        (asset) => asset.id === Number(params.id) && asset.user_id === user.id,
      )
      if (!found) return json(ASSET_404, 404)
      assets = assets.filter((asset) => asset.id !== found.id)
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
      landingPages = []
      landingPageSequence = 0
      assets = []
      assetSequence = 0
    },

    // Cria uma landing page para o usuário, como uma criação anterior.
    createLandingPage(email: string, name: string, currentData: unknown = {}) {
      const user = users.find((existing) => existing.email === email)
      if (!user) throw new Error(`Usuário inexistente: ${email}`)
      const record = buildLandingPage(user.id, { name, current_data: currentData })
      landingPages.push(record)
      return record
    },

    // Cria um asset para o usuário, como um envio anterior.
    createAsset(email: string, filename: string, contentType: string, byteSize: number) {
      const user = users.find((existing) => existing.email === email)
      if (!user) throw new Error(`Usuário inexistente: ${email}`)
      const record = buildAsset(user.id, { name: filename, type: contentType, size: byteSize })
      assets.push(record)
      return record
    },

    // Os assets gravados, de todas as contas.
    assets() {
      return assets
    },

    // As landing pages gravadas, de todas as contas.
    landingPages() {
      return landingPages
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
