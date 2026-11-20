// Pedaços do texto do Modo Raw para o destaque de sintaxe. Aceita qualquer texto, inclusive JSON
// quebrado no meio da digitação: o que não se reconhece vira "invalid", e juntar os pedaços
// devolve o texto original, caractere por caractere.

export type JsonTokenKind =
  "key" | "string" | "number" | "literal" | "punctuation" | "whitespace" | "invalid"

export type JsonToken = { kind: JsonTokenKind; text: string }

// Texto entre aspas: até a aspa que fecha ou, sem ela, até o fim da linha.
const STRING = /"(?:[^"\\\n]|\\.)*"?/y
const KEY_FOLLOWS = /\s*:/y
const RULES: [JsonTokenKind, RegExp][] = [
  ["whitespace", /\s+/y],
  ["punctuation", /[{}[\]:,]/y],
  ["number", /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
  ["literal", /(?:true|false|null)(?![A-Za-z0-9_])/y],
  ["invalid", /[^\s{}[\]:,"]+/y],
]

export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = []
  let position = 0

  while (position < text.length) {
    STRING.lastIndex = position
    const string = STRING.exec(text)
    if (string) {
      position += string[0].length
      KEY_FOLLOWS.lastIndex = position
      tokens.push({ kind: KEY_FOLLOWS.test(text) ? "key" : "string", text: string[0] })
      continue
    }

    for (const [kind, rule] of RULES) {
      rule.lastIndex = position
      const match = rule.exec(text)
      if (match) {
        position += match[0].length
        tokens.push({ kind, text: match[0] })
        break
      }
    }
  }

  return tokens
}
