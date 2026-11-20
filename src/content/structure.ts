import { EDITABLE_TYPES, type EditableType, type FieldValue } from "@/content/form-fields"

// Um passo do caminho até um nó do documento: chave de objeto ou índice de array.
export type Segment = string | number

// As operações de estrutura do Modo Formulário (ADR 0009). Recebem o documento e devolvem uma
// cópia alterada; o original não muda. O chamador reescreve o texto a partir da cópia.

export function emptyValue(type: EditableType): FieldValue {
  if (type === "number") return 0
  if (type === "boolean") return false
  return ""
}

// Campo novo no fim de uma seção, com o value vazio do tipo.
export function addField<T>(document: T, parent: Segment[], key: string, type: EditableType): T {
  return edit(document, parent, (node) => {
    objectAt(node)[key] = { value: emptyValue(type), type }
  })
}

export function addSection<T>(document: T, parent: Segment[], key: string): T {
  return edit(document, parent, (node) => {
    objectAt(node)[key] = {}
  })
}

// Item novo no fim do array, com a estrutura do primeiro e os values vazios. Sem primeiro item,
// uma seção vazia.
export function addItem<T>(document: T, array: Segment[]): T {
  return edit(document, array, (node) => {
    if (!Array.isArray(node)) throw new Error("O caminho não é um array.")
    node.push(node.length ? emptied(node[0]) : {})
  })
}

export function removeAt<T>(document: T, at: Segment[]): T {
  return edit(document, at.slice(0, -1), (parent) => {
    const last = at[at.length - 1]
    if (Array.isArray(parent)) parent.splice(Number(last), 1)
    else delete objectAt(parent)[String(last)]
  })
}

// Troca a chave e mantém a posição dela entre as outras.
export function renameAt<T>(document: T, at: Segment[], key: string): T {
  const old = String(at[at.length - 1])
  return edit(document, at.slice(0, -1), (parent) => {
    const object = objectAt(parent)
    const entries = Object.entries(object).map(([name, value]): [string, unknown] =>
      name === old ? [key, value] : [name, value],
    )
    for (const name of Object.keys(object)) delete object[name]
    for (const [name, value] of entries) object[name] = value
  })
}

// O value é zerado para o vazio do tipo novo: value e type nunca ficam incompatíveis.
export function changeType<T>(document: T, at: Segment[], type: EditableType): T {
  return edit(document, at, (node) => {
    const field = objectAt(node)
    field.type = type
    field.value = emptyValue(type)
  })
}

// Uma seção não pode ter duas chaves iguais: a segunda apagaria a primeira. É a única restrição
// ao nome; o resto do contrato é da API (ADR 0006). current é a chave que está sendo renomeada,
// que pode continuar igual. Nulo quando o nome serve.
export function keyProblem(
  document: unknown,
  parent: Segment[],
  key: string,
  current?: string,
): string | null {
  if (key !== current && Object.hasOwn(objectAt(nodeAt(document, parent)), key)) {
    return `Já existe ${key} aqui.`
  }
  return null
}

function edit<T>(document: T, at: Segment[], change: (node: unknown) => void): T {
  const copy = structuredClone(document)
  change(nodeAt(copy, at))
  return copy
}

function nodeAt(document: unknown, at: Segment[]): unknown {
  let node = document
  for (const segment of at) {
    if (typeof node !== "object" || node === null) throw new Error("Caminho inexistente.")
    node = (node as Record<Segment, unknown>)[segment]
  }
  return node
}

function objectAt(node: unknown): Record<string, unknown> {
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    throw new Error("O caminho não é uma seção.")
  }
  return node as Record<string, unknown>
}

// A mesma estrutura com os values vazios. Arrays aninhados ficam vazios.
function emptied(node: unknown): unknown {
  if (Array.isArray(node)) return []
  if (typeof node !== "object" || node === null) return node
  const object = node as Record<string, unknown>
  if ("value" in object && EDITABLE_TYPES.includes(object.type as EditableType)) {
    return { ...object, value: emptyValue(object.type as EditableType) }
  }
  return Object.fromEntries(Object.entries(object).map(([key, child]) => [key, emptied(child)]))
}
