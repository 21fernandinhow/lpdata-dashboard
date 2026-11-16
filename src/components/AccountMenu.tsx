import { Icon } from "@/components/Icon"
import { useSession } from "@/session/context"

const MENU_ID = "account-menu"

// Menu de conta no cabeçalho, com popover nativo como o seletor de tema (ADR 0007).
export function AccountMenu() {
  const { status, user, signOut } = useSession()
  if (status !== "signed-in") return null

  return (
    <div className="account-menu">
      <button
        type="button"
        className="account-menu__trigger"
        popoverTarget={MENU_ID}
        aria-label="Conta"
        title="Conta"
      >
        <Icon>
          <path d="M9 8.25C10.7949 8.25 12.25 6.79493 12.25 5C12.25 3.20507 10.7949 1.75 9 1.75C7.20507 1.75 5.75 3.20507 5.75 5C5.75 6.79493 7.20507 8.25 9 8.25Z" />
          <path d="M2.953 15.5C4.297 13.271 6.476 11.75 9 11.75C11.524 11.75 13.703 13.271 15.047 15.5" />
        </Icon>
      </button>
      <div id={MENU_ID} className="account-menu__panel" popover="auto">
        <p className="account-menu__email">{user.email}</p>
        <button
          type="button"
          className="account-menu__item"
          popoverTarget={MENU_ID}
          popoverTargetAction="hide"
          onClick={signOut}
        >
          Sair
        </button>
      </div>
    </div>
  )
}
