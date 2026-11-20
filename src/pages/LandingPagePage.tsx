import { useCallback, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
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
import { Icon } from "@/components/Icon"
import { Loader } from "@/components/Loader"
import { Tooltip } from "@/components/Tooltip"
import { UnsavedChangesGuard } from "@/components/UnsavedChangesGuard"
import { formatDocument } from "@/content/json-source"
import { LandingPagePublication } from "@/pages/LandingPagePublication"
import { LandingPageRawMode } from "@/pages/LandingPageRawMode"
import { useApi } from "@/session/context"

// A aba aberta fica no endereço, para sobreviver ao recarregamento e ao histórico.
const TAB_PARAM = "aba"
const PUBLICATION_TAB = "publicacao"

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

  return <LandingPageView page={state.data} onUpdated={replace} />
}

type LandingPageViewProps = { page: LandingPage; onUpdated: (page: LandingPage) => void }

function LandingPageView({ page, onUpdated }: LandingPageViewProps) {
  const api = useApi()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const onPublication = searchParams.get(TAB_PARAM) === PUBLICATION_TAB
  const renameDialog = useRef<HTMLDialogElement>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  // O Documento em Edição fica aqui, e não no Modo Raw, para sobreviver à troca de aba. Ele é
  // comparado ao último texto gravado para saber se há alteração pendente.
  const [savedText, setSavedText] = useState(() => formatDocument(page.current_data))
  const [draft, setDraft] = useState(savedText)
  const [deleted, setDeleted] = useState(false)
  const dirty = draft !== savedText && !deleted

  function handleSaved(updated: LandingPage, text: string) {
    setSavedText(text)
    onUpdated(updated)
  }

  async function rename(form: FormData) {
    onUpdated(await renameLandingPage(api, page.id, String(form.get("name"))))
  }

  // Sem replace, voltar no histórico abriria a landing page apagada.
  async function remove() {
    await deleteLandingPage(api, page.id)
    // Apagada, a landing page não tem mais o que perder: a saída não pede confirmação. O
    // flushSync garante que o aviso já saiba disso quando a navegação acontecer.
    flushSync(() => setDeleted(true))
    navigate("/", { replace: true })
  }

  return (
    <section className="landing-page">
      {/* Link para a lista, não history.back(): quem abriu a landing page pelo endereço sairia
          do dashboard. */}
      <Link to="/" className="button button--ghost button--small landing-page__back">
        <Icon>
          <path d="M14.25 9H3.75" />
          <path d="M8 4.75L3.75 9L8 13.25" />
        </Icon>
        Voltar
      </Link>

      <header className="landing-page__header">
        <h1 className="landing-page__title">{page.name}</h1>
        <div className="landing-page__actions">
          <Tooltip label="Renomear">
            {(tooltipId) => (
              <button
                type="button"
                className="button button--ghost button--icon"
                aria-labelledby={tooltipId}
                onClick={() => renameDialog.current?.showModal()}
              >
                <Icon>
                  <path d="M12.5 2.75L15.25 5.5L6 14.75H3.25V12L12.5 2.75Z" />
                  <path d="M10.75 4.5L13.5 7.25" />
                </Icon>
              </button>
            )}
          </Tooltip>
          <Tooltip label="Apagar">
            {(tooltipId) => (
              <button
                type="button"
                className="button button--ghost button--icon"
                aria-labelledby={tooltipId}
                onClick={() => deleteDialog.current?.showModal()}
              >
                <Icon>
                  <path d="M3 4.75H15" />
                  <path d="M7 4.75V2.75H11V4.75" />
                  <path d="M4.5 4.75L5.25 15.25H12.75L13.5 4.75" />
                  <path d="M7.5 8V12" />
                  <path d="M10.5 8V12" />
                </Icon>
              </button>
            )}
          </Tooltip>
        </div>
      </header>

      <nav className="tabs" aria-label="Seções da landing page">
        <Link
          to={{ search: "" }}
          className="tabs__tab"
          aria-current={onPublication ? undefined : "page"}
        >
          Conteúdo
        </Link>
        <Link
          to={{ search: `?${TAB_PARAM}=${PUBLICATION_TAB}` }}
          className="tabs__tab"
          aria-current={onPublication ? "page" : undefined}
        >
          Publicação
        </Link>
      </nav>

      {onPublication ? (
        <LandingPagePublication page={page} onUpdated={onUpdated} />
      ) : (
        <LandingPageRawMode
          page={page}
          draft={draft}
          onDraftChange={setDraft}
          dirty={dirty}
          onSaved={handleSaved}
        />
      )}

      <UnsavedChangesGuard when={dirty} />

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
