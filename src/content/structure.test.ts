import {
  addField,
  addItem,
  addSection,
  changeType,
  keyProblem,
  removeAt,
  renameAt,
} from "@/content/structure"

const field = (value: unknown, type: string) => ({ value, type })

const DOCUMENT = {
  hero: { title: field("Olá", "string"), price: field(10, "number") },
  features: [{ label: field("Rápido", "string"), on: field(true, "boolean") }],
}

describe("operações de estrutura", () => {
  it("adiciona campo com o value vazio do tipo, no fim da seção", () => {
    expect(addField(DOCUMENT, ["hero"], "cta", "url").hero).toEqual({
      ...DOCUMENT.hero,
      cta: field("", "url"),
    })
    expect(addField({}, [], "n", "number")).toEqual({ n: field(0, "number") })
    expect(addField({}, [], "b", "boolean")).toEqual({ b: field(false, "boolean") })
  })

  it("adiciona seção vazia", () => {
    expect(addSection(DOCUMENT, [], "footer")).toEqual({ ...DOCUMENT, footer: {} })
  })

  it("adiciona item copiando a estrutura do primeiro, com values vazios", () => {
    expect(addItem(DOCUMENT, ["features"]).features).toEqual([
      ...DOCUMENT.features,
      { label: field("", "string"), on: field(false, "boolean") },
    ])
    expect(addItem({ list: [] }, ["list"])).toEqual({ list: [{}] })
  })

  it("remove campo, seção ou item", () => {
    expect(removeAt(DOCUMENT, ["hero", "price"]).hero).toEqual({ title: DOCUMENT.hero.title })
    expect(removeAt(DOCUMENT, ["features", 0]).features).toEqual([])
    expect(Object.keys(removeAt(DOCUMENT, ["hero"]))).toEqual(["features"])
  })

  it("renomeia a chave mantendo a posição", () => {
    const renamed = renameAt(DOCUMENT, ["hero", "title"], "heading") as unknown as {
      hero: Record<string, unknown>
    }

    expect(Object.keys(renamed.hero)).toEqual(["heading", "price"])
    expect(renamed.hero.heading).toEqual(DOCUMENT.hero.title)
  })

  it("mudar o type zera o value para o vazio do tipo novo", () => {
    expect(changeType(DOCUMENT, ["hero", "price"], "string").hero.price).toEqual(
      field("", "string"),
    )
    expect(changeType(DOCUMENT, ["hero", "title"], "number").hero.title).toEqual(field(0, "number"))
  })

  it("não muda o documento original", () => {
    const before = structuredClone(DOCUMENT)

    addField(DOCUMENT, ["hero"], "x", "text")
    removeAt(DOCUMENT, ["hero", "title"])
    renameAt(DOCUMENT, ["hero", "title"], "y")
    changeType(DOCUMENT, ["hero", "title"], "boolean")

    expect(DOCUMENT).toEqual(before)
  })
})

describe("keyProblem", () => {
  it("chave repetida na mesma seção é problema", () => {
    expect(keyProblem(DOCUMENT, ["hero"], "title")).toBe("Já existe title aqui.")
  })

  it("qualquer outro nome serve, como no contrato da API", () => {
    expect(keyProblem(DOCUMENT, ["hero"], "cta")).toBeNull()
    expect(keyProblem(DOCUMENT, ["hero"], "")).toBeNull()
    expect(keyProblem(DOCUMENT, ["hero"], "value")).toBeNull()
    expect(keyProblem(DOCUMENT, ["hero"], "title", "title")).toBeNull()
  })
})
