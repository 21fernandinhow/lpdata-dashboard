import { useSearchParams } from "react-router-dom"
import { ASSETS_TAB, HOME_TAB_PARAM } from "@/components/HomeTabs"
import { AssetsPage, LandingPagesPage } from "@/pages/lazy-pages"

const DASHBOARD_DOCS = "https://lpdata.io/dashboard"

// A página inicial: uma intro e, pela aba no endereço, as landing pages ou os assets da conta.
export default function HomePage() {
  const [searchParams] = useSearchParams()

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
      {searchParams.get(HOME_TAB_PARAM) === ASSETS_TAB ? <AssetsPage /> : <LandingPagesPage />}
    </div>
  )
}
