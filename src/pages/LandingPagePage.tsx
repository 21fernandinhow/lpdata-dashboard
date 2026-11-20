import { useCallback, useRef } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { isNotFound, userMessage } from "@/api/errors"
import {
  deleteLandingPage,
  getLandingPage,
  renameLandingPage,
  type LandingPage,
} from "@/api/landing-pages"
import { useLoad } from "@/api/use-load"
import { ErrorState } from "@/components/ErrorState"
import { FormDialog } from "@/components/FormDialog"
import { Loader } from "@/components/Loader"
import { useApi } from "@/session/context"

// Uma landing page por montagem: trocar de id começa do zero, sem mostrar a anterior.
export default function LandingPageRoute() {
  const { id = "" } = useParams()
  return <LandingPagePage key={id} id={id} />
}

function LandingPagePage({ id }: { id: string }) {
  const api = useApi()
  const navigate = useNavigate()
  const load = useCallback((signal: AbortSignal) => getLandingPage(api, id, signal), [api, id])
  const { state, reload, replace } = useLoad(load)

  if (state.status === "loading") return <Loader />
  if (state.status === "failed") {
    // A API responde 404 tanto para id inexistente quanto para landing page de outra conta.
    if (isNotFound(state.error)) {
      return (
        <ErrorState
          title="Landing page não encontrada"
          message="Ela não existe, foi apagada ou pertence a outra conta."
          action={{ label: "Ver as landing pages", onClick: () => navigate("/") }}
        />
      )
    }
    return (
      <ErrorState
        title="Não foi possível abrir a landing page"
        message={userMessage(state.error)}
        action={{ label: "Tentar de novo", onClick: reload }}
      />
    )
  }

  return <LandingPageView page={state.data} onRenamed={replace} />
}

type LandingPageViewProps = { page: LandingPage; onRenamed: (page: LandingPage) => void }

function LandingPageView({ page, onRenamed }: LandingPageViewProps) {
  const api = useApi()
  const navigate = useNavigate()
  const renameDialog = useRef<HTMLDialogElement>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)

  async function rename(form: FormData) {
    onRenamed(await renameLandingPage(api, page.id, String(form.get("name"))))
  }

  // Sem replace, voltar no histórico abriria a landing page apagada.
  async function remove() {
    await deleteLandingPage(api, page.id)
    navigate("/", { replace: true })
  }

  return (
    <section className="landing-page">
      <nav className="landing-page__breadcrumb" aria-label="Navegação">
        <Link to="/">Landing pages</Link>
      </nav>

      <header className="landing-page__header">
        <h1 className="landing-page__title">{page.name}</h1>
        <div className="landing-page__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => renameDialog.current?.showModal()}
          >
            Renomear
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => deleteDialog.current?.showModal()}
          >
            Apagar
          </button>
        </div>
      </header>

      <p className="landing-page__placeholder">A edição do Documento de Conteúdo chega na #14.</p>

      <FormDialog
        ref={renameDialog}
        title="Renomear landing page"
        submitLabel="Salvar"
        onSubmit={rename}
      >
        <label className="field">
          <span>Nome</span>
          <input name="name" defaultValue={page.name} autoComplete="off" required />
        </label>
      </FormDialog>

      <FormDialog
        ref={deleteDialog}
        title="Apagar landing page"
        submitLabel="Apagar"
        onSubmit={remove}
      >
        <p className="form-dialog__text">
          A landing page <strong>{page.name}</strong> e o Documento de Conteúdo dela serão apagados.
          Isso não pode ser desfeito.
        </p>
      </FormDialog>
    </section>
  )
}
