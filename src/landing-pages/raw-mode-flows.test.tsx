// Testes de integração do Modo Raw (#14): editar e gravar o Documento de Conteúdo como JSON.
// O app inteiro contra a API simulada.
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse } from "msw/http"
import { REFRESH_TOKEN_KEY } from "@/session/session"
import { fakeApi, url } from "@/test/fake-api"
import { renderApp } from "@/test/render-app"

const EMAIL = "owner@example.com"
const DOCUMENT = { hero: { title: { value: "Olá", type: "string" } } }
const EDITED = {
  hero: { title: { value: "Olá de novo", type: "string" } },
  features: [{ label: { value: "Rápido", type: "string" } }],
}

const format = (value: unknown) => JSON.stringify(value, null, 2)

beforeAll(() => fakeApi.server.listen({ onUnhandledFrame: "error" }))
afterEach(() => {
  fakeApi.server.resetHandlers()
  fakeApi.reset()
  localStorage.clear()
})
afterAll(() => fakeApi.server.close())

// Abre a landing page já com sessão, na aba Conteúdo.
async function openContent() {
  fakeApi.createUser(EMAIL, "senha-secreta")
  localStorage.setItem(REFRESH_TOKEN_KEY, fakeApi.openSession(EMAIL))
  const page = fakeApi.createLandingPage(EMAIL, "Lançamento", DOCUMENT)
  const app = renderApp(`/landing-pages/${page.id}`)
  await screen.findByLabelText("Documento de Conteúdo")
  return { page, app }
}

function editor() {
  return screen.getByLabelText<HTMLTextAreaElement>("Documento de Conteúdo")
}

async function replaceDocument(text: string) {
  await userEvent.clear(editor())
  await userEvent.click(editor())
  await userEvent.paste(text)
}

function saveButton() {
  return screen.getByRole("button", { name: /^Salvar/ })
}

function patches(id: number) {
  return fakeApi.requests("PATCH", `/manage/landing_pages/${id}`)
}

describe("Modo Raw", () => {
  it("abre com o current_data formatado, sem alteração pendente", async () => {
    await openContent()

    expect(editor()).toHaveValue(format(DOCUMENT))
    expect(saveButton()).toBeDisabled()
    expect(screen.queryByText("Alterações não salvas")).not.toBeInTheDocument()
  })

  it("grava o documento inteiro, e reler confirma", async () => {
    const { page, app } = await openContent()

    await replaceDocument(format(EDITED))
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument()
    await userEvent.click(saveButton())

    await vi.waitFor(() => expect(patches(page.id)).toHaveLength(1))
    expect(patches(page.id)[0].body).toEqual({ landing_page: { current_data: EDITED } })
    await vi.waitFor(() =>
      expect(screen.queryByText("Alterações não salvas")).not.toBeInTheDocument(),
    )
    expect(saveButton()).toBeDisabled()

    app.unmount()
    renderApp(`/landing-pages/${page.id}`)

    expect(await screen.findByLabelText("Documento de Conteúdo")).toHaveValue(format(EDITED))
  })

  it("Ctrl+S grava", async () => {
    const { page } = await openContent()

    await replaceDocument(format(EDITED))
    await userEvent.keyboard("{Control>}s{/Control}")

    await vi.waitFor(() => expect(patches(page.id)).toHaveLength(1))
    expect(fakeApi.landingPages()[0].current_data).toEqual(EDITED)
  })

  it("JSON malformado é apontado antes de chegar à API", async () => {
    const { page } = await openContent()

    await replaceDocument('{\n  "a": \n}')
    await userEvent.click(saveButton())

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "JSON inválido na linha 3, coluna 1: Esperava um valor.",
    )
    expect(patches(page.id)).toHaveLength(0)
  })

  it("erro de contrato da API mostra o caminho e leva à linha do campo", async () => {
    const { page } = await openContent()
    fakeApi.server.use(
      http.patch(url("/manage/landing_pages/:id"), () =>
        HttpResponse.json(
          {
            errors: ["Current data editable field value does not match its type at $.hero.title"],
          },
          { status: 422, headers: { "Access-Control-Allow-Origin": window.location.origin } },
        ),
      ),
    )
    const broken = format({ hero: { title: { value: 3, type: "string" } } })

    await replaceDocument(broken)
    await userEvent.click(saveButton())

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("O value não corresponde ao type do campo.")
    expect(alert).toHaveTextContent("$.hero.title")
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole("button", { name: /\$\.hero\.title/ }))

    // "title" está na linha 3 do documento formatado.
    const lineStart = broken.split("\n").slice(0, 2).join("\n").length + 1
    expect(editor()).toHaveFocus()
    expect(editor().selectionStart).toBe(lineStart)
    expect(fakeApi.landingPages().find(({ id }) => id === page.id)?.current_data).toEqual(DOCUMENT)
  })

  it("trocar de aba mantém o Documento em Edição", async () => {
    await openContent()

    await replaceDocument(format(EDITED))
    await userEvent.click(screen.getByRole("link", { name: "Publicação" }))
    await userEvent.click(screen.getByRole("link", { name: "Conteúdo" }))

    expect(await screen.findByLabelText("Documento de Conteúdo")).toHaveValue(format(EDITED))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("sair com alteração pendente", () => {
  it("pede confirmação antes de sair da landing page", async () => {
    const { page } = await openContent()
    await replaceDocument(format(EDITED))

    await userEvent.click(screen.getByRole("link", { name: "Voltar" }))

    const dialog = screen.getByRole("dialog", { name: "Descartar alterações?" })
    expect(window.location.pathname).toBe(`/landing-pages/${page.id}`)
    await userEvent.click(within(dialog).getByRole("button", { name: "Continuar editando" }))

    expect(dialog).not.toBeVisible()
    expect(editor()).toHaveValue(format(EDITED))

    await userEvent.click(screen.getByRole("link", { name: "Voltar" }))
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Descartar alterações?" })).getByRole("button", {
        name: "Descartar e sair",
      }),
    )

    expect(await screen.findByRole("heading", { level: 1, name: "Landing pages" })).toBeVisible()
    expect(patches(page.id)).toHaveLength(0)
  })

  it("sem alteração pendente, sai sem perguntar", async () => {
    await openContent()

    await userEvent.click(screen.getByRole("link", { name: "Voltar" }))

    expect(await screen.findByRole("heading", { level: 1, name: "Landing pages" })).toBeVisible()
  })

  it("recarregar ou fechar a aba avisa só com alteração pendente", async () => {
    await openContent()
    const unload = () => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }

    expect(unload()).toBe(false)
    await replaceDocument(format(EDITED))
    expect(unload()).toBe(true)
  })
})
