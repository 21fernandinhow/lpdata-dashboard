import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react"
import { userMessage } from "@/api/errors"
import { saveDocument, type LandingPage } from "@/api/landing-pages"
import { Icon } from "@/components/Icon"
import { JsonEditor, type JsonEditorHandle } from "@/components/JsonEditor"
import { Tooltip } from "@/components/Tooltip"
import { contractErrors, type ContractError } from "@/content/contract-errors"
import { parseJsonSource, type JsonSourceError } from "@/content/json-source"
import { useApi } from "@/session/context"

type Problem =
  | { kind: "syntax"; error: JsonSourceError }
  | { kind: "contract"; errors: ContractError[] }
  | { kind: "other"; message: string }

type RawModeProps = {
  page: LandingPage
  // O Documento em Edição, como texto. Vive na página, para sobreviver à troca de aba.
  draft: string
  onDraftChange: (draft: string) => void
  dirty: boolean
  // A gravação deu certo: a landing page devolvida e o texto que foi gravado.
  onSaved: (page: LandingPage, text: string) => void
}

// O contrato do documento na documentação: Campos Editáveis, tipos e erros possíveis.
const CONTRACT_DOCS = "https://lpdata.io/landing-pages#documento-de-conteúdo"

const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘S" : "Ctrl+S"

// O Modo Raw (ADR 0004): o Documento de Conteúdo como JSON, gravado por inteiro (ADR 0005). O
// cliente só confere se o texto é JSON; o contrato é da API (ADR 0006).
export function LandingPageRawMode({ page, draft, onDraftChange, dirty, onSaved }: RawModeProps) {
  const api = useApi()
  const editorRef = useRef<JsonEditorHandle>(null)
  const problemId = useId()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [pending, setPending] = useState(false)
  const source = useMemo(() => parseJsonSource(draft), [draft])

  // Os caminhos dos erros de contrato são procurados no texto atual: editar não os desalinha.
  const lineOf = (path: string) => (source.ok ? source.lineOf(path) : undefined)
  const markedLines = useMemo(() => {
    if (problem?.kind === "syntax") return new Set([problem.error.line])
    if (problem?.kind !== "contract") return new Set<number>()
    const lines = problem.errors.map(({ path }) => (source.ok ? source.lineOf(path) : undefined))
    return new Set(lines.filter((line) => line !== undefined))
  }, [problem, source])

  async function save() {
    if (!dirty || pending) return
    if (!source.ok) {
      setProblem({ kind: "syntax", error: source.error })
      return
    }
    setProblem(null)
    setPending(true)
    try {
      onSaved(await saveDocument(api, page.id, source.value), draft)
    } catch (error) {
      const errors = contractErrors(error)
      setProblem(
        errors ? { kind: "contract", errors } : { kind: "other", message: userMessage(error) },
      )
    } finally {
      setPending(false)
    }
  }

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault()
      void save()
    }
  })

  useEffect(() => {
    window.addEventListener("keydown", onShortcut)
    return () => window.removeEventListener("keydown", onShortcut)
  }, [])

  function handleChange(next: string) {
    // O erro de sintaxe é do texto que foi tentado; os de contrato continuam até a próxima gravação.
    if (problem?.kind === "syntax") setProblem(null)
    onDraftChange(next)
  }

  return (
    <div className="raw-mode">
      <div className="raw-mode__toolbar">
        <p className="raw-mode__hint">Tab indenta. Esc e depois Tab sai do editor.</p>
        <div className="raw-mode__save">
          <Tooltip label={`Salvar (${SHORTCUT})`}>
            {(tooltipId) => (
              <button
                type="button"
                className="button button--ghost button--icon"
                aria-labelledby={tooltipId}
                aria-keyshortcuts="Meta+S Control+S"
                aria-busy={pending || undefined}
                disabled={!dirty || pending}
                onClick={() => void save()}
              >
                <Icon>
                  <path d="M3.75 2.75H12.25L15.25 5.75V14.25C15.25 14.8 14.8 15.25 14.25 15.25H3.75C3.2 15.25 2.75 14.8 2.75 14.25V3.75C2.75 3.2 3.2 2.75 3.75 2.75Z" />
                  <path d="M5.75 2.75V6.25H11.25V2.75" />
                  <path d="M5.75 15.25V10.75H12.25V15.25" />
                </Icon>
              </button>
            )}
          </Tooltip>
          {dirty && <span className="raw-mode__dirty" aria-hidden="true" />}
          <span className="visually-hidden" role="status">
            {dirty ? "Alterações não salvas" : ""}
          </span>
        </div>
      </div>

      {problem && (
        <div id={problemId} className="raw-mode__problem" role="alert">
          {problem.kind === "syntax" && (
            <p>
              JSON inválido na linha {problem.error.line}, coluna {problem.error.column}:{" "}
              {problem.error.message}
            </p>
          )}
          {problem.kind === "other" && <p>{problem.message}</p>}
          {problem.kind === "contract" && (
            <>
              <p>A API recusou o documento:</p>
              <ul className="raw-mode__errors">
                {problem.errors.map(({ path, message }, index) => {
                  const line = lineOf(path)
                  return (
                    <li key={index}>
                      <button
                        type="button"
                        className="raw-mode__error"
                        disabled={line === undefined}
                        onClick={() => line && editorRef.current?.goToLine(line)}
                      >
                        <code>{path}</code>
                        <span>{message}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}

      <JsonEditor
        ref={editorRef}
        label="Documento de Conteúdo"
        value={draft}
        onChange={handleChange}
        markedLines={markedLines}
        describedBy={problem ? problemId : undefined}
        invalid={problem !== null}
      />

      <a className="raw-mode__docs" href={CONTRACT_DOCS} target="_blank" rel="noreferrer">
        <Icon>
          <circle cx="9" cy="9" r="7.25" />
          <path d="M9 12.25V8.5" />
          <path d="M9 5.75H9.01" />
        </Icon>
        <span>Como escrever o Documento de Conteúdo</span>
      </a>
    </div>
  )
}
