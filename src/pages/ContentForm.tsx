import {
  createContext,
  use,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react"
import { flushSync } from "react-dom"
import { FormDialog } from "@/components/FormDialog"
import { FormDialogError } from "@/components/form-dialog-error"
import { Icon } from "@/components/Icon"
import { Tooltip } from "@/components/Tooltip"
import { filenameFromUrl, previewKind, typeLabel } from "@/assets/asset-format"
import { AssetPicker, type AssetPickerHandle } from "@/pages/AssetPicker"
import {
  EDITABLE_TYPES,
  type EditableType,
  type FieldValue,
  type FormNode,
} from "@/content/form-fields"
import {
  addField,
  addItem,
  addSection,
  changeType,
  keyProblem,
  removeAt,
  renameAt,
  type Segment,
} from "@/content/structure"

export type ContentFormHandle = {
  // Abre as seções em volta do caminho e põe o foco no campo dele.
  focusPath: (path: string) => void
}

type ContentFormProps = {
  ref?: Ref<ContentFormHandle>
  // O documento, já lido do Documento em Edição, e a projeção dele em campos.
  document: unknown
  fields: FormNode[]
  // Erros de contrato da última gravação, por caminho.
  errors: ReadonlyMap<string, string[]>
  // Troca de um value: só o trecho dele muda no texto.
  onFieldChange: (path: string, value: FieldValue) => void
  // Mudança de estrutura: o documento inteiro, para ser reescrito formatado.
  onDocumentChange: (document: unknown) => void
}

// O que o dialog de estrutura vai fazer. parentPath é o caminho, no formato da API, do nó onde a
// seção ou o campo nasce, para a seção nova já abrir.
type Action =
  | { kind: "add-field"; parent: Segment[]; parentPath: string }
  | { kind: "add-section"; parent: Segment[]; parentPath: string }
  | { kind: "rename"; at: Segment[]; label: string }
  | { kind: "remove"; at: Segment[]; label: string }

type FormActions = {
  errors: ReadonlyMap<string, string[]>
  // Seções criadas nesta sessão: nascem abertas, em qualquer nível.
  created: ReadonlySet<string>
  open: (action: Action) => void
  addItem: (at: Segment[], path: string, length: number) => void
  changeType: (at: Segment[], type: EditableType) => void
  onFieldChange: (path: string, value: FieldValue) => void
  // Abre o seletor de assets para um campo hosted_file.
  pickAsset: (path: string) => void
}

const FormActionsContext = createContext<FormActions | null>(null)

function useFormActions() {
  const actions = use(FormActionsContext)
  if (!actions) throw new Error("useFormActions precisa do ContentForm acima.")
  return actions
}

// O Modo Formulário: um editor nativo por Campo Editável, escolhido pelo type, e a estrutura
// aninhada em details. Também cria, renomeia e remove seções, campos e itens, e muda o type
// (ADR 0009). O contrato do documento é o da API: o formulário não acrescenta regra.
export function ContentForm({
  ref,
  document,
  fields,
  errors,
  onFieldChange,
  onDocumentChange,
}: ContentFormProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pickerRef = useRef<AssetPickerHandle>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [created, setCreated] = useState<ReadonlySet<string>>(new Set())
  const rootIsList = Array.isArray(document)

  function elementOf(path: string) {
    const nodes = rootRef.current?.querySelectorAll<HTMLElement>("[data-path]") ?? []
    return [...nodes].find((node) => node.dataset.path === path)
  }

  function reveal(element: HTMLElement) {
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (node instanceof HTMLDetailsElement) node.open = true
    }
    if (element instanceof HTMLDetailsElement) element.open = true
  }

  useImperativeHandle(ref, () => ({
    focusPath(path) {
      const element = elementOf(path)
      if (!element) return
      reveal(element)
      const control = element.querySelector<HTMLElement>("input, textarea, .file-field button")
      if (control) control.focus()
      else element.scrollIntoView({ block: "center" })
    },
  }))

  // Uma seção com erro da API abre sozinha.
  useEffect(() => {
    for (const path of errors.keys()) {
      const element = elementOf(path)
      if (element) reveal(element)
    }
  }, [errors])

  function markCreated(path: string) {
    setCreated((current) => new Set(current).add(path))
  }

  const actions: FormActions = {
    errors,
    created,
    open(next) {
      // O dialog precisa do conteúdo da ação nova antes de abrir, para o reset do formulário
      // voltar ao nome certo.
      flushSync(() => setAction(next))
      dialogRef.current?.showModal()
    },
    addItem(at, path, length) {
      markCreated(`${path}[${length}]`)
      onDocumentChange(addItem(document, at))
    },
    changeType(at, type) {
      onDocumentChange(changeType(document, at, type))
    },
    onFieldChange,
    pickAsset(path) {
      pickerRef.current?.open((asset) => onFieldChange(path, asset.public_url))
    },
  }

  async function submit(form: FormData) {
    if (!action) return
    const key = String(form.get("key") ?? "")
    const check = (problem: string | null) => {
      if (problem) throw new FormDialogError(problem)
    }

    if (action.kind === "add-field") {
      check(keyProblem(document, action.parent, key))
      onDocumentChange(addField(document, action.parent, key, form.get("type") as EditableType))
    } else if (action.kind === "add-section") {
      check(keyProblem(document, action.parent, key))
      markCreated(`${action.parentPath}.${key}`)
      onDocumentChange(addSection(document, action.parent, key))
    } else if (action.kind === "rename") {
      check(keyProblem(document, action.at.slice(0, -1), key, action.label))
      onDocumentChange(renameAt(document, action.at, key))
    } else {
      onDocumentChange(removeAt(document, action.at))
    }
  }

  return (
    <FormActionsContext value={actions}>
      <div ref={rootRef} className="content-form">
        {fields.length === 0 ? (
          <p className="content-form__empty">O documento está vazio.</p>
        ) : (
          <Nodes nodes={fields} depth={0} />
        )}
        <GroupActions
          at={[]}
          path="$"
          label=""
          list={rootIsList}
          length={rootIsList ? (document as unknown[]).length : 0}
        />
      </div>
      <StructureDialog ref={dialogRef} action={action} onSubmit={submit} />
      <AssetPicker ref={pickerRef} />
    </FormActionsContext>
  )
}

function Nodes({ nodes, depth }: { nodes: FormNode[]; depth: number }) {
  const { errors, created } = useFormActions()

  return nodes.map((node) => {
    if (node.kind === "group") {
      const length = node.children.length
      return (
        // Só o primeiro nível e as seções recém-criadas começam abertos. O open não muda depois:
        // abrir e fechar é do usuário.
        <details
          key={node.path}
          className="content-form__group"
          data-path={node.path}
          open={depth === 0 || created.has(node.path)}
        >
          {/* O nome fica como texto direto do summary; renomear e remover, à direita. */}
          <summary className="content-form__summary">
            {node.label}
            <NodeActions at={node.at} label={node.label} />
          </summary>
          <div className="content-form__children">
            {length === 0 ? (
              <p className="content-form__empty">Vazio.</p>
            ) : (
              <Nodes nodes={node.children} depth={depth + 1} />
            )}
            <div className="content-form__group-footer">
              <GroupActions
                at={node.at}
                path={node.path}
                label={node.label}
                list={node.list}
                length={length}
              />
            </div>
          </div>
        </details>
      )
    }
    if (node.kind === "readonly") {
      return (
        <div key={node.path} className="content-form__readonly" data-path={node.path}>
          <div className="content-form__heading">
            <span className="content-form__label">{node.label}</span>
            <NodeActions at={node.at} label={node.label} />
          </div>
          <p>{node.reason} Edite no JSON.</p>
          <FieldErrors messages={errors.get(node.path)} />
        </div>
      )
    }
    // Mudar o type remonta o campo: o número em digitação não passa para o tipo novo.
    return <Field key={`${node.path}:${node.type}`} node={node} messages={errors.get(node.path)} />
  })
}

// Os botões que criam dentro de uma seção: o que nasce aqui é filho dela. Na raiz, label é vazio.
function GroupActions({
  at,
  path,
  label,
  list,
  length,
}: {
  at: Segment[]
  path: string
  label: string
  list: boolean
  length: number
}) {
  const actions = useFormActions()
  const where = label ? ` em ${label}` : ""
  const plus = (
    <Icon>
      <path d="M9 3.75V14.25" />
      <path d="M3.75 9H14.25" />
    </Icon>
  )

  if (list) {
    return (
      <div className="content-form__add">
        <button
          type="button"
          className="button button--ghost button--small"
          aria-label={`Adicionar item${where}`}
          onClick={() => actions.addItem(at, path, length)}
        >
          {plus}
          Item
        </button>
      </div>
    )
  }
  return (
    <div className="content-form__add">
      <button
        type="button"
        className="button button--ghost button--small"
        aria-label={`Adicionar campo${where}`}
        onClick={() => actions.open({ kind: "add-field", parent: at, parentPath: path })}
      >
        {plus}
        Campo
      </button>
      <button
        type="button"
        className="button button--ghost button--small"
        aria-label={`Adicionar seção${where}`}
        onClick={() => actions.open({ kind: "add-section", parent: at, parentPath: path })}
      >
        {plus}
        Seção
      </button>
    </div>
  )
}

// Renomear e remover, lado a lado à direita do cabeçalho do campo ou da seção. Item de array não
// tem nome para renomear.
function NodeActions({ at, label }: { at: Segment[]; label: string }) {
  const actions = useFormActions()
  const named = typeof at[at.length - 1] === "string"

  return (
    <span className="content-form__node-actions">
      {named && (
        <IconAction
          label={`Renomear ${label}`}
          onClick={() => actions.open({ kind: "rename", at, label })}
        >
          <path d="M12.5 2.75L15.25 5.5L6 14.75H3.25V12L12.5 2.75Z" />
          <path d="M10.75 4.5L13.5 7.25" />
        </IconAction>
      )}
      <IconAction
        label={`Remover ${label}`}
        onClick={() => actions.open({ kind: "remove", at, label })}
      >
        <path d="M3 4.75H15" />
        <path d="M7 4.75V2.75H11V4.75" />
        <path d="M4.5 4.75L5.25 15.25H12.75L13.5 4.75" />
        <path d="M7.5 8V12" />
        <path d="M10.5 8V12" />
      </IconAction>
    </span>
  )
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip label={label}>
      {(tooltipId) => (
        <button
          type="button"
          className="button button--ghost button--icon content-form__icon"
          aria-labelledby={tooltipId}
          onClick={(event) => {
            // Dentro do summary, o clique abriria ou fecharia a seção.
            event.preventDefault()
            onClick()
          }}
        >
          <Icon>{children}</Icon>
        </button>
      )}
    </Tooltip>
  )
}

function StructureDialog({
  ref,
  action,
  onSubmit,
}: {
  ref: RefObject<HTMLDialogElement | null>
  action: Action | null
  onSubmit: (form: FormData) => Promise<void>
}) {
  const typeId = useId()
  const title =
    action?.kind === "add-field"
      ? "Adicionar campo"
      : action?.kind === "add-section"
        ? "Adicionar seção"
        : action?.kind === "rename"
          ? `Renomear ${action.label}`
          : `Remover ${action?.label ?? ""}`
  const submitLabel =
    action?.kind === "rename" ? "Renomear" : action?.kind === "remove" ? "Remover" : "Adicionar"

  return (
    <FormDialog ref={ref} title={title} submitLabel={submitLabel} onSubmit={onSubmit}>
      {action?.kind === "rename" && (
        <p className="form-dialog__text">
          A Aplicação Consumidora que lê <strong>{action.label}</strong> deixa de encontrar o valor.
        </p>
      )}
      {action?.kind === "remove" && (
        <p className="form-dialog__text">
          <strong>{action.label}</strong> e o que houver dentro saem do documento. A Aplicação
          Consumidora que lê esse caminho deixa de encontrar o valor.
        </p>
      )}
      {action && action.kind !== "remove" && (
        <label className="field">
          <span>Nome</span>
          <input
            name="key"
            autoComplete="off"
            spellCheck={false}
            defaultValue={action.kind === "rename" ? action.label : ""}
          />
        </label>
      )}
      {action?.kind === "add-field" && (
        <label className="field" htmlFor={typeId}>
          <span>Tipo</span>
          <select id={typeId} name="type" defaultValue="string">
            {EDITABLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      )}
    </FormDialog>
  )
}

type FieldNode = Extract<FormNode, { kind: "field" }>

function Field({ node, messages }: { node: FieldNode; messages?: string[] }) {
  const actions = useFormActions()
  const id = useId()
  const labelId = useId()
  const descriptionId = useId()
  // O número digitado fica aqui enquanto não é número: o documento só recebe número válido.
  const [numberText, setNumberText] = useState(() => String(node.value))
  const invalidNumber = node.type === "number" && !isNumber(numberText)
  const description = [...(messages ?? []), ...(invalidNumber ? ["Número inválido."] : [])]
  const onChange = (value: FieldValue) => actions.onFieldChange(node.path, value)
  const common = {
    id,
    "aria-describedby": description.length ? descriptionId : undefined,
    "aria-invalid": description.length ? true : undefined,
  }

  let control
  if (node.type === "boolean") {
    control = (
      <input
        {...common}
        type="checkbox"
        role="switch"
        className="switch"
        checked={node.value as boolean}
        onChange={(event) => onChange(event.target.checked)}
      />
    )
  } else if (node.type === "number") {
    control = (
      <input
        {...common}
        type="number"
        inputMode="decimal"
        step="any"
        value={numberText}
        onChange={(event) => {
          setNumberText(event.target.value)
          if (isNumber(event.target.value)) onChange(Number(event.target.value))
        }}
      />
    )
  } else if (node.type === "text") {
    control = (
      <textarea
        {...common}
        rows={3}
        value={node.value as string}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  } else if (node.type === "hosted_file") {
    control = (
      <HostedFile
        label={node.label}
        url={node.value as string}
        onPick={() => actions.pickAsset(node.path)}
        onClear={() => onChange("")}
      />
    )
  } else {
    // url e external_file: endereços digitados. O external_file mostra a prévia, como o hosted_file.
    const isAddress = node.type !== "string"
    control = (
      <>
        <input
          {...common}
          type={isAddress ? "url" : "text"}
          spellCheck={isAddress ? false : undefined}
          value={node.value as string}
          onChange={(event) => onChange(event.target.value)}
        />
        {node.type === "external_file" && (
          <FilePreview label={node.label} url={node.value as string} />
        )}
      </>
    )
  }

  // Os campos de arquivo são grupos com o nome do campo: o hosted_file não tem um input só.
  const isFile = node.type === "hosted_file" || node.type === "external_file"

  return (
    <div
      className="content-form__field"
      data-path={node.path}
      role={isFile ? "group" : undefined}
      aria-labelledby={isFile ? labelId : undefined}
      aria-describedby={
        node.type === "hosted_file" && description.length ? descriptionId : undefined
      }
    >
      <div className="content-form__heading">
        {node.type === "hosted_file" ? (
          <span id={labelId} className="content-form__label">
            {node.label}
          </span>
        ) : (
          <label id={labelId} htmlFor={id} className="content-form__label">
            {node.label}
          </label>
        )}
        <select
          className="content-form__type"
          aria-label={`Tipo de ${node.label}`}
          value={node.type}
          onChange={(event) => actions.changeType(node.at, event.target.value as EditableType)}
        >
          {EDITABLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <NodeActions at={node.at} label={node.label} />
      </div>
      {control}
      <FieldErrors id={descriptionId} messages={description} />
    </div>
  )
}

// O hosted_file: a prévia, o nome do arquivo escolhido, escolher pelo seletor de assets e limpar.
function HostedFile({
  label,
  url,
  onPick,
  onClear,
}: {
  label: string
  url: string
  onPick: () => void
  onClear: () => void
}) {
  return (
    <div className="file-field">
      <FilePreview label={label} url={url} />
      <div className="file-field__info">
        <span className="file-field__name">
          {url ? filenameFromUrl(url) || url : "Nenhum arquivo escolhido."}
        </span>
        <div className="file-field__buttons">
          <button
            type="button"
            className="button button--secondary button--small"
            aria-label={`Escolher arquivo para ${label}`}
            onClick={onPick}
          >
            Escolher arquivo
          </button>
          {url && (
            <button
              type="button"
              className="button button--ghost button--small"
              aria-label={`Limpar ${label}`}
              onClick={onClear}
            >
              Limpar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// A prévia de um arquivo pela URL: a imagem, quando o nome dela é de imagem; senão, o tipo.
function FilePreview({ label, url }: { label: string; url: string }) {
  if (!url) return null
  const filename = filenameFromUrl(url)
  const file = { filename, content_type: "" }
  return (
    <span className="file-field__preview">
      {previewKind(file) === "image" ? (
        <img src={url} alt={`Prévia de ${label}`} loading="lazy" />
      ) : (
        <span className="asset__badge" aria-hidden="true">
          {filename ? typeLabel(file) : "URL"}
        </span>
      )}
    </span>
  )
}

function FieldErrors({ id, messages }: { id?: string; messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p id={id} className="content-form__error">
      {messages.join(" ")}
    </p>
  )
}

function isNumber(text: string) {
  return text.trim() !== "" && Number.isFinite(Number(text))
}
