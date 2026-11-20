import { Link } from "react-router-dom"

// A aba aberta da página inicial fica no endereço: ?aba=assets. Sem ela, Landing pages.
export const HOME_TAB_PARAM = "aba"
export const ASSETS_TAB = "assets"

// As abas da página inicial. Cada lista põe as próprias ferramentas na mesma linha, à direita.
export function HomeTabs({ current }: { current: "landing-pages" | "assets" }) {
  return (
    <nav className="tabs" aria-label="Seções do dashboard">
      <Link
        to={{ pathname: "/", search: "" }}
        className="tabs__tab"
        aria-current={current === "landing-pages" ? "page" : undefined}
      >
        Landing pages
      </Link>
      <Link
        to={{ pathname: "/", search: `?${HOME_TAB_PARAM}=${ASSETS_TAB}` }}
        className="tabs__tab"
        aria-current={current === "assets" ? "page" : undefined}
      >
        Assets
      </Link>
    </nav>
  )
}
