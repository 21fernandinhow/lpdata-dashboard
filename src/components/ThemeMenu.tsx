import type { ComponentType, ReactNode } from "react"
import { useThemePreference, type ThemePreference } from "@/theme"

// Cópia do seletor de tema da documentação: os mesmos rótulos, ícones e opções.
const OPTIONS: { value: ThemePreference; label: string; Icon: ComponentType }[] = [
  { value: "system", label: "System", Icon: SystemIcon },
  { value: "light", label: "Light", Icon: LightIcon },
  { value: "dark", label: "Dark", Icon: DarkIcon },
]

const MENU_ID = "theme-menu"

export function ThemeMenu() {
  const { preference, setPreference } = useThemePreference()
  const CurrentIcon = OPTIONS.find((option) => option.value === preference)!.Icon

  return (
    <div className="theme-menu">
      <button
        type="button"
        className="theme-menu__trigger"
        popoverTarget={MENU_ID}
        aria-label="Mudar o tema"
        title="Mudar o tema"
      >
        <CurrentIcon />
      </button>
      <div id={MENU_ID} className="theme-menu__list" popover="auto">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className="theme-menu__item"
            popoverTarget={MENU_ID}
            popoverTargetAction="hide"
            aria-pressed={preference === value}
            onClick={() => setPreference(value)}
          >
            <Icon />
            <span>{label}</span>
            {preference === value && <CheckIcon />}
          </button>
        ))}
      </div>
    </div>
  )
}

// Ícones copiados da documentação (Mintlify), em viewBox 18 e traço 1,5.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function SystemIcon() {
  return (
    <Icon>
      <path d="M4.5 15.5L9 14.5L13.5 15.5" />
      <path d="M9 11.75V14.5" />
      <path d="M14.25 2.75H3.75C2.64543 2.75 1.75 3.64543 1.75 4.75V9.75C1.75 10.8546 2.64543 11.75 3.75 11.75H14.25C15.3546 11.75 16.25 10.8546 16.25 9.75V4.75C16.25 3.64543 15.3546 2.75 14.25 2.75Z" />
    </Icon>
  )
}

function LightIcon() {
  return (
    <Icon>
      <path d="M9 1.25V2.25" />
      <path d="M14.48 3.52002L13.773 4.22702" />
      <path d="M16.75 9H15.75" />
      <path d="M14.48 14.4799L13.773 13.7729" />
      <path d="M9 16.75V15.75" />
      <path d="M3.52 14.4799L4.227 13.7729" />
      <path d="M1.25 9H2.25" />
      <path d="M3.52 3.52002L4.227 4.22702" />
      <path d="M9 13.25C11.3472 13.25 13.25 11.3472 13.25 9C13.25 6.65279 11.3472 4.75 9 4.75C6.65279 4.75 4.75 6.65279 4.75 9C4.75 11.3472 6.65279 13.25 9 13.25Z" />
    </Icon>
  )
}

function DarkIcon() {
  return (
    <Icon>
      <path d="M13 11.75C9.548 11.75 6.75 8.95201 6.75 5.50001C6.75 4.14801 7.183 2.90101 7.912 1.87801C4.548 2.50601 2 5.45301 2 9.00001C2 13.004 5.246 16.25 9.25 16.25C12.622 16.25 15.448 13.944 16.259 10.826C15.309 11.409 14.196 11.75 13 11.75Z" />
    </Icon>
  )
}

function CheckIcon() {
  return (
    <span className="theme-menu__check">
      <Icon>
        <path d="M2.75 9.5L6.5 13.25L15.25 4.5" />
      </Icon>
    </span>
  )
}
