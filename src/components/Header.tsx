import { Link, useLocation } from "react-router-dom"
import { SignOutButton } from "@/components/SignOutButton"
import { ThemeMenu } from "@/components/ThemeMenu"
import { useSession } from "@/session/context"

export function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__brand">
          <img
            className="header__logo header__logo--light"
            src="/logo/light.svg"
            alt="LPData"
            width="90"
            height="28"
          />
          <img
            className="header__logo header__logo--dark"
            src="/logo/dark.svg"
            alt="LPData"
            width="90"
            height="28"
          />
        </Link>
        <MainNav />
        <div className="header__actions">
          <ThemeMenu />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}

// As áreas do dashboard, para quem está logado. A página de uma landing page conta como
// Landing pages.
function MainNav() {
  const { status } = useSession()
  const { pathname } = useLocation()
  if (status !== "signed-in") return null

  const onAssets = pathname.startsWith("/assets")
  const onLandingPages = pathname === "/" || pathname.startsWith("/landing-pages")

  return (
    <nav className="header__nav" aria-label="Principal">
      <Link to="/" className="header__nav-link" aria-current={onLandingPages ? "page" : undefined}>
        Landing pages
      </Link>
      <Link to="/assets" className="header__nav-link" aria-current={onAssets ? "page" : undefined}>
        Assets
      </Link>
    </nav>
  )
}
