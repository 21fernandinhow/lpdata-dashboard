import { useEffect, useState } from "react"
import { Icon } from "@/components/Icon"
import { Tooltip } from "@/components/Tooltip"

type CopyState = "idle" | "copied" | "failed"

// Copia um valor para a área de transferência. Por dois segundos, o ícone e o tooltip confirmam.
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle")

  useEffect(() => {
    if (state === "idle") return
    const timer = setTimeout(() => setState("idle"), 2000)
    return () => clearTimeout(timer)
  }, [state])

  // Sem permissão ou fora de contexto seguro, a cópia falha: o valor continua selecionável.
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  const tooltip = { idle: label, copied: "Copiado", failed: "Não copiou" }[state]

  return (
    <Tooltip label={tooltip}>
      {(tooltipId) => (
        <button
          type="button"
          className="button button--ghost button--icon"
          aria-labelledby={tooltipId}
          onClick={copy}
        >
          <Icon>
            {state === "idle" && (
              <>
                <rect x="6.25" y="6.25" width="9" height="9" rx="1.5" />
                <path d="M11.75 3.75V3.25C11.75 2.42 11.08 1.75 10.25 1.75H3.25C2.42 1.75 1.75 2.42 1.75 3.25V10.25C1.75 11.08 2.42 11.75 3.25 11.75H3.75" />
              </>
            )}
            {state === "copied" && <path d="M3.75 9.5L7 12.75L14.25 5.25" />}
            {state === "failed" && <path d="M5 5L13 13M13 5L5 13" />}
          </Icon>
        </button>
      )}
    </Tooltip>
  )
}
