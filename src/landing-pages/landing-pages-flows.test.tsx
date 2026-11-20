// Testes de integração das landing pages (#12): o app inteiro contra a API simulada.
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw/http"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { fakeApi, url } from "@/test/fake-api"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const OTHER_EMAIL = "other@example.com"

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

// Abre o app já com sessão, como depois de um login anterior.
function openSignedIn(path = "/") {
  fakeApi.createUser(EMAIL, "senha-secreta")
  localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
  return renderApp(path)
}

async function openDialog(trigger: string, dialogName: string) {
  await userEvent.click(await screen.findByRole("button", { name: trigger }))
  return screen.getByRole("dialog", { name: dialogName })
}

describe("lista de landing pages", () => {
  it("mostra as landing pages do usuário e somente elas", async () => {
    fakeApi.createUser(OTHER_EMAIL, "outra-senha")
    fakeApi.createLandingPage(OTHER_EMAIL, "Página de outra conta")
    openSignedIn()
    fakeApi.createLandingPage(EMAIL, "Lançamento")
    fakeApi.createLandingPage(EMAIL, "Black Friday")

    const list = await screen.findByRole("list", { name: "Landing pages" })

    const names = within(list)
      .getAllByRole("link")
      .map((link) => link.textContent)
    expect(names).toEqual(["Black Friday", "Lançamento"])
    expect(screen.queryByText("Página de outra conta")).not.toBeInTheDocument()
  })

  it("sem landing pages, convida a criar a primeira", async () => {
    openSignedIn()

    expect(await screen.findByText("Você ainda não tem landing pages.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Nova landing page" })).toBeInTheDocument()
  })

  it("erro ao listar mostra a mensagem e tenta de novo", async () => {
    openSignedIn()
    fakeApi.createLandingPage(EMAIL, "Lançamento")
    fakeApi.server.use(
      http.get(url("/manage/landing_pages"), () => HttpResponse.error(), { once: true }),
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sem conexão com a API. Confira sua internet.",
    )
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))

    expect(await screen.findByRole("link", { name: "Lançamento" })).toBeInTheDocument()
  })
})

describe("criar", () => {
  it("envia o nome com o documento vazio e leva à landing page criada", async () => {
    openSignedIn()

    const dialog = await openDialog("Nova landing page", "Nova landing page")
    await userEvent.type(within(dialog).getByLabelText("Nome"), "Lançamento")
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar" }))

    expect(await screen.findByRole("heading", { level: 1, name: "Lançamento" })).toBeInTheDocument()
    const [created] = fakeApi.landingPages()
    expect(window.location.pathname).toBe(`/landing-pages/${created.id}`)
    expect(fakeApi.requests("POST", "/manage/landing_pages")[0].body).toEqual({
      landing_page: { name: "Lançamento", current_data: {} },
    })
  })

  it("nome recusado pela API mostra o erro no dialog, sem criar", async () => {
    openSignedIn()

    const dialog = await openDialog("Nova landing page", "Nova landing page")
    await userEvent.type(within(dialog).getByLabelText("Nome"), "   ")
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar. Confira os dados.",
    )
    expect(dialog).toBeVisible()
    expect(window.location.pathname).toBe("/")
    expect(fakeApi.landingPages()).toEqual([])
  })

  it("cancelar fecha o dialog sem chamar a API", async () => {
    openSignedIn()

    const dialog = await openDialog("Nova landing page", "Nova landing page")
    await userEvent.type(within(dialog).getByLabelText("Nome"), "Lançamento")
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    expect(dialog).not.toBeVisible()
    expect(fakeApi.requests("POST", "/manage/landing_pages")).toHaveLength(0)
  })
})

describe("landing page", () => {
  it("abre pela lista", async () => {
    openSignedIn()
    const page = fakeApi.createLandingPage(EMAIL, "Lançamento")

    await userEvent.click(await screen.findByRole("link", { name: "Lançamento" }))

    expect(await screen.findByRole("heading", { level: 1, name: "Lançamento" })).toBeInTheDocument()
    expect(window.location.pathname).toBe(`/landing-pages/${page.id}`)
    expect(fakeApi.requests("GET", `/manage/landing_pages/${page.id}`)).toHaveLength(1)
  })

  it("a de outra conta aparece como não encontrada", async () => {
    fakeApi.createUser(OTHER_EMAIL, "outra-senha")
    const other = fakeApi.createLandingPage(OTHER_EMAIL, "Página de outra conta")
    openSignedIn(`/landing-pages/${other.id}`)

    expect(await screen.findByRole("alert")).toHaveTextContent("Landing page não encontrada")
    expect(screen.queryByText("Página de outra conta")).not.toBeInTheDocument()
  })
})

describe("renomear", () => {
  it("envia só o nome, reflete na página e na lista sem recarregar", async () => {
    const { session } = openSignedIn()
    const page = fakeApi.createLandingPage(EMAIL, "Lançamento", {
      hero: { title: { value: "Olá", type: "string" } },
    })
    await userEvent.click(await screen.findByRole("link", { name: "Lançamento" }))

    const dialog = await openDialog("Renomear", "Renomear landing page")
    const input = within(dialog).getByLabelText("Nome")
    expect(input).toHaveValue("Lançamento")
    await userEvent.clear(input)
    await userEvent.type(input, "Lançamento de verão")
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }))

    expect(
      await screen.findByRole("heading", { level: 1, name: "Lançamento de verão" }),
    ).toBeInTheDocument()
    expect(dialog).not.toBeVisible()
    expect(fakeApi.requests("PATCH", `/manage/landing_pages/${page.id}`)[0].body).toEqual({
      landing_page: { name: "Lançamento de verão" },
    })
    expect(fakeApi.landingPages()[0].current_data).toEqual({
      hero: { title: { value: "Olá", type: "string" } },
    })

    await userEvent.click(screen.getByRole("link", { name: "Voltar" }))

    expect(await screen.findByRole("link", { name: "Lançamento de verão" })).toBeInTheDocument()
    // A mesma sessão em memória: a navegação não recarregou a página.
    expect(session.getState().status).toBe("signed-in")
    expect(fakeApi.requests("POST", "/auth/refresh")).toHaveLength(1)
  })

  it("nome recusado pela API mostra o erro e mantém o nome antigo", async () => {
    openSignedIn()
    const page = fakeApi.createLandingPage(EMAIL, "Lançamento")
    await userEvent.click(await screen.findByRole("link", { name: "Lançamento" }))

    const dialog = await openDialog("Renomear", "Renomear landing page")
    await userEvent.clear(within(dialog).getByLabelText("Nome"))
    await userEvent.type(within(dialog).getByLabelText("Nome"), "   ")
    await userEvent.click(within(dialog).getByRole("button", { name: "Salvar" }))

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar. Confira os dados.",
    )
    expect(screen.getByRole("heading", { level: 1, name: "Lançamento" })).toBeInTheDocument()
    expect(fakeApi.landingPages().find(({ id }) => id === page.id)?.name).toBe("Lançamento")
  })
})

describe("apagar", () => {
  it("pede confirmação, apaga e volta à lista sem a landing page", async () => {
    openSignedIn()
    const page = fakeApi.createLandingPage(EMAIL, "Lançamento")
    fakeApi.createLandingPage(EMAIL, "Black Friday")
    await userEvent.click(await screen.findByRole("link", { name: "Lançamento" }))

    const dialog = await openDialog("Apagar", "Apagar landing page")
    expect(dialog).toHaveTextContent("Lançamento")
    expect(fakeApi.requests("DELETE", `/manage/landing_pages/${page.id}`)).toHaveLength(0)
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar" }))

    expect(await screen.findByRole("link", { name: "Black Friday" })).toBeInTheDocument()
    expect(window.location.pathname).toBe("/")
    expect(screen.queryByRole("link", { name: "Lançamento" })).not.toBeInTheDocument()
    expect(fakeApi.requests("DELETE", `/manage/landing_pages/${page.id}`)).toHaveLength(1)
  })

  it("cancelar não apaga", async () => {
    openSignedIn()
    fakeApi.createLandingPage(EMAIL, "Lançamento")
    await userEvent.click(await screen.findByRole("link", { name: "Lançamento" }))

    const dialog = await openDialog("Apagar", "Apagar landing page")
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }))

    expect(dialog).not.toBeVisible()
    expect(fakeApi.landingPages()).toHaveLength(1)
    expect(fakeApi.allRequests().some(({ method }) => method === "DELETE")).toBe(false)
  })
})
