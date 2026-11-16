import { render } from "@testing-library/react"
import { App } from "@/App"
import { createSession } from "@/session/session"

// Abre o app num endereço, como o navegador abriria. Cada chamada é um carregamento novo da
// página: a sessão em memória começa vazia, e só o localStorage sobrevive.
export function renderApp(path = "/") {
  window.history.replaceState(null, "", path)
  const session = createSession()
  return { session, ...render(<App session={session} />) }
}
