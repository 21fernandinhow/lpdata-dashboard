import { useEffect, useState } from "react"

type CopyState = "idle" | "copied" | "failed"

const TEXT: Record<CopyState, string> = { idle: "Copiar", copied: "Copiado", failed: "Não copiou" }

// Copia um valor para a área de transferência. O texto do botão confirma por dois segundos.
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

  return (
    <button
      type="button"
      className="button button--secondary button--small"
      aria-label={label}
      title={label}
      onClick={copy}
    >
      {TEXT[state]}
    </button>
  )
}
