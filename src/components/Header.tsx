import { Link } from "react-router-dom"
import { SignOutButton } from "@/components/SignOutButton"
import { ThemeMenu } from "@/components/ThemeMenu"

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
        <div className="header__actions">
          <ThemeMenu />
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
