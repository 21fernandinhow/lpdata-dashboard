// Leitura do texto do Modo Raw. Faz o que JSON.parse faz, e mais duas coisas que ele não dá:
// a linha e a coluna do primeiro erro, com mensagem em português, e a linha e o trecho de cada
// caminho no formato que a API usa nos erros de contrato ($.hero.title, $.features[0].label).
//
// Não é validação de contrato (ADR 0006): só sintaxe de JSON, que o cliente precisa conferir de
// qualquer jeito para montar a requisição.

export type JsonSourceError = { line: number; column: number; message: string }

// O trecho de um valor no texto: text.slice(start, end).
export type JsonSpan = { start: number; end: number }

export type JsonSource =
  | {
      ok: true
      value: unknown
      lineOf: (path: string) => number | undefined
      spanOf: (path: string) => JsonSpan | undefined
    }
  | { ok: false; error: JsonSourceError }

class SyntaxProblem extends Error {
  constructor(
    readonly offset: number,
    message: string,
  ) {
    super(message)
  }
}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
const ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t"])
const HEX = /^[0-9a-fA-F]{4}$/
const LITERALS = [
  ["true", true],
  ["false", false],
  ["null", null],
] as const

export function parseJsonSource(text: string): JsonSource {
  const lineStarts = [0]
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") lineStarts.push(index + 1)
  }

  function lineAt(offset: number) {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (lineStarts[middle] <= offset) low = middle
      else high = middle - 1
    }
    return low + 1
  }

  const lines = new Map<string, number>()
  const spans = new Map<string, JsonSpan>()
  let position = 0

  function skipWhitespace() {
    while (position < text.length && " \t\n\r".includes(text[position])) position += 1
  }

  function fail(message: string, offset = position): never {
    throw new SyntaxProblem(offset, message)
  }

  function readString(): string {
    const start = position
    position += 1
    while (position < text.length) {
      const char = text[position]
      if (char === '"') {
        position += 1
        return JSON.parse(text.slice(start, position)) as string
      }
      if (char < " ") break
      if (char === "\\") {
        const escape = text[position + 1]
        if (escape === "u" && HEX.test(text.slice(position + 2, position + 6))) position += 6
        else if (ESCAPES.has(escape)) position += 2
        else fail("Escape inválido no texto.")
      } else {
        position += 1
      }
    }
    return fail("Texto entre aspas sem fechar.", start)
  }

  function readValue(path: string): unknown {
    skipWhitespace()
    const start = position
    lines.set(path, lineAt(start))
    const value = readBareValue(path)
    spans.set(path, { start, end: position })
    return value
  }

  function readBareValue(path: string): unknown {
    const char = text[position]

    if (char === "{") return readObject(path)
    if (char === "[") return readArray(path)
    if (char === '"') return readString()

    NUMBER.lastIndex = position
    const number = NUMBER.exec(text)
    if (number) {
      position += number[0].length
      return Number(number[0])
    }

    for (const [word, value] of LITERALS) {
      if (text.startsWith(word, position)) {
        position += word.length
        return value
      }
    }
    return fail("Esperava um valor.")
  }

  function readObject(path: string) {
    const entries: [string, unknown][] = []
    position += 1
    skipWhitespace()
    if (text[position] === "}") {
      position += 1
      return {}
    }

    for (;;) {
      skipWhitespace()
      if (text[position] !== '"') fail("Esperava uma chave entre aspas.")
      const keyLine = lineAt(position)
      const key = readString()
      skipWhitespace()
      if (text[position] !== ":") fail("Esperava ':'.")
      position += 1
      const childPath = `${path}.${key}`
      const value = readValue(childPath)
      // O caminho de um membro aponta para a linha da chave, não do valor.
      lines.set(childPath, keyLine)
      entries.push([key, value])

      skipWhitespace()
      if (text[position] === ",") {
        position += 1
        continue
      }
      if (text[position] === "}") {
        position += 1
        // fromEntries cria propriedades próprias, inclusive "__proto__", como JSON.parse.
        return Object.fromEntries(entries)
      }
      fail("Esperava ',' ou '}'.")
    }
  }

  function readArray(path: string) {
    const items: unknown[] = []
    position += 1
    skipWhitespace()
    if (text[position] === "]") {
      position += 1
      return items
    }

    for (;;) {
      items.push(readValue(`${path}[${items.length}]`))
      skipWhitespace()
      if (text[position] === ",") {
        position += 1
        continue
      }
      if (text[position] === "]") {
        position += 1
        return items
      }
      fail("Esperava ',' ou ']'.")
    }
  }

  try {
    const value = readValue("$")
    skipWhitespace()
    if (position < text.length) fail("Texto depois do fim do documento.")
    return {
      ok: true,
      value,
      lineOf: (path) => lines.get(path),
      spanOf: (path) => spans.get(path),
    }
  } catch (problem) {
    if (!(problem instanceof SyntaxProblem)) throw problem
    const line = lineAt(problem.offset)
    const column = problem.offset - lineStarts[line - 1] + 1
    return { ok: false, error: { line, column, message: problem.message } }
  }
}

// Como o documento aparece no Modo Raw ao abrir a landing page.
export function formatDocument(value: unknown) {
  return JSON.stringify(value, null, 2)
}
