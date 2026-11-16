import type { ReactNode } from "react"

// Moldura dos ícones copiados da documentação (Mintlify), em viewBox 18 e traço 1,5.
export function Icon({ children }: { children: ReactNode }) {
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
