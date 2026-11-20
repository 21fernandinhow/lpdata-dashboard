// Testes de integração do ciclo de vida da sessão (#11): o app inteiro contra a API simulada.
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw/http"
import { fakeApi, url } from "@/test/fake-api"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const PASSWORD = "senha-secreta"

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

// A rota protegida inicial é a lista de landing pages.
function findLandingPages() {
  return screen.findByRole("heading", { level: 2, name: "Landing pages" })
}

async function signIn(email: string, password: string) {
  await userEvent.type(await screen.findByLabelText("Email"), email)
  await userEvent.type(screen.getByLabelText("Senha"), password)
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }))
}

describe("sessão", () => {
  it("login certo leva à rota pedida e carrega as landing pages", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    renderApp("/?origem=link")

    await signIn(EMAIL, PASSWORD)

    expect(await findLandingPages()).toBeInTheDocument()
    expect(window.location.pathname + window.location.search).toBe("/?origem=link")
    expect(fakeApi.requests("GET", "/manage/landing_pages")).toHaveLength(1)
  })

  it("login errado mostra email ou senha incorretos", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    renderApp("/login")

    await signIn(EMAIL, "senha-errada")

    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou senha incorretos.")
    expect(window.location.pathname).toBe("/login")
  })

  it("cadastro certo leva ao login com o aviso e o formulário vazio", async () => {
    renderApp("/signup")

    await userEvent.type(await screen.findByLabelText("Email"), EMAIL)
    await userEvent.type(screen.getByLabelText("Senha"), PASSWORD)
    await userEvent.type(screen.getByLabelText("Confirme a senha"), PASSWORD)
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(await screen.findByText("Conta criada.")).toBeInTheDocument()
    expect(window.location.pathname).toBe("/login")
    expect(screen.getByLabelText("Email")).toHaveValue("")
    expect(screen.getByLabelText("Senha")).toHaveValue("")
    expect(fakeApi.requests("POST", "/auth/sign_up")[0].body).toEqual({
      user: { email: EMAIL, password: PASSWORD, password_confirmation: PASSWORD },
    })
    // O cadastro não abre sessão: o usuário entra pelo login, e a sessão da API é encerrada.
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
    await waitFor(() => expect(fakeApi.validRefreshTokens()).toEqual([]))
  })

  it("cadastro recusado mostra a mensagem do cadastro", async () => {
    renderApp("/signup")

    await userEvent.type(await screen.findByLabelText("Email"), EMAIL)
    await userEvent.type(screen.getByLabelText("Senha"), PASSWORD)
    await userEvent.type(screen.getByLabelText("Confirme a senha"), "outra-senha")
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível criar a conta. Confira o email e a senha.",
    )
  })

  it("um 401 renova a sessão e repete a requisição sem o usuário perceber", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
    // O access token da abertura do app vence antes da lista de landing pages.
    fakeApi.expireNextAccessToken()
    renderApp("/")

    expect(await findLandingPages()).toBeInTheDocument()
    expect(fakeApi.requests("POST", "/auth/refresh")).toHaveLength(2)
    expect(fakeApi.requests("GET", "/manage/landing_pages")).toHaveLength(2)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("renovação recusada leva ao login com sessão expirada, sem laço", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    // O login funciona, mas o access token emitido já vence, e a renovação é recusada.
    fakeApi.expireNextAccessToken()
    fakeApi.refuseRefreshes()
    renderApp("/")

    await signIn(EMAIL, PASSWORD)

    expect(await screen.findByText("Sua sessão expirou. Entre de novo.")).toBeInTheDocument()
    expect(window.location.pathname).toBe("/login")
    expect(fakeApi.requests("POST", "/auth/refresh")).toHaveLength(1)
    expect(fakeApi.requests("GET", "/manage/landing_pages")).toHaveLength(1)
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
  })

  it("recarregar a página mantém a sessão", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    const first = renderApp("/login")
    await signIn(EMAIL, PASSWORD)
    await findLandingPages()
    first.unmount()

    renderApp("/")

    expect(await findLandingPages()).toBeInTheDocument()
    expect(screen.queryByLabelText("Senha")).not.toBeInTheDocument()
    // Só o refresh token fica salvo. O access token vive só em memória.
    const stored = Object.values({ ...localStorage })
    expect(stored.some((value) => String(value).startsWith("access-"))).toBe(false)
  })

  it("sem refresh token salvo, o app vai ao login sem chamar a API", async () => {
    renderApp("/")

    expect(await screen.findByLabelText("Senha")).toBeInTheDocument()
    expect(fakeApi.allRequests()).toHaveLength(0)
  })

  it("sair leva ao login mesmo quando a API falha", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
    fakeApi.server.use(http.delete(url("/auth/sign_out"), () => HttpResponse.error()))
    renderApp("/")
    await findLandingPages()

    await userEvent.click(screen.getByRole("button", { name: "Sair" }))

    expect(await screen.findByLabelText("Senha")).toBeInTheDocument()
    expect(window.location.pathname).toBe("/login")
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull()
  })

  it("sair manda o refresh token no corpo e o access token no cabeçalho", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    // O login anterior emite o par 1. A abertura do app renova e recebe o par 2.
    localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
    renderApp("/")
    await findLandingPages()

    await userEvent.click(screen.getByRole("button", { name: "Sair" }))

    await waitFor(() => expect(fakeApi.requests("DELETE", "/auth/sign_out")).toHaveLength(1))
    const [signOut] = fakeApi.requests("DELETE", "/auth/sign_out")
    expect(signOut.body).toEqual({ refresh_token: "refresh-2" })
    expect(signOut.headers.get("Authorization")).toBe("Bearer access-2")
  })

  it("sair numa aba leva as outras ao login", async () => {
    fakeApi.createUser(EMAIL, PASSWORD)
    localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
    renderApp("/")
    await findLandingPages()

    // A outra aba apaga o refresh token, e esta recebe o evento storage.
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: REFRESH_TOKEN_KEY,
        newValue: null,
        storageArea: localStorage,
      }),
    )

    expect(await screen.findByLabelText("Senha")).toBeInTheDocument()
    expect(window.location.pathname).toBe("/login")
  })
})
