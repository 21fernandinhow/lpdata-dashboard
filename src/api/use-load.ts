import { useCallback, useEffect, useState } from "react"

export type LoadState<T> =
  { status: "loading" } | { status: "loaded"; data: T } | { status: "failed"; error: unknown }

// Carrega um recurso da API ao montar e sempre que `load` mudar. A carga anterior é abortada, e
// sua resposta, ignorada. `load` precisa ser estável: venha de useCallback.
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => setState({ status: "loaded", data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: "failed", error })
      })
    return () => controller.abort()
  }, [load, attempt])

  const reload = useCallback(() => {
    setState({ status: "loading" })
    setAttempt((current) => current + 1)
  }, [])

  // Troca o dado carregado pelo que a API devolveu numa gravação, sem carregar de novo.
  const replace = useCallback((data: T) => setState({ status: "loaded", data }), [])

  return { state, reload, replace }
}
