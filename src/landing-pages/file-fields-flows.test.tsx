// Testes de integração dos campos de arquivo (#17): escolher um asset para um campo hosted_file,
// enviar de dentro do seletor, limpar, e a URL externa de um external_file. O app inteiro contra
// a API simulada.
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { fakeApi } from "@/test/fake-api"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const field = (value: unknown, type: string) => ({ value, type })

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

function signedIn() {
  fakeApi.createUser(EMAIL, "senha-secreta")
  localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
}

async function openForm(document: unknown) {
  const page = fakeApi.createLandingPage(EMAIL, "Lançamento", document)
  renderApp(`/landing-pages/${page.id}?modo=formulario`)
  await screen.findByRole("link", { name: "Formulário" })
  return page
}

function fileField(name: string) {
  return screen.getByRole("group", { name })
}

async function savedDocument(id: number) {
  await userEvent.click(screen.getByRole("button", { name: /^Salvar/ }))
  await vi.waitFor(() =>
    expect(fakeApi.requests("PATCH", `/manage/landing_pages/${id}`)).toHaveLength(1),
  )
  return fakeApi.landingPages().find((page) => page.id === id)!.current_data as {
    hero: Record<string, { value: unknown; type: string }>
  }
}

describe("campo hosted_file", () => {
  it("escolher um arquivo grava a public_url no value e mostra a prévia", async () => {
    signedIn()
    fakeApi.createAsset(EMAIL, "antiga.png", "image/png", 10)
    const hero = fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    const page = await openForm({ hero: { image: field("", "hosted_file") } })

    await userEvent.click(
      within(fileField("image")).getByRole("button", { name: "Escolher arquivo para image" }),
    )
    const dialog = screen.getByRole("dialog", { name: "Escolher arquivo" })
    await userEvent.click(await within(dialog).findByRole("button", { name: /hero\.webp/ }))

    expect(dialog).not.toBeVisible()
    expect(
      within(fileField("image")).getByRole("img", { name: "Prévia de image" }),
    ).toHaveAttribute("src", hero.public_url)
    expect(within(fileField("image")).getByText("hero.webp")).toBeInTheDocument()
    expect((await savedDocument(page.id)).hero.image).toEqual(field(hero.public_url, "hosted_file"))
  })

  it("o seletor busca a lista uma vez por edição", async () => {
    signedIn()
    fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    await openForm({
      hero: { image: field("", "hosted_file"), logo: field("", "hosted_file") },
    })

    for (const name of ["image", "logo", "image"]) {
      await userEvent.click(
        within(fileField(name)).getByRole("button", { name: `Escolher arquivo para ${name}` }),
      )
      const dialog = screen.getByRole("dialog", { name: "Escolher arquivo" })
      await within(dialog).findByRole("button", { name: /hero\.webp/ })
      await userEvent.click(within(dialog).getByRole("button", { name: "Fechar" }))
    }

    expect(fakeApi.requests("GET", "/assets")).toHaveLength(1)
  })

  it("enviar de dentro do seletor deixa o arquivo pronto para escolher", async () => {
    signedIn()
    const page = await openForm({ hero: { image: field("", "hosted_file") } })

    await userEvent.click(
      within(fileField("image")).getByRole("button", { name: "Escolher arquivo para image" }),
    )
    const dialog = screen.getByRole("dialog", { name: "Escolher arquivo" })
    expect(await within(dialog).findByText(/Você ainda não enviou arquivos/)).toBeInTheDocument()
    await userEvent.upload(
      within(dialog).getByLabelText("Arquivo para enviar"),
      new File(["x"], "novo.png", { type: "image/png" }),
    )
    await userEvent.click(await within(dialog).findByRole("button", { name: /novo\.png/ }))

    const [created] = fakeApi.assets()
    expect((await savedDocument(page.id)).hero.image).toEqual(
      field(created.public_url, "hosted_file"),
    )
  })

  it("limpar esvazia o value", async () => {
    signedIn()
    const hero = fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    const page = await openForm({ hero: { image: field(hero.public_url, "hosted_file") } })

    expect(within(fileField("image")).getByRole("img", { name: "Prévia de image" })).toBeVisible()
    await userEvent.click(within(fileField("image")).getByRole("button", { name: "Limpar image" }))

    expect(within(fileField("image")).getByText("Nenhum arquivo escolhido.")).toBeInTheDocument()
    expect((await savedDocument(page.id)).hero.image).toEqual(field("", "hosted_file"))
  })

  it("arquivo que não é imagem aparece pelo nome, sem prévia", async () => {
    signedIn()
    const menu = fakeApi.createAsset(EMAIL, "menu.pdf", "application/pdf", 2048)
    await openForm({ hero: { menu: field(menu.public_url, "hosted_file") } })

    expect(within(fileField("menu")).getByText("menu.pdf")).toBeInTheDocument()
    expect(within(fileField("menu")).queryByRole("img")).not.toBeInTheDocument()
  })
})

describe("campo external_file", () => {
  it("aceita URL externa, com prévia quando é imagem", async () => {
    signedIn()
    const page = await openForm({ hero: { banner: field("", "external_file") } })
    const input = within(fileField("banner")).getByLabelText("banner")

    await userEvent.type(input, "https://cdn.exemplo.com/banner.png")

    expect(
      within(fileField("banner")).getByRole("img", { name: "Prévia de banner" }),
    ).toHaveAttribute("src", "https://cdn.exemplo.com/banner.png")
    expect((await savedDocument(page.id)).hero.banner).toEqual(
      field("https://cdn.exemplo.com/banner.png", "external_file"),
    )
  })
})
