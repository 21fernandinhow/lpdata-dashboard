// Testes da sessão no nível do cliente de API, contra a API simulada: renovações simultâneas,
// dentro da aba e entre abas.
import { fakeApi } from "@/test/fake-api"
import { createSession, REFRESH_TOKEN_KEY } from "@/session/session"

const EMAIL = "owner@example.com"

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

// Uma aba aberta com sessão salva, depois da renovação de abertura.
async function openTab() {
  const session = createSession()
  session.start()
  await vi.waitFor(() => expect(session.getState().status).toBe("signed-in"))
  return session
}

describe("renovação", () => {
  beforeEach(() => {
    fakeApi.createUser(EMAIL, "senha-secreta")
    localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
  })

  it("duas requisições com 401 ao mesmo tempo fazem uma renovação só", async () => {
    const session = await openTab()
    fakeApi.expireAccessTokens()

    const responses = await Promise.all([session.api.get("/auth/me"), session.api.get("/auth/me")])

    expect(responses.map((response) => response.data.user.email)).toEqual([EMAIL, EMAIL])
    // Uma renovação na abertura e uma só para as duas requisições.
    expect(fakeApi.requests("POST", "/auth/refresh")).toHaveLength(2)
  })

  it("duas abas que renovam ao mesmo tempo continuam com sessão", async () => {
    const first = await openTab()
    const second = await openTab()
    fakeApi.expireAccessTokens()

    await Promise.all([first.api.get("/auth/me"), second.api.get("/auth/me")])

    expect(first.getState().status).toBe("signed-in")
    expect(second.getState().status).toBe("signed-in")
    // Cada aba renovou com o refresh token que a outra tinha acabado de girar.
    const used = fakeApi.requests("POST", "/auth/refresh").map((request) => request.body)
    expect(new Set(used.map((body) => JSON.stringify(body))).size).toBe(used.length)
  })

  it("toda requisição pede JSON", async () => {
    const session = await openTab()
    await session.api.get("/auth/me")

    for (const request of fakeApi.allRequests()) {
      expect(request.headers.get("Accept")).toBe("application/json")
    }
  })

  it("um 401 depois da renovação encerra a sessão, sem nova renovação", async () => {
    const session = await openTab()
    fakeApi.expireAccessTokens()
    // A renovação funciona, mas o access token novo também é recusado.
    fakeApi.expireNextAccessToken()

    await expect(session.api.get("/auth/me")).rejects.toThrow()

    expect(session.getState()).toMatchObject({
      status: "signed-out",
      notice: "Sua sessão expirou. Entre de novo.",
    })
    expect(fakeApi.requests("POST", "/auth/refresh")).toHaveLength(2)
    expect(fakeApi.requests("GET", "/auth/me")).toHaveLength(2)
  })
})

describe("sair durante uma renovação", () => {
  beforeEach(() => {
    fakeApi.createUser(EMAIL, "senha-secreta")
    localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
  })

  it("na mesma aba, a renovação não devolve a sessão e o token novo é revogado", async () => {
    const session = await openTab()
    fakeApi.expireAccessTokens()
    const release = fakeApi.holdRefreshes()
    const request = session.api.get("/auth/me")
    await vi.waitFor(() => expect(fakeApi.requests("POST", "/auth/refresh")).toHaveLength(2))

    session.signOut()
    release()

    await expect(request).rejects.toThrow()
    expect(session.getState().status).toBe("signed-out")
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    await vi.waitFor(() => expect(fakeApi.validRefreshTokens()).toEqual([]))
  })

  it("com outra aba renovando, o token que ela girou também sai", async () => {
    const leaving = await openTab()
    const other = await openTab()
    fakeApi.expireAccessTokens()
    const release = fakeApi.holdRefreshes()
    const request = other.api.get("/auth/me")
    await vi.waitFor(() => expect(fakeApi.requests("POST", "/auth/refresh")).toHaveLength(3))

    leaving.signOut()
    release()
    await request

    await vi.waitFor(() => expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull())
    await vi.waitFor(() => expect(fakeApi.validRefreshTokens()).toEqual([]))
  })
})
