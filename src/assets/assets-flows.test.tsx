// Testes de integração dos assets (#16): enviar, listar e apagar arquivos. O app inteiro contra a
// API simulada.
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw/http"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { fakeApi, url } from "@/test/fake-api"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const OTHER_EMAIL = "other@example.com"
const CORS = { "Access-Control-Allow-Origin": window.location.origin }

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

async function openAssets(path = "/assets") {
  renderApp(path)
  await screen.findByRole("heading", { level: 1, name: "Assets" })
}

function assetsList() {
  return screen.getByRole("list", { name: "Assets" })
}

function fileInput() {
  return screen.getByLabelText<HTMLInputElement>("Arquivo para enviar")
}

describe("navegação", () => {
  it("o cabeçalho leva às landing pages e aos assets", async () => {
    signedIn()
    renderApp("/")
    const nav = await screen.findByRole("navigation", { name: "Principal" })

    expect(within(nav).getByRole("link", { name: "Landing pages" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await userEvent.click(within(nav).getByRole("link", { name: "Assets" }))

    expect(await screen.findByRole("heading", { level: 1, name: "Assets" })).toBeVisible()
    expect(within(nav).getByRole("link", { name: "Assets" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })
})

describe("lista de assets", () => {
  it("mostra só os assets do usuário, com nome, tipo e tamanho", async () => {
    fakeApi.createUser(OTHER_EMAIL, "outra-senha")
    fakeApi.createAsset(OTHER_EMAIL, "de-outra-conta.png", "image/png", 10)
    signedIn()
    fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    fakeApi.createAsset(EMAIL, "menu.pdf", "application/pdf", 1572864)
    await openAssets()

    const items = within(assetsList()).getAllByRole("listitem")
    // Os mais novos primeiro.
    expect(items[0]).toHaveTextContent("menu.pdf")
    expect(items[0]).toHaveTextContent("PDF")
    expect(items[0]).toHaveTextContent("1,5 MB")
    expect(items[1]).toHaveTextContent("hero.webp")
    expect(items[1]).toHaveTextContent("WEBP")
    expect(items[1]).toHaveTextContent("18 KB")
    expect(within(items[1]).getByRole("img", { name: "hero.webp" })).toHaveAttribute(
      "src",
      fakeApi.assets().find(({ filename }) => filename === "hero.webp")!.public_url,
    )
    expect(screen.queryByText("de-outra-conta.png")).not.toBeInTheDocument()
  })

  it("alterna entre grade e lista, com a visão no endereço", async () => {
    signedIn()
    fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    await openAssets()

    expect(screen.getByRole("link", { name: "Grade" })).toHaveAttribute("aria-current", "page")
    await userEvent.click(screen.getByRole("link", { name: "Lista" }))

    expect(window.location.search).toBe("?visao=lista")
    expect(screen.getByRole("link", { name: "Lista" })).toHaveAttribute("aria-current", "page")
    expect(within(assetsList()).getByText("hero.webp")).toBeInTheDocument()
  })

  it("sem assets, convida a enviar o primeiro", async () => {
    signedIn()
    await openAssets()

    expect(screen.getByText("Você ainda não enviou arquivos.")).toBeInTheDocument()
  })

  it("erro ao listar mostra a mensagem e tenta de novo", async () => {
    signedIn()
    fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    fakeApi.server.use(http.get(url("/assets"), () => HttpResponse.error(), { once: true }))
    renderApp("/assets")

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Sem conexão com a API. Confira sua internet.",
    )
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }))

    expect(await screen.findByText("hero.webp")).toBeInTheDocument()
  })

  it("SVG avisa que não aparece como imagem na landing page", async () => {
    signedIn()
    fakeApi.createAsset(EMAIL, "logo.svg", "image/svg+xml", 2048)
    await openAssets()

    const item = within(assetsList()).getByRole("listitem")
    expect(within(item).queryByRole("img", { name: "logo.svg" })).not.toBeInTheDocument()
    expect(item).toHaveTextContent("SVG não aparece como imagem na landing page.")
  })
})

describe("enviar", () => {
  it("envia o arquivo em multipart e ele aparece na lista com a URL pública", async () => {
    signedIn()
    await openAssets()

    await userEvent.upload(fileInput(), new File(["conteúdo"], "hero.webp", { type: "image/webp" }))

    const list = await screen.findByRole("list", { name: "Assets" })
    expect(within(list).getByText("hero.webp")).toBeInTheDocument()
    const [created] = fakeApi.assets()
    expect(created).toMatchObject({ filename: "hero.webp", content_type: "image/webp" })
    expect(fakeApi.requests("POST", "/assets")[0].headers.get("Content-Type")).toMatch(
      /^multipart\/form-data/,
    )
  })

  it("falha de envio mostra o erro e não muda a lista", async () => {
    signedIn()
    fakeApi.server.use(
      http.post(url("/assets"), () =>
        HttpResponse.json({ errors: ["File must be attached"] }, { status: 422, headers: CORS }),
      ),
    )
    await openAssets()

    await userEvent.upload(fileInput(), new File(["x"], "hero.webp", { type: "image/webp" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível enviar hero.webp. O arquivo não foi aceito.",
    )
    expect(screen.getByText("Você ainda não enviou arquivos.")).toBeInTheDocument()
  })

  it("arquivo grande demais tem mensagem própria", async () => {
    signedIn()
    fakeApi.server.use(
      http.post(url("/assets"), () => new HttpResponse(null, { status: 413, headers: CORS })),
    )
    await openAssets()

    await userEvent.upload(fileInput(), new File(["x"], "video.mp4", { type: "video/mp4" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível enviar video.mp4. O arquivo é grande demais.",
    )
  })
})

describe("copiar e apagar", () => {
  it("copia a URL pública", async () => {
    const user = userEvent.setup()
    signedIn()
    const asset = fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    await openAssets()

    await user.click(screen.getByRole("button", { name: "Copiar URL de hero.webp" }))

    expect(await navigator.clipboard.readText()).toBe(asset.public_url)
  })

  it("apagar pede confirmação e remove da lista", async () => {
    signedIn()
    const asset = fakeApi.createAsset(EMAIL, "hero.webp", "image/webp", 18432)
    fakeApi.createAsset(EMAIL, "logo.png", "image/png", 4096)
    await openAssets()

    await userEvent.click(screen.getByRole("button", { name: "Apagar hero.webp" }))
    const dialog = screen.getByRole("dialog", { name: "Apagar arquivo" })
    expect(dialog).toHaveTextContent("hero.webp")
    expect(dialog).toHaveTextContent("deixam de mostrar")
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar" }))

    await vi.waitFor(() =>
      expect(within(assetsList()).queryByText("hero.webp")).not.toBeInTheDocument(),
    )
    expect(within(assetsList()).getByText("logo.png")).toBeInTheDocument()
    expect(fakeApi.requests("DELETE", `/assets/${asset.id}`)).toHaveLength(1)
  })
})
