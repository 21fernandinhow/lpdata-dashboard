import { parseJsonSource } from "@/content/json-source"
import type { Segment } from "@/content/structure"

// Os tipos de Campo Editável do contrato do LPData. Cada um tem um editor no Modo Formulário.
export const EDITABLE_TYPES = [
  "string",
  "text",
  "number",
  "boolean",
  "url",
  "hosted_file",
  "external_file",
] as const

export type EditableType = (typeof EDITABLE_TYPES)[number]
export type FieldValue = string | number | boolean

// O documento como o Modo Formulário o vê: grupos (objetos e arrays) e campos. path é o caminho no
// formato que a API usa nos erros ($.hero.title, $.features[0]); at é o mesmo caminho em passos
// (["hero", "title"]), sem a ambiguidade de uma chave com ponto, para as operações de estrutura.
type NodeBase = { path: string; at: Segment[]; label: string }

export type FormNode =
  | (NodeBase & { kind: "field"; type: EditableType; value: FieldValue })
  | (NodeBase & { kind: "group"; list: boolean; children: FormNode[] })
  // Sem editor possível: o valor não se edita, mas o nó pode ser renomeado ou removido.
  | (NodeBase & { kind: "readonly"; reason: string })

// Projeta o documento em campos. Não é a validação do contrato, que é da API (ADR 0006): é a
// escolha do editor pelo type (ADR 0002). O que não cabe num editor fica só para leitura, em vez
// de virar um campo que produz um valor errado.
export function projectFields(document: unknown): FormNode[] {
  if (isObject(document) || Array.isArray(document)) return childrenOf(document, "$", [])
  return [{ kind: "readonly", path: "$", at: [], label: "Documento", reason: OUTSIDE }]
}

// Troca o value de um Campo Editável no texto do documento, e só ele: o resto do texto, com a
// formatação de quem escreveu no Modo Raw, fica como está. A estrutura não muda por construção.
export function setFieldValue(text: string, fieldPath: string, value: FieldValue) {
  const source = parseJsonSource(text)
  const span = source.ok ? source.spanOf(`${fieldPath}.value`) : undefined
  if (!span) throw new Error(`Campo inexistente no documento: ${fieldPath}`)
  return text.slice(0, span.start) + JSON.stringify(value) + text.slice(span.end)
}

const OUTSIDE = "Valor fora de um Campo Editável."

function childrenOf(
  node: Record<string, unknown> | unknown[],
  path: string,
  at: Segment[],
): FormNode[] {
  if (Array.isArray(node)) {
    return node.map((child, index) =>
      project(child, { path: `${path}[${index}]`, at: [...at, index], label: `Item ${index + 1}` }),
    )
  }
  return Object.entries(node).map(([key, child]) =>
    project(child, { path: `${path}.${key}`, at: [...at, key], label: key }),
  )
}

function project(node: unknown, base: NodeBase): FormNode {
  const { path, at } = base
  if (Array.isArray(node)) {
    return { ...base, kind: "group", list: true, children: childrenOf(node, path, at) }
  }
  if (!isObject(node)) return { ...base, kind: "readonly", reason: OUTSIDE }

  const hasValue = "value" in node
  const hasType = "type" in node
  if (!hasValue && !hasType) {
    return { ...base, kind: "group", list: false, children: childrenOf(node, path, at) }
  }

  const readonly = (reason: string): FormNode => ({ ...base, kind: "readonly", reason })
  if (hasValue !== hasType) return readonly("O Campo Editável precisa de value e type.")

  const { type, value } = node
  if (!isEditableType(type)) {
    return readonly(`Tipo de Campo Editável não suportado: ${String(type)}.`)
  }
  if (!matchesType(value, type)) return readonly("O value não corresponde ao type.")
  return { ...base, kind: "field", type, value }
}

function isObject(node: unknown): node is Record<string, unknown> {
  return typeof node === "object" && node !== null && !Array.isArray(node)
}

function isEditableType(type: unknown): type is EditableType {
  return EDITABLE_TYPES.includes(type as EditableType)
}

function matchesType(value: unknown, type: EditableType): value is FieldValue {
  if (type === "number") return typeof value === "number" && Number.isFinite(value)
  if (type === "boolean") return typeof value === "boolean"
  return typeof value === "string"
}
