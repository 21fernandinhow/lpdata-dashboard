// Testes de integração da publicação de uma landing page (#13): identificador público, hosts
// permitidos e o que a Aplicação Consumidora recebe. O app inteiro contra a API simulada.
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { fakeApi } from "@/test/fake-api"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const DOCUMENT = { hero: { title: { value: "Olá", type: "string" } } }

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

// Abre a landing page já com sessão, na aba de publicação.
async function openPublication() {
  fakeApi.createUser(EMAIL, "senha-secreta")
  localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
  const page = fakeApi.createLandingPage(EMAIL, "Lançamento", DOCUMENT)
  renderApp(`/landing-pages/${page.id}`)
  await userEvent.click(await screen.findByRole("link", { name: "Publicação" }))
  return page
}

function hostsList() {
  return screen.getByRole("list", { name: "Hosts permitidos" })
}

function hostsShown() {
  return within(hostsList())
    .queryAllByRole("listitem")
    .map((item) => item.firstChild?.textContent)
}

async function addHost(text: string) {
  await userEvent.type(screen.getByLabelText("Host"), text)
  await userEvent.click(screen.getByRole("button", { name: "Adicionar host" }))
}

function patches(id: number) {
  return fakeApi.requests("PATCH", `/manage/landing_pages/${id}`)
}

describe("abas", () => {
  it("abre em Conteúdo, e a aba Publicação fica no endereço", async () => {
    const page = await openPublication()

    expect(window.location.search).toBe("?aba=publicacao")
    expect(screen.getByRole("link", { name: "Publicação" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByText(String(page.public_id))).toBeInTheDocument()

    await userEvent.click(screen.getByRole("link", { name: "Conteúdo" }))

    expect(window.location.search).toBe("")
    expect(screen.queryByText(String(page.public_id))).not.toBeInTheDocument()
  })

  it("voltar leva à lista", async () => {
    await openPublication()

    await userEvent.click(screen.getByRole("link", { name: "Voltar" }))

    expect(await screen.findByRole("heading", { level: 1, name: "Landing pages" })).toBeVisible()
  })
})

describe("identificador público", () => {
  it("mostra o public_id e a URL pública, e copia os dois", async () => {
    const user = userEvent.setup()
    const page = await openPublication()
    const publicUrl = `https://api.test.lpdata.io/landing_pages/${page.public_id}`

    expect(screen.getByText(String(page.public_id))).toBeInTheDocument()
    expect(screen.getByText(publicUrl)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Copiar identificador público" }))
    expect(await navigator.clipboard.readText()).toBe(String(page.public_id))
    // O tooltip, que é o nome do botão, confirma a cópia.
    expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Copiar URL pública" }))
    expect(await navigator.clipboard.readText()).toBe(publicUrl)
  })
})

describe("hosts permitidos", () => {
  it("adicionar grava só allowed_hosts, sem alterar current_data", async () => {
    const page = await openPublication()
    expect(screen.getByText("Nenhum host cadastrado.")).toBeInTheDocument()

    await addHost("example.com")

    expect(await within(hostsList()).findByText("example.com")).toBeInTheDocument()
    expect(patches(page.id)[0].body).toEqual({ landing_page: { allowed_hosts: ["example.com"] } })
    expect(screen.getByLabelText("Host")).toHaveValue("")

    await addHost("localhost:5173")

    await within(hostsList()).findByText("localhost:5173")
    expect(hostsShown()).toEqual(["example.com", "localhost:5173"])
    expect(fakeApi.landingPages()[0].allowed_hosts).toEqual(["example.com", "localhost:5173"])
    expect(fakeApi.landingPages()[0].current_data).toEqual(DOCUMENT)
  })

  it("de uma URL colada, grava só o host", async () => {
    const page = await openPublication()

    await addHost("https://Loja.Example.com:8443/promo?x=1")

    await within(hostsList()).findByText("loja.example.com:8443")
    expect(patches(page.id)[0].body).toEqual({
      landing_page: { allowed_hosts: ["loja.example.com:8443"] },
    })
  })

  it("remover grava a lista sem o host, sem alterar current_data", async () => {
    fakeApi.createUser(EMAIL, "senha-secreta")
    localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
    const page = fakeApi.createLandingPage(EMAIL, "Lançamento", DOCUMENT)
    fakeApi.landingPages()[0].allowed_hosts = ["example.com", "localhost:5173"]
    renderApp(`/landing-pages/${page.id}?aba=publicacao`)

    await userEvent.click(await screen.findByRole("button", { name: "Remover example.com" }))

    expect(await within(hostsList()).findByText("localhost:5173")).toBeInTheDocument()
    expect(hostsShown()).toEqual(["localhost:5173"])
    expect(patches(page.id)[0].body).toEqual({
      landing_page: { allowed_hosts: ["localhost:5173"] },
    })
    expect(fakeApi.landingPages()[0].current_data).toEqual(DOCUMENT)
  })

  it("host repetido avisa sem chamar a API", async () => {
    const page = await openPublication()
    await addHost("example.com")
    await within(hostsList()).findByText("example.com")

    await addHost("EXAMPLE.com")

    expect(await screen.findByRole("alert")).toHaveTextContent("example.com já está na lista.")
    expect(patches(page.id)).toHaveLength(1)
  })

  it("explica que os hosts mudam o limite de leituras, não quem pode ler", async () => {
    await openPublication()

    expect(screen.getByText(/qualquer origem/)).toBeInTheDocument()
    expect(screen.getByText(/limite de leituras/)).toBeInTheDocument()
  })
})

describe("o que o consumidor recebe", () => {
  it("mostra o corpo da leitura pública, sem token", async () => {
    const page = await openPublication()

    const view = await screen.findByLabelText("Resposta da leitura pública")

    expect(JSON.parse(view.textContent ?? "")).toEqual(DOCUMENT)
    const [read] = fakeApi.requests("GET", `/landing_pages/${page.public_id}`)
    expect(read.headers.get("Authorization")).toBeNull()
  })

  it("atualizar lê de novo", async () => {
    const page = await openPublication()
    await screen.findByLabelText("Resposta da leitura pública")
    fakeApi.landingPages()[0].current_data = { novo: { value: "sim", type: "string" } }

    await userEvent.click(screen.getByRole("button", { name: "Atualizar" }))

    await screen.findByText(/"novo"/)
    expect(
      JSON.parse(screen.getByLabelText("Resposta da leitura pública").textContent ?? ""),
    ).toEqual({ novo: { value: "sim", type: "string" } })
    expect(fakeApi.requests("GET", `/landing_pages/${page.public_id}`)).toHaveLength(2)
  })
})
