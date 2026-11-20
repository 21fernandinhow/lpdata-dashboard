import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { userMessage } from "@/api/errors"
import { saveDocument, type LandingPage } from "@/api/landing-pages"
import { DocsLink } from "@/components/DocsLink"
import { Icon } from "@/components/Icon"
import { JsonEditor, type JsonEditorHandle } from "@/components/JsonEditor"
import { Tooltip } from "@/components/Tooltip"
import { contractErrors, type ContractError } from "@/content/contract-errors"
import { projectFields, setFieldValue } from "@/content/form-fields"
import { formatDocument, parseJsonSource, type JsonSourceError } from "@/content/json-source"
import { ContentForm, type ContentFormHandle } from "@/pages/ContentForm"
import { useApi } from "@/session/context"

type Problem =
  | { kind: "syntax"; error: JsonSourceError }
  | { kind: "contract"; errors: ContractError[] }
  | { kind: "other"; message: string }

type ContentProps = {
  page: LandingPage
  // O Documento em Edição, como texto. Vive na página, para sobreviver à troca de aba e de modo.
  draft: string
  onDraftChange: (draft: string) => void
  dirty: boolean
  // A gravação deu certo: a landing page devolvida e o texto que foi gravado.
  onSaved: (page: LandingPage, text: string) => void
}

// O modo fica no endereço. Na interface, o Modo Raw se chama JSON.
const MODE_PARAM = "modo"
const RAW_MODE = "json"
const FORM_MODE = "formulario"

// A seção da documentação do Dashboard que explica cada modo.
const MODE_DOCS = {
  form: { href: "https://lpdata.io/dashboard#formulário", label: "Como editar pelo formulário" },
  raw: { href: "https://lpdata.io/dashboard#json", label: "Como editar o JSON" },
}

const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘S" : "Ctrl+S"

// A aba Conteúdo: os dois modos de edição sobre o mesmo Documento em Edição (ADR 0004), gravado
// por inteiro (ADR 0005). O cliente só confere se o texto é JSON; o contrato é da API (ADR 0006).
export function LandingPageContent({ page, draft, onDraftChange, dirty, onSaved }: ContentProps) {
  const api = useApi()
  const [searchParams] = useSearchParams()
  // Sem modo no endereço, abre no Formulário, que é o modo de quem não lê JSON. Documento vazio
  // abre no JSON: não há campo para editar, e a estrutura só se cria lá. A escolha é feita ao abrir
  // e não muda enquanto se edita, para o modo não trocar sozinho no meio da digitação.
  const [defaultMode] = useState(() => (isEmptyDocument(page.current_data) ? RAW_MODE : FORM_MODE))
  const onRaw = (searchParams.get(MODE_PARAM) ?? defaultMode) === RAW_MODE
  const editorRef = useRef<JsonEditorHandle>(null)
  const formRef = useRef<ContentFormHandle>(null)
  const problemId = useId()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [pending, setPending] = useState(false)
  const source = useMemo(() => parseJsonSource(draft), [draft])
  const fields = useMemo(() => (source.ok ? projectFields(source.value) : []), [source])

  // Os caminhos dos erros de contrato são procurados no texto atual: editar não os desalinha.
  const lineOf = (path: string) => (source.ok ? source.lineOf(path) : undefined)
  const markedLines = useMemo(() => {
    if (problem?.kind === "syntax") return new Set([problem.error.line])
    if (problem?.kind !== "contract") return new Set<number>()
    const lines = problem.errors.map(({ path }) => (source.ok ? source.lineOf(path) : undefined))
    return new Set(lines.filter((line) => line !== undefined))
  }, [problem, source])
  const fieldErrors = useMemo(() => {
    const byPath = new Map<string, string[]>()
    if (problem?.kind !== "contract") return byPath
    for (const { path, message } of problem.errors) {
      byPath.set(path, [...(byPath.get(path) ?? []), message])
    }
    return byPath
  }, [problem])

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

  function handleRawChange(next: string) {
    // O erro de sintaxe é do texto que foi tentado; os de contrato continuam até a próxima gravação.
    if (problem?.kind === "syntax") setProblem(null)
    onDraftChange(next)
  }

  function goTo(path: string) {
    if (!onRaw) return formRef.current?.focusPath(path)
    const line = lineOf(path)
    if (line) editorRef.current?.goToLine(line)
  }

  // No Formulário, um documento que não é JSON bloqueia o modo, e o aviso dele já diz o erro.
  const blocked = !onRaw && !source.ok
  const docs = onRaw ? MODE_DOCS.raw : MODE_DOCS.form
  const shownProblem = blocked && problem?.kind === "syntax" ? null : problem

  return (
    <div className="content">
      <div className="content__toolbar">
        <nav className="segmented" aria-label="Modo de edição">
          <Link
            to={{ search: `?${MODE_PARAM}=${FORM_MODE}` }}
            className="segmented__option"
            aria-current={onRaw ? undefined : "page"}
          >
            Formulário
          </Link>
          <Link
            to={{ search: `?${MODE_PARAM}=${RAW_MODE}` }}
            className="segmented__option"
            aria-current={onRaw ? "page" : undefined}
          >
            JSON
          </Link>
        </nav>
        <div className="content__save">
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
          {dirty && <span className="content__dirty" aria-hidden="true" />}
          <span className="visually-hidden" role="status">
            {dirty ? "Alterações não salvas" : ""}
          </span>
        </div>
      </div>

      {shownProblem && (
        <div id={problemId} className="content__problem" role="alert">
          {shownProblem.kind === "syntax" && (
            <p>
              JSON inválido na linha {shownProblem.error.line}, coluna {shownProblem.error.column}:{" "}
              {shownProblem.error.message}
            </p>
          )}
          {shownProblem.kind === "other" && <p>{shownProblem.message}</p>}
          {shownProblem.kind === "contract" && (
            <>
              <p>A API recusou o documento:</p>
              <ul className="content__errors">
                {shownProblem.errors.map(({ path, message }, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      className="content__error"
                      disabled={onRaw && lineOf(path) === undefined}
                      onClick={() => goTo(path)}
                    >
                      <code>{path}</code>
                      <span>{message}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {onRaw && (
        <>
          <p className="content__hint">Tab indenta. Esc e depois Tab sai do editor.</p>
          <JsonEditor
            ref={editorRef}
            label="Documento de Conteúdo"
            value={draft}
            onChange={handleRawChange}
            markedLines={markedLines}
            describedBy={shownProblem ? problemId : undefined}
            invalid={shownProblem !== null}
          />
        </>
      )}

      {blocked && !source.ok && (
        <div className="content__problem" role="alert">
          <p>
            O Formulário precisa de um JSON válido. JSON inválido na linha {source.error.line},
            coluna {source.error.column}: {source.error.message}
          </p>
          <p>
            <Link to={{ search: `?${MODE_PARAM}=${RAW_MODE}` }}>Corrigir no JSON</Link>
          </p>
        </div>
      )}

      {!onRaw && source.ok && (
        <ContentForm
          ref={formRef}
          document={source.value}
          fields={fields}
          errors={fieldErrors}
          onFieldChange={(path, value) => onDraftChange(setFieldValue(draft, path, value))}
          onDocumentChange={(document) => onDraftChange(formatDocument(document))}
        />
      )}

      <DocsLink href={docs.href}>{docs.label}</DocsLink>
    </div>
  )
}

function isEmptyDocument(document: unknown) {
  if (Array.isArray(document)) return document.length === 0
  return typeof document === "object" && document !== null && Object.keys(document).length === 0
}
