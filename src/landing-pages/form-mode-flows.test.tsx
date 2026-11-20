// Testes de integração do Modo Formulário (#15): editar os valores do Documento de Conteúdo por
// tipo, sem ver JSON e sem mudar a estrutura. O app inteiro contra a API simulada.
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw/http"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { fakeApi, url } from "@/test/fake-api"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const DOCUMENT = {
  hero: {
    title: { value: "Olá", type: "string" },
    subtitle: { value: "Linha 1", type: "text" },
    price: { value: 10, type: "number" },
    visible: { value: true, type: "boolean" },
    link: { value: "https://a.io", type: "url" },
    image: { value: "https://cdn.io/a.webp", type: "hosted_file" },
    video: { value: "https://videos.io/x", type: "external_file" },
  },
  features: [{ label: { value: "Rápido", type: "string" } }],
}

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

async function openForm(document: unknown = DOCUMENT, search = "") {
  fakeApi.createUser(EMAIL, "senha-secreta")
  localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
  const page = fakeApi.createLandingPage(EMAIL, "Lançamento", document)
  renderApp(`/landing-pages/${page.id}${search}`)
  await screen.findByRole("link", { name: "Formulário" })
  return page
}

// A seção de uma chave do documento: details com a chave no summary.
function section(name: string, scope: HTMLElement = document.body) {
  const summary = within(scope).getByText(name, { selector: "summary" })
  return summary.closest("details")!
}

function saveButton() {
  return screen.getByRole("button", { name: /^Salvar/ })
}

function patches(id: number) {
  return fakeApi.requests("PATCH", `/manage/landing_pages/${id}`)
}

async function replace(input: HTMLElement, text: string) {
  await userEvent.clear(input)
  await userEvent.type(input, text)
}

describe("Modo Formulário", () => {
  it("abre no Formulário, com só o primeiro nível aberto", async () => {
    await openForm()

    expect(screen.getByRole("link", { name: "Formulário" })).toHaveAttribute("aria-current", "page")
    expect(screen.queryByLabelText("Documento de Conteúdo")).not.toBeInTheDocument()
    expect(section("hero")).toHaveAttribute("open")
    expect(section("features")).toHaveAttribute("open")
    expect(section("Item 1", section("features"))).not.toHaveAttribute("open")
  })

  it("documento vazio também abre no Formulário, com os botões de criar", async () => {
    await openForm({})

    expect(screen.getByRole("link", { name: "Formulário" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByText(/O documento está vazio/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar campo" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar seção" })).toBeInTheDocument()
  })

  it("abaixo do formulário, um link leva à seção do formulário na documentação", async () => {
    await openForm()

    const docs = screen.getByRole("link", { name: "Como editar pelo formulário" })

    expect(docs).toHaveAttribute("href", "https://lpdata.io/dashboard#formulário")
    expect(docs).toHaveAttribute("target", "_blank")
  })

  it("altera um valor de cada um dos sete tipos e grava, sem mudar a estrutura", async () => {
    const page = await openForm()
    const asset = fakeApi.createAsset(EMAIL, "b.webp", "image/webp", 1024)
    const hero = section("hero")

    await replace(within(hero).getByLabelText("title"), "Olá de novo")
    await replace(within(hero).getByLabelText("subtitle"), "Linha 1{Enter}Linha 2")
    await replace(within(hero).getByLabelText("price"), "12.5")
    await userEvent.click(within(hero).getByLabelText("visible"))
    await replace(within(hero).getByLabelText("link"), "https://b.io")
    // O hosted_file se escolhe pelo seletor de assets (#17).
    await userEvent.click(within(hero).getByRole("button", { name: "Escolher arquivo para image" }))
    const picker = screen.getByRole("dialog", { name: "Escolher arquivo" })
    await userEvent.click(await within(picker).findByRole("button", { name: /b\.webp/ }))
    await replace(within(hero).getByRole("textbox", { name: "video" }), "https://videos.io/y")
    const item = section("Item 1", section("features"))
    await userEvent.click(within(item).getByText("Item 1"))
    await replace(within(item).getByLabelText("label"), "Muito rápido")

    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument()
    await userEvent.click(saveButton())

    await vi.waitFor(() => expect(patches(page.id)).toHaveLength(1))
    const saved = {
      hero: {
        title: { value: "Olá de novo", type: "string" },
        subtitle: { value: "Linha 1\nLinha 2", type: "text" },
        price: { value: 12.5, type: "number" },
        visible: { value: false, type: "boolean" },
        link: { value: "https://b.io", type: "url" },
        image: { value: asset.public_url, type: "hosted_file" },
        video: { value: "https://videos.io/y", type: "external_file" },
      },
      features: [{ label: { value: "Muito rápido", type: "string" } }],
    }
    expect(patches(page.id)[0].body).toEqual({ landing_page: { current_data: saved } })
    expect(fakeApi.landingPages()[0].current_data).toEqual(saved)
  })

  it("número inválido avisa no campo e não muda o documento", async () => {
    await openForm()
    const price = within(section("hero")).getByLabelText("price")

    await userEvent.clear(price)

    expect(price).toHaveAccessibleDescription("Número inválido.")
    expect(saveButton()).toBeDisabled()
  })

  it("alternar de modo não perde a alteração pendente", async () => {
    await openForm()

    await replace(within(section("hero")).getByLabelText("title"), "Do formulário")
    await userEvent.click(screen.getByRole("link", { name: "JSON" }))

    const editor = await screen.findByLabelText<HTMLTextAreaElement>("Documento de Conteúdo")
    expect(window.location.search).toBe("?modo=json")
    expect(JSON.parse(editor.value).hero.title.value).toBe("Do formulário")
    // Só o valor mudou no texto: a formatação do resto continua a mesma.
    expect(editor.value).toBe(JSON.stringify(DOCUMENT, null, 2).replace('"Olá"', '"Do formulário"'))

    const changed = editor.value.replace('"Do formulário"', '"Do Raw"')
    await userEvent.clear(editor)
    await userEvent.click(editor)
    await userEvent.paste(changed)
    await userEvent.click(screen.getByRole("link", { name: "Formulário" }))

    expect(await within(section("hero")).findByLabelText("title")).toHaveValue("Do Raw")
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument()
  })

  it("JSON inválido no Raw bloqueia o Formulário e mostra o erro", async () => {
    await openForm(DOCUMENT, "?modo=json")
    const editor = await screen.findByLabelText("Documento de Conteúdo")

    await userEvent.clear(editor)
    await userEvent.click(editor)
    await userEvent.paste('{\n  "hero": \n}')
    await userEvent.click(screen.getByRole("link", { name: "Formulário" }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("JSON inválido na linha 3, coluna 1: Esperava um valor.")
    expect(screen.queryByText("hero", { selector: "summary" })).not.toBeInTheDocument()

    await userEvent.click(within(alert).getByRole("link", { name: "Corrigir no JSON" }))

    expect(await screen.findByLabelText("Documento de Conteúdo")).toBeInTheDocument()
  })

  it("valor fora de um Campo Editável aparece só para leitura, com aviso", async () => {
    await openForm({ hero: { title: { value: "Olá", type: "string" }, solto: 3 } })

    const hero = section("hero")
    expect(within(hero).getByText("solto")).toBeInTheDocument()
    expect(within(hero).getByText(/Edite no JSON/)).toBeInTheDocument()
    expect(within(hero).getAllByRole("textbox")).toHaveLength(1)
  })

  it("erro de contrato da API aparece no campo, e o erro leva a ele", async () => {
    await openForm()
    fakeApi.server.use(
      http.patch(url("/manage/landing_pages/:id"), () =>
        HttpResponse.json(
          { errors: ["Current data editable field value does not match its type at $.hero.price"] },
          { status: 422, headers: { "Access-Control-Allow-Origin": window.location.origin } },
        ),
      ),
    )
    const price = within(section("hero")).getByLabelText("price")

    await replace(price, "11")
    await userEvent.click(saveButton())

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("$.hero.price")
    expect(price).toHaveAccessibleDescription("O value não corresponde ao type do campo.")
    expect(price).toHaveAttribute("aria-invalid", "true")

    await userEvent.click(within(alert).getByRole("button", { name: /\$\.hero\.price/ }))

    expect(price).toHaveFocus()
  })
})
