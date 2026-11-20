// Testes de integração da estrutura pelo Modo Formulário (ADR 0009): criar seção, campo e item,
// renomear, remover e mudar o type. O app inteiro contra a API simulada.
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { fakeApi } from "@/test/fake-api"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const field = (value: unknown, type: string) => ({ value, type })
const DOCUMENT = {
  hero: { title: field("Olá", "string"), price: field(10, "number") },
  features: [{ label: field("Rápido", "string") }],
}

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

async function openForm(document: unknown = DOCUMENT) {
  fakeApi.createUser(EMAIL, "senha-secreta")
  localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
  const page = fakeApi.createLandingPage(EMAIL, "Lançamento", document)
  renderApp(`/landing-pages/${page.id}?modo=formulario`)
  await screen.findByRole("link", { name: "Formulário" })
  return page
}

function section(name: string, scope: HTMLElement = document.body) {
  return within(scope).getByText(name, { selector: "summary" }).closest("details")!
}

async function saved(id: number) {
  await userEvent.click(screen.getByRole("button", { name: /^Salvar/ }))
  await vi.waitFor(() =>
    expect(fakeApi.requests("PATCH", `/manage/landing_pages/${id}`)).toHaveLength(1),
  )
  return fakeApi.landingPages()[0].current_data as Record<string, unknown>
}

async function submitDialog(
  name: string,
  values: { nome?: string; tipo?: string },
  submit: string,
) {
  const dialog = screen.getByRole("dialog", { name })
  if (values.nome !== undefined) {
    await userEvent.clear(within(dialog).getByLabelText("Nome"))
    if (values.nome) await userEvent.type(within(dialog).getByLabelText("Nome"), values.nome)
  }
  if (values.tipo) {
    await userEvent.selectOptions(within(dialog).getByLabelText("Tipo"), values.tipo)
  }
  await userEvent.click(within(dialog).getByRole("button", { name: submit }))
  return dialog
}

describe("estrutura pelo Formulário", () => {
  it("cria seção e campo, e grava", async () => {
    const page = await openForm()

    await userEvent.click(screen.getByRole("button", { name: "Adicionar seção" }))
    await submitDialog("Adicionar seção", { nome: "footer" }, "Adicionar")
    const footer = section("footer")
    await userEvent.click(within(footer).getByRole("button", { name: "Adicionar campo em footer" }))
    await submitDialog("Adicionar campo", { nome: "copy", tipo: "text" }, "Adicionar")
    await userEvent.type(within(section("footer")).getByLabelText("copy"), "© 2026")

    expect(await saved(page.id)).toEqual({
      ...DOCUMENT,
      footer: { copy: field("© 2026", "text") },
    })
  })

  it("chave repetida avisa no dialog e não cria", async () => {
    await openForm()

    await userEvent.click(
      within(section("hero")).getByRole("button", { name: "Adicionar campo em hero" }),
    )
    const dialog = await submitDialog("Adicionar campo", { nome: "title" }, "Adicionar")

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Já existe title aqui.")
    expect(dialog).toBeVisible()
    expect(screen.queryByText("Alterações não salvas")).not.toBeInTheDocument()
  })

  it("mudar o type zera o value", async () => {
    const page = await openForm()

    await userEvent.selectOptions(within(section("hero")).getByLabelText("Tipo de price"), "string")

    expect(within(section("hero")).getByLabelText("price")).toHaveValue("")
    expect((await saved(page.id)).hero).toEqual({
      title: DOCUMENT.hero.title,
      price: field("", "string"),
    })
  })

  it("renomeia a chave mantendo a posição", async () => {
    const page = await openForm()

    await userEvent.click(within(section("hero")).getByRole("button", { name: "Renomear title" }))
    const dialog = screen.getByRole("dialog", { name: "Renomear title" })
    expect(dialog).toHaveTextContent("deixa de encontrar")
    await submitDialog("Renomear title", { nome: "heading" }, "Renomear")

    const hero = (await saved(page.id)).hero as Record<string, unknown>
    expect(Object.keys(hero)).toEqual(["heading", "price"])
    expect(hero.heading).toEqual(DOCUMENT.hero.title)
  })

  it("remove com confirmação", async () => {
    const page = await openForm()

    await userEvent.click(within(section("hero")).getByRole("button", { name: "Remover price" }))
    await submitDialog("Remover price", {}, "Remover")

    expect(within(section("hero")).queryByLabelText("price")).not.toBeInTheDocument()
    expect((await saved(page.id)).hero).toEqual({ title: DOCUMENT.hero.title })
  })

  it("remove uma seção inteira", async () => {
    const page = await openForm()

    await userEvent.click(within(section("hero")).getByRole("button", { name: "Remover hero" }))
    await submitDialog("Remover hero", {}, "Remover")

    expect(await saved(page.id)).toEqual({ features: DOCUMENT.features })
  })

  it("adiciona item copiando a estrutura do primeiro, com values vazios", async () => {
    const page = await openForm()

    await userEvent.click(
      within(section("features")).getByRole("button", { name: "Adicionar item em features" }),
    )

    expect(section("Item 2", section("features"))).toBeInTheDocument()
    expect((await saved(page.id)).features).toEqual([
      ...DOCUMENT.features,
      { label: field("", "string") },
    ])
  })

  it("documento vazio: o formulário cria a primeira seção", async () => {
    const page = await openForm({})

    expect(screen.getByText(/O documento está vazio/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Adicionar campo" }))
    await submitDialog("Adicionar campo", { nome: "title", tipo: "string" }, "Adicionar")

    expect(await saved(page.id)).toEqual({ title: field("", "string") })
  })
})
