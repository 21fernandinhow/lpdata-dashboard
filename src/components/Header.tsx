import { Link } from "react-router-dom"
import { ThemeToggle } from "@/components/ThemeToggle"

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
          <span className="header__product">Dashboard</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
