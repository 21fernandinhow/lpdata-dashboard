import { parseJsonSource } from "@/content/json-source"

const SOURCE = `{
  "hero": {
    "title": { "value": "Olá", "type": "string" },
    "image": { "value": "https://x.io/a.webp", "type": "hosted_file" }
  },
  "features": [
    { "label": { "value": "Rápido", "type": "string" } },
    {
      "label": { "value": 3, "type": "string" }
    }
  ]
}`

describe("parseJsonSource", () => {
  it("lê o mesmo valor que JSON.parse", () => {
    const result = parseJsonSource(SOURCE)

    expect(result.ok && result.value).toEqual(JSON.parse(SOURCE))
  })

  it.each([
    "0",
    "-1.5e3",
    '"a\\n\\u00e9\\"b"',
    "true",
    "null",
    "[]",
    "{}",
    '{"a": [1, {"b": false}], "a": 2}',
    "  [ 1 , 2 ]  ",
  ])("lê %s como JSON.parse", (text) => {
    const result = parseJsonSource(text)

    expect(result.ok && result.value).toEqual(JSON.parse(text))
  })

  describe("lineOf", () => {
    it("acha a linha de um caminho no formato da API", () => {
      const result = parseJsonSource(SOURCE)
      if (!result.ok) throw new Error("documento inválido")

      expect(result.lineOf("$")).toBe(1)
      expect(result.lineOf("$.hero")).toBe(2)
      expect(result.lineOf("$.hero.title")).toBe(3)
      expect(result.lineOf("$.hero.image")).toBe(4)
      expect(result.lineOf("$.features")).toBe(6)
      expect(result.lineOf("$.features[0].label")).toBe(7)
      // O item começa na linha do {, e o campo dentro dele, na linha da chave.
      expect(result.lineOf("$.features[1]")).toBe(8)
      expect(result.lineOf("$.features[1].label")).toBe(9)
    })

    it("caminho que não existe não tem linha", () => {
      const result = parseJsonSource(SOURCE)
      if (!result.ok) throw new Error("documento inválido")

      expect(result.lineOf("$.footer")).toBeUndefined()
      expect(result.lineOf("$.features[5]")).toBeUndefined()
    })
  })

  describe("erro", () => {
    it.each([
      ["", 1, 1, "Esperava um valor."],
      ['{"a": }', 1, 7, "Esperava um valor."],
      ['{"a" 1}', 1, 6, "Esperava ':'."],
      ['{"a": 1 "b": 2}', 1, 9, "Esperava ',' ou '}'."],
      ["[1 2]", 1, 4, "Esperava ',' ou ']'."],
      ["{a: 1}", 1, 2, "Esperava uma chave entre aspas."],
      ['{"a": 1,}', 1, 9, "Esperava uma chave entre aspas."],
      ["[1,]", 1, 4, "Esperava um valor."],
      ['{"a": "sem fim}', 1, 7, "Texto entre aspas sem fechar."],
      ['"\\x"', 1, 2, "Escape inválido no texto."],
      ["01", 1, 2, "Texto depois do fim do documento."],
      ["{}\n}", 2, 1, "Texto depois do fim do documento."],
      ["tru", 1, 1, "Esperava um valor."],
      ['{\n  "a": 1,\n  "b": \n}', 4, 1, "Esperava um valor."],
    ])("%j aponta linha %i, coluna %i", (text, line, column, message) => {
      const result = parseJsonSource(text)

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toEqual({ line, column, message })
    })
  })
})
