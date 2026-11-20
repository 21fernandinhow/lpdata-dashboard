import { useEffect, useEffectEvent, useId, useRef } from "react"
import { useBlocker } from "react-router-dom"

// Avisa antes de perder alterações não salvas. Recarregar ou fechar a aba cai no aviso do
// navegador; navegar dentro do dashboard para outra página abre um dialog nativo. Mudar só a
// busca do endereço, como trocar de aba na landing page, não é sair.
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!when) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [when])

  useEffect(() => {
    if (blocker.state === "blocked" && !dialogRef.current?.open) dialogRef.current?.showModal()
  }, [blocker.state])

  // Fechar o dialog, pelo botão ou pelo Esc, é continuar editando.
  const onDialogClose = useEffectEvent(() => {
    if (blocker.state === "blocked") blocker.reset()
  })

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.addEventListener("close", onDialogClose)
    return () => dialog?.removeEventListener("close", onDialogClose)
  }, [])

  return (
    <dialog ref={dialogRef} className="form-dialog" aria-labelledby={titleId}>
      <div className="form-dialog__form">
        <h2 id={titleId} className="form-dialog__title">
          Descartar alterações?
        </h2>
        <p className="form-dialog__text">
          O Documento de Conteúdo tem alterações não salvas. Sair agora descarta essas alterações.
        </p>
        <div className="form-dialog__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => dialogRef.current?.close()}
          >
            Continuar editando
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => blocker.proceed?.()}
          >
            Descartar e sair
          </button>
        </div>
      </div>
    </dialog>
  )
}
