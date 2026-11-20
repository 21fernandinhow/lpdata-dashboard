import { useCallback, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { userMessage } from "@/api/errors"
import { createLandingPage, listLandingPages, type LandingPage } from "@/api/landing-pages"
import { useLoad } from "@/api/use-load"
import { ErrorState } from "@/components/ErrorState"
import { FormDialog } from "@/components/FormDialog"
import { HomeTabs } from "@/components/HomeTabs"
import { Icon } from "@/components/Icon"
import { Loader } from "@/components/Loader"
import { Tooltip } from "@/components/Tooltip"
import { useApi } from "@/session/context"

const updatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" })

// A API não ordena a lista: a ordem por nome é da apresentação.
function byName(pages: LandingPage[]) {
  return [...pages].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

export default function LandingPagesPage() {
  const api = useApi()
  const navigate = useNavigate()
  const createDialog = useRef<HTMLDialogElement>(null)
  const load = useCallback((signal: AbortSignal) => listLandingPages(api, signal), [api])
  const { state, reload } = useLoad(load)

  async function create(form: FormData) {
    const created = await createLandingPage(api, String(form.get("name")))
    navigate(`/landing-pages/${created.id}`)
  }

  if (state.status === "loading") return <Loader />
  if (state.status === "failed") {
    return (
      <ErrorState
        title="Não foi possível carregar as landing pages"
        message={userMessage(state.error)}
        action={{ label: "Tentar de novo", onClick: reload }}
      />
    )
  }

  const pages = byName(state.data)

  return (
    <section className="landing-pages">
      <header className="home-bar">
        <h2 className="visually-hidden">Páginas</h2>
        <HomeTabs current="landing-pages" />
        <Tooltip label="Nova landing page">
          {(tooltipId) => (
            <button
              type="button"
              className="button button--ghost button--icon"
              aria-labelledby={tooltipId}
              onClick={() => createDialog.current?.showModal()}
            >
              <Icon>
                <path d="M9 3.75V14.25" />
                <path d="M3.75 9H14.25" />
              </Icon>
            </button>
          )}
        </Tooltip>
      </header>

      {pages.length === 0 ? (
        <p className="landing-pages__empty">Você ainda não tem landing pages.</p>
      ) : (
        <ul className="landing-pages__list" aria-label="Páginas">
          {pages.map((page) => (
            <li key={page.id} className="landing-pages__item">
              <Link to={`/landing-pages/${page.id}`} className="landing-pages__link">
                {page.name}
              </Link>
              <span className="landing-pages__meta">
                Atualizada em {updatedAt.format(new Date(page.updated_at))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <FormDialog
        ref={createDialog}
        title="Nova landing page"
        submitLabel="Criar"
        onSubmit={create}
      >
        <p className="form-dialog__text">Ela nasce com o Documento de Conteúdo vazio.</p>
        <label className="field">
          <span>Nome</span>
          <input name="name" autoComplete="off" required />
        </label>
      </FormDialog>
    </section>
  )
}
