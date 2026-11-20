import { Icon } from "@/components/Icon"
import { Tooltip } from "@/components/Tooltip"
import { useSession } from "@/session/context"

// Sair, direto do cabeçalho: um clique encerra a sessão, sem menu.
export function SignOutButton() {
  const { status, signOut } = useSession()
  if (status !== "signed-in") return null

  return (
    <Tooltip label="Sair">
      {(tooltipId) => (
        <button
          type="button"
          className="sign-out-button"
          aria-labelledby={tooltipId}
          onClick={signOut}
        >
          <Icon>
            <path d="M6.75 15.25H4.25C3.42 15.25 2.75 14.58 2.75 13.75V4.25C2.75 3.42 3.42 2.75 4.25 2.75H6.75" />
            <path d="M11.75 12.25L15 9L11.75 5.75" />
            <path d="M15 9H6.75" />
          </Icon>
        </button>
      )}
    </Tooltip>
  )
}
