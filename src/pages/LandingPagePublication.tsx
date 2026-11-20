import { useId, useState, type FormEvent } from "react"
import { userMessage } from "@/api/errors"
import { hostFrom } from "@/api/hosts"
import { publicUrl, updateAllowedHosts, type LandingPage } from "@/api/landing-pages"
import { CopyButton } from "@/components/CopyButton"
import { Icon } from "@/components/Icon"
import { Tooltip } from "@/components/Tooltip"
import { useApi } from "@/session/context"

const LIMITS_DOCS = "https://lpdata.io/public-content#limite-de-leituras"

type PublicationProps = { page: LandingPage; onUpdated: (page: LandingPage) => void }

// A aba Publicação: o que liga a landing page à Aplicação Consumidora.
export function LandingPagePublication({ page, onUpdated }: PublicationProps) {
  return (
    <div className="publication">
      <PublicIdentifier publicId={page.public_id} />
      <AllowedHosts page={page} onUpdated={onUpdated} />
    </div>
  )
}

// Só a URL: o identificador público é o número no fim dela, e o ícone de informação explica.
function PublicIdentifier({ publicId }: { publicId: number }) {
  const url = publicUrl(publicId)

  return (
    <section className="publication__section">
      <div className="publication__title-row">
        <h2 className="publication__title">URL pública</h2>
        <Tooltip
          label={`O identificador público é o número no fim da URL: ${publicId}. A Aplicação Consumidora pode guardar só ele e montar a URL.`}
        >
          {(tooltipId) => (
            <button
              type="button"
              className="button button--ghost button--icon publication__info"
              aria-label="Sobre o identificador público"
              aria-describedby={tooltipId}
            >
              <Icon>
                <circle cx="9" cy="9" r="7.25" />
                <path d="M9 12.25V8.5" />
                <path d="M9 5.75H9.01" />
              </Icon>
            </button>
          )}
        </Tooltip>
      </div>
      <p className="publication__text">
        A Aplicação Consumidora busca o Documento de Conteúdo por esta URL.
      </p>
      <div className="publication__url">
        <code>{url}</code>
        <CopyButton value={url} label="Copiar URL pública" />
        <Tooltip label="Abrir em nova aba">
          {(tooltipId) => (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="button button--ghost button--icon"
              aria-labelledby={tooltipId}
            >
              <Icon>
                <path d="M10.25 2.75H15.25V7.75" />
                <path d="M15.25 2.75L8.5 9.5" />
                <path d="M13.25 10.75V14C13.25 14.69 12.69 15.25 12 15.25H4C3.31 15.25 2.75 14.69 2.75 14V6C2.75 5.31 3.31 4.75 4 4.75H7.25" />
              </Icon>
            </a>
          )}
        </Tooltip>
      </div>
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
          <span>Adicionar Host</span>
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
        <Tooltip label="Adicionar host">
          {(tooltipId) => (
            <button
              type="submit"
              className="button button--ghost button--icon"
              aria-labelledby={tooltipId}
              disabled={pending}
            >
              <Icon>
                <path d="M9 3.75V14.25" />
                <path d="M3.75 9H14.25" />
              </Icon>
            </button>
          )}
        </Tooltip>
        <p id={hintId} className="publication__hint">
          Só o host, como example.com ou localhost:5173. Uma URL colada vira só o host.
        </p>
      </form>
    </section>
  )
}
