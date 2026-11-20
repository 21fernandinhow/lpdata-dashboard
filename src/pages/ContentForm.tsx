import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from "react"
import type { FieldValue, FormNode } from "@/content/form-fields"

export type ContentFormHandle = {
  // Abre as seções em volta do caminho e põe o foco no campo dele.
  focusPath: (path: string) => void
}

type ContentFormProps = {
  ref?: Ref<ContentFormHandle>
  fields: FormNode[]
  // Erros de contrato da última gravação, por caminho.
  errors: ReadonlyMap<string, string[]>
  onFieldChange: (path: string, value: FieldValue) => void
}

// O Modo Formulário (ADR 0004): um editor nativo por Campo Editável, escolhido pelo type, e a
// estrutura aninhada em details. Muda só value; criar, renomear e remover é do Modo Raw.
export function ContentForm({ ref, fields, errors, onFieldChange }: ContentFormProps) {
  const rootRef = useRef<HTMLDivElement>(null)

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
      const control = element.querySelector<HTMLElement>("input, textarea")
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

  return (
    <div ref={rootRef} className="content-form">
      {fields.length === 0 ? (
        <p className="content-form__empty">
          O documento está vazio. A estrutura se cria no Modo Raw.
        </p>
      ) : (
        <Nodes nodes={fields} depth={0} errors={errors} onFieldChange={onFieldChange} />
      )}
    </div>
  )
}

type NodesProps = {
  nodes: FormNode[]
  depth: number
  errors: ReadonlyMap<string, string[]>
  onFieldChange: (path: string, value: FieldValue) => void
}

function Nodes({ nodes, depth, errors, onFieldChange }: NodesProps) {
  return nodes.map((node) => {
    if (node.kind === "group") {
      return (
        // Só o primeiro nível começa aberto. O open não muda depois: abrir e fechar é do usuário.
        <details
          key={node.path}
          className="content-form__group"
          data-path={node.path}
          open={depth === 0}
        >
          <summary>{node.label}</summary>
          <div className="content-form__children">
            {node.children.length === 0 ? (
              <p className="content-form__empty">Vazio.</p>
            ) : (
              <Nodes
                nodes={node.children}
                depth={depth + 1}
                errors={errors}
                onFieldChange={onFieldChange}
              />
            )}
          </div>
        </details>
      )
    }
    if (node.kind === "readonly") {
      return (
        <div key={node.path} className="content-form__readonly" data-path={node.path}>
          <span className="content-form__label">{node.label}</span>
          <p>{node.reason} Edite no Modo Raw.</p>
          <FieldErrors messages={errors.get(node.path)} />
        </div>
      )
    }
    return (
      <Field
        key={node.path}
        node={node}
        messages={errors.get(node.path)}
        onChange={(value) => onFieldChange(node.path, value)}
      />
    )
  })
}

type FieldNode = Extract<FormNode, { kind: "field" }>

function Field({
  node,
  messages,
  onChange,
}: {
  node: FieldNode
  messages?: string[]
  onChange: (value: FieldValue) => void
}) {
  const id = useId()
  const descriptionId = useId()
  // O número digitado fica aqui enquanto não é número: o documento só recebe número válido.
  const [numberText, setNumberText] = useState(() => String(node.value))
  const invalidNumber = node.type === "number" && !isNumber(numberText)
  const description = [...(messages ?? []), ...(invalidNumber ? ["Número inválido."] : [])]
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
  } else {
    // url, external_file e, até a escolha de asset (#17), hosted_file: endereços.
    const isAddress = node.type !== "string"
    control = (
      <input
        {...common}
        type={isAddress ? "url" : "text"}
        spellCheck={isAddress ? false : undefined}
        value={node.value as string}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <div
      className={
        node.type === "boolean"
          ? "content-form__field content-form__field--inline"
          : "content-form__field"
      }
      data-path={node.path}
    >
      {node.type === "boolean" && control}
      <div className="content-form__heading">
        <label htmlFor={id} className="content-form__label">
          {node.label}
        </label>
        <span className="content-form__type">{node.type}</span>
      </div>
      {node.type !== "boolean" && control}
      <FieldErrors id={descriptionId} messages={description} />
    </div>
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
