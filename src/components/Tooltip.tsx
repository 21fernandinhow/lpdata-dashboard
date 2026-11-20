import { useId, type ReactNode } from "react"

type TooltipProps = {
  label: string
  // Recebe o id do balão. Num botão só com ícone, use-o em aria-labelledby: o balão é o nome.
  children: (tooltipId: string) => ReactNode
}

// Balão de texto que aparece no hover e no foco do elemento, só com CSS. Não há elemento nativo
// para isso que seja Baseline: popover="hint" ainda não é (ADR 0007).
export function Tooltip({ label, children }: TooltipProps) {
  const id = useId()

  return (
    <span className="tooltip">
      {children(id)}
      <span id={id} role="tooltip" className="tooltip__bubble">
        {label}
      </span>
    </span>
  )
}
