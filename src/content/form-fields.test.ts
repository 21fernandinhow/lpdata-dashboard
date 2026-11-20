import { projectFields, setFieldValue } from "@/content/form-fields"

describe("projectFields", () => {
  it("projeta Campos Editáveis, objetos e arrays numa árvore com os caminhos da API", () => {
    const document = {
      hero: {
        title: { value: "Olá", type: "string" },
        price: { value: 10, type: "number" },
      },
      features: [{ label: { value: "Rápido", type: "string" } }],
    }

    expect(projectFields(document)).toMatchObject([
      {
        kind: "group",
        path: "$.hero",
        label: "hero",
        children: [
          { kind: "field", path: "$.hero.title", label: "title", type: "string", value: "Olá" },
          { kind: "field", path: "$.hero.price", label: "price", type: "number", value: 10 },
        ],
      },
      {
        kind: "group",
        path: "$.features",
        label: "features",
        children: [
          {
            kind: "group",
            path: "$.features[0]",
            label: "Item 1",
            children: [
              {
                kind: "field",
                path: "$.features[0].label",
                label: "label",
                type: "string",
                value: "Rápido",
              },
            ],
          },
        ],
      },
    ])
  })

  it.each([
    ["string", "a"],
    ["text", "a\nb"],
    ["number", 1.5],
    ["boolean", false],
    ["url", "https://a.io"],
    ["hosted_file", "https://cdn.io/a.webp"],
    ["external_file", "https://x.io/v"],
  ])("o tipo %s vira campo", (type, value) => {
    expect(projectFields({ f: { value, type } })).toMatchObject([
      { kind: "field", path: "$.f", label: "f", type, value },
    ])
  })

  it.each([
    [{ solto: 3 }, "$.solto", "Valor fora de um Campo Editável."],
    [{ f: { value: 1 } }, "$.f", "O Campo Editável precisa de value e type."],
    [{ f: { value: 1, type: "color" } }, "$.f", "Tipo de Campo Editável não suportado: color."],
    [{ f: { value: "1", type: "number" } }, "$.f", "O value não corresponde ao type."],
    [{ f: { value: null, type: "string" } }, "$.f", "O value não corresponde ao type."],
  ])("o que não tem editor fica só para leitura: %j", (document, path, reason) => {
    expect(projectFields(document)).toMatchObject([
      { kind: "readonly", path, label: path.slice(2), reason },
    ])
  })

  it("documento que não é objeto nem array fica só para leitura", () => {
    expect(projectFields("solto")).toMatchObject([
      {
        kind: "readonly",
        path: "$",
        label: "Documento",
        reason: "Valor fora de um Campo Editável.",
      },
    ])
  })

  it("at dá o caminho em passos, sem ambiguidade com chave que tem ponto", () => {
    const [group] = projectFields({ "a.b": [{ c: { value: "x", type: "string" } }] })

    expect(group).toMatchObject({ path: "$.a.b", at: ["a.b"], list: true })
    expect(group.kind === "group" && group.children[0]).toMatchObject({
      at: ["a.b", 0],
      children: [{ at: ["a.b", 0, "c"] }],
    })
  })

  it("um array na raiz vira itens", () => {
    expect(projectFields([{ a: { value: "x", type: "string" } }])).toMatchObject([
      {
        kind: "group",
        path: "$[0]",
        label: "Item 1",
        children: [{ kind: "field", path: "$[0].a", label: "a", type: "string", value: "x" }],
      },
    ])
  })
})

describe("setFieldValue", () => {
  const text =
    '{\n  "hero": {\n    "title": { "type": "string", "value": "Olá" },\n    "n": {"value":1,"type":"number"}\n  }\n}'

  it("troca só o trecho do value, sem mexer no resto do texto", () => {
    expect(setFieldValue(text, "$.hero.title", 'Diz "oi"\n')).toBe(
      text.replace('"Olá"', '"Diz \\"oi\\"\\n"'),
    )
    expect(setFieldValue(text, "$.hero.n", 2.5)).toBe(text.replace('"value":1', '"value":2.5'))
  })

  it("texto inválido ou caminho que não existe é erro", () => {
    expect(() => setFieldValue("{", "$.a", 1)).toThrow()
    expect(() => setFieldValue(text, "$.hero.nada", 1)).toThrow()
  })
})
