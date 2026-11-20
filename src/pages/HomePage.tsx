import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ASSETS_TAB, HOME_TAB_PARAM } from "@/components/HomeTabs"
import { AssetsPage, LandingPagesPage } from "@/pages/lazy-pages"

const DASHBOARD_DOCS = "https://lpdata.io/dashboard"

type Tab = "pages" | "files"

// A página inicial: uma intro e, pela aba no endereço, as páginas ou os arquivos da conta.
export default function HomePage() {
  const [searchParams] = useSearchParams()
  const tab: Tab = searchParams.get(HOME_TAB_PARAM) === ASSETS_TAB ? "files" : "pages"
  // Uma aba carrega na primeira vez que abre e depois fica montada, só escondida: trocar de aba
  // não repete a requisição. Sair da página inicial descarta as duas, e voltar recarrega.
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set([tab]))
  if (!opened.has(tab)) setOpened(new Set(opened).add(tab))

  return (
    <div className="home">
      <header className="home__intro">
        <h1 className="home__title">Seu conteúdo</h1>
        <p className="home__text">
          Crie landing pages, edite os textos e as imagens de cada uma e guarde os arquivos que elas
          usam. O site de cada landing page mostra o que você salva aqui.{" "}
          <a href={DASHBOARD_DOCS} target="_blank" rel="noreferrer">
            Como usar o Dashboard
          </a>
        </p>
      </header>
      {opened.has("pages") && (
        <div hidden={tab !== "pages"}>
          <LandingPagesPage />
        </div>
      )}
      {opened.has("files") && (
        <div hidden={tab !== "files"}>
          <AssetsPage />
        </div>
      )}
    </div>
  )
}
