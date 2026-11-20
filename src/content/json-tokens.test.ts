import { tokenizeJson } from "@/content/json-tokens"

const kinds = (text: string) => tokenizeJson(text).map(({ kind, text }) => [kind, text])

describe("tokenizeJson", () => {
  it("separa chave, texto, número, literal e pontuação", () => {
    expect(kinds('{"a": "b", "n": -1.5e2, "t": true, "z": null}')).toEqual([
      ["punctuation", "{"],
      ["key", '"a"'],
      ["punctuation", ":"],
      ["whitespace", " "],
      ["string", '"b"'],
      ["punctuation", ","],
      ["whitespace", " "],
      ["key", '"n"'],
      ["punctuation", ":"],
      ["whitespace", " "],
      ["number", "-1.5e2"],
      ["punctuation", ","],
      ["whitespace", " "],
      ["key", '"t"'],
      ["punctuation", ":"],
      ["whitespace", " "],
      ["literal", "true"],
      ["punctuation", ","],
      ["whitespace", " "],
      ["key", '"z"'],
      ["punctuation", ":"],
      ["whitespace", " "],
      ["literal", "null"],
      ["punctuation", "}"],
    ])
  })

  it("chave é o texto seguido de dois-pontos, mesmo com espaço antes", () => {
    expect(kinds('{"a"\n  : 1}').slice(1, 2)).toEqual([["key", '"a"']])
  })

  it("aspas escapadas não fecham o texto", () => {
    expect(kinds('"a\\"b"')).toEqual([["string", '"a\\"b"']])
  })

  it("texto sem fechar vai até o fim da linha", () => {
    expect(kinds('"abc\n1')).toEqual([
      ["string", '"abc'],
      ["whitespace", "\n"],
      ["number", "1"],
    ])
  })

  it("o que não é JSON vira inválido, sem perder caractere", () => {
    const text = "{ a: 'x' } @@ tru"

    expect(
      tokenizeJson(text)
        .map((token) => token.text)
        .join(""),
    ).toBe(text)
    expect(kinds("@@")).toEqual([["invalid", "@@"]])
  })
})
