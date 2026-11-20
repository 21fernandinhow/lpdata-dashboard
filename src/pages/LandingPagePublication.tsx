import { useCallback, useId, useState, type FormEvent } from "react"
import { userMessage } from "@/api/errors"
import { hostFrom } from "@/api/hosts"
import {
  getPublicContent,
  publicUrl,
  updateAllowedHosts,
  type LandingPage,
} from "@/api/landing-pages"
import { useLoad } from "@/api/use-load"
import { CopyButton } from "@/components/CopyButton"
import { Loader } from "@/components/Loader"
import { useApi } from "@/session/context"

const LIMITS_DOCS = "https://lpdata.io/public-content#limite-de-leituras"

type PublicationProps = { page: LandingPage; onUpdated: (page: LandingPage) => void }

// A aba Publicação: o que liga a landing page à Aplicação Consumidora.
export function LandingPagePublication({ page, onUpdated }: PublicationProps) {
  return (
    <div className="publication">
      <PublicIdentifier publicId={page.public_id} />
      <AllowedHosts page={page} onUpdated={onUpdated} />
      <PublicView publicId={page.public_id} />
    </div>
  )
}

function PublicIdentifier({ publicId }: { publicId: number }) {
  const url = publicUrl(publicId)

  return (
    <section className="publication__section">
      <h2 className="publication__title">Identificador público</h2>
      <p className="publication__text">
        A Aplicação Consumidora busca o Documento de Conteúdo por esta URL, sem token.
      </p>
      <dl className="publication__values">
        <div className="publication__value">
          <dt>Identificador</dt>
          <dd>
            <code>{publicId}</code>
            <CopyButton value={String(publicId)} label="Copiar identificador público" />
          </dd>
        </div>
        <div className="publication__value">
          <dt>URL pública</dt>
          <dd>
            <code>{url}</code>
            <CopyButton value={url} label="Copiar URL pública" />
          </dd>
        </div>
      </dl>
    </section>
  )
}

function AllowedHosts({ page, onUpdated }: PublicationProps) {
  const api = useApi()
  const hintId = useId()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [draft, setDraft] = useState("")
  const hosts = page.allowed_hosts

  // O PATCH é parcial: mandar só allowed_hosts não toca no current_data.
  async function save(next: string[]) {
    setError(null)
    setPending(true)
    try {
      onUpdated(await updateAllowedHosts(api, page.id, next))
      return true
    } catch (caught) {
      setError(userMessage(caught))
      return false
    } finally {
      setPending(false)
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const host = hostFrom(draft)
    if (hosts.includes(host)) {
      setError(`${host} já está na lista.`)
      return
    }
    if (await save([...hosts, host])) setDraft("")
  }

  return (
    <section className="publication__section">
      <h2 className="publication__title">Hosts permitidos</h2>
      <p className="publication__text">
        A leitura pública funciona de qualquer origem: estes hosts não liberam nem bloqueiam o
        acesso. Leituras feitas pelo navegador a partir deles têm um limite de leituras maior. Um
        host sem porta vale também para os subdomínios; com porta, exige host e porta exatos.
      </p>
      <p className="publication__text">
        <a href={LIMITS_DOCS} target="_blank" rel="noreferrer">
          Ver os limites na documentação
        </a>
      </p>

      {error && (
        <p className="publication__error" role="alert">
          {error}
        </p>
      )}

      {hosts.length === 0 ? (
        <p className="publication__empty">Nenhum host cadastrado.</p>
      ) : (
        <ul className="publication__hosts" aria-label="Hosts permitidos">
          {hosts.map((host) => (
            <li key={host} className="publication__host">
              <code>{host}</code>
              <button
                type="button"
                className="button button--secondary button--small"
                aria-label={`Remover ${host}`}
                disabled={pending}
                onClick={() => save(hosts.filter((other) => other !== host))}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="publication__add" onSubmit={add}>
        <label className="field">
          <span>Host</span>
          <input
            name="host"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            required
            aria-describedby={hintId}
          />
        </label>
        <button type="submit" className="button button--primary" disabled={pending}>
          Adicionar
        </button>
        <p id={hintId} className="publication__hint">
          Só o host, como example.com ou localhost:5173. Uma URL colada vira só o host.
        </p>
      </form>
    </section>
  )
}

function PublicView({ publicId }: { publicId: number }) {
  const load = useCallback((signal: AbortSignal) => getPublicContent(publicId, signal), [publicId])
  const { state, reload } = useLoad(load)

  return (
    <section className="publication__section">
      <div className="publication__heading">
        <h2 className="publication__title">O que o consumidor recebe</h2>
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={reload}
          disabled={state.status === "loading"}
        >
          Atualizar
        </button>
      </div>
      <p className="publication__text">
        O corpo da leitura pública, como a Aplicação Consumidora o recebe. A apresentação é dela.
      </p>
      {state.status === "loading" && <Loader />}
      {state.status === "failed" && (
        <p className="publication__error" role="alert">
          {userMessage(state.error)}
        </p>
      )}
      {state.status === "loaded" && (
        <pre className="publication__json" aria-label="Resposta da leitura pública" tabIndex={0}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      )}
    </section>
  )
}
