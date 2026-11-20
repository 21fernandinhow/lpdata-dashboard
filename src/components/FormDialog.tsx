import { useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react"
import { userMessage } from "@/api/errors"

type FormDialogProps = {
  // Quem abre o dialog chama ref.current.showModal().
  ref: RefObject<HTMLDialogElement | null>
  title: string
  submitLabel: string
  // Grava. Se rejeitar, a mensagem aparece no dialog, que continua aberto.
  onSubmit: (form: FormData) => Promise<void>
  children: ReactNode
}

// Dialog modal nativo com um formulário (ADR 0007). Foco preso, Esc e fundo inerte são do
// navegador. Ao fechar, por qualquer caminho, o formulário volta aos valores iniciais.
export function FormDialog({ ref, title, submitLabel, onSubmit, children }: FormDialogProps) {
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setPending(true)
    try {
      await onSubmit(data)
      ref.current?.close()
    } catch (caught) {
      setError(userMessage(caught))
    } finally {
      setPending(false)
    }
  }

  function handleClose() {
    formRef.current?.reset()
    setError(null)
  }

  return (
    <dialog ref={ref} className="form-dialog" aria-labelledby={titleId} onClose={handleClose}>
      <form ref={formRef} className="form-dialog__form" onSubmit={handleSubmit}>
        <h2 id={titleId} className="form-dialog__title">
          {title}
        </h2>
        {error && (
          <p className="form-dialog__error" role="alert">
            {error}
          </p>
        )}
        {children}
        <div className="form-dialog__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => ref.current?.close()}
          >
            Cancelar
          </button>
          <button type="submit" className="button button--primary" disabled={pending}>
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
