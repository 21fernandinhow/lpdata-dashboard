// Teste de infraestrutura: prova que a pilha de testes está montada (Testing Library, jsdom e MSW).
// Não testa nenhum fluxo. Ele sai na #11, quando os testes de fluxo chegarem.
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { setupServer } from "msw/node"
import { MemoryRouter } from "react-router-dom"
import { AppRoutes } from "@/AppRoutes"
import { env } from "@/env"

// "/stack-check" não existe na API. É um endereço de mentira, só para provar a interceptação.
const server = setupServer(
  http.get(`${env.apiUrl}/stack-check`, () => HttpResponse.json({ intercepted: true })),
)

beforeAll(() => server.listen({ onUnhandledFrame: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("pilha de testes", () => {
  it("renderiza a casca com Testing Library", async () => {
    render(
      <MemoryRouter initialEntries={["/rota-que-nao-existe"]}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole("heading", { name: "Página não encontrada" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /usar tema/i })).toBeInTheDocument()
  })

  it("intercepta uma requisição com MSW", async () => {
    const response = await fetch(`${env.apiUrl}/stack-check`)

    expect(await response.json()).toEqual({ intercepted: true })
  })
})
