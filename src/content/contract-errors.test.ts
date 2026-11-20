import { AxiosError, AxiosHeaders } from "axios"
import { contractErrors } from "@/content/contract-errors"

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(
    "Request failed",
    undefined,
    config,
    {},
    {
      status,
      statusText: "",
      headers: {},
      config,
      data,
    },
  )
}

describe("contractErrors", () => {
  it("traduz as quatro mensagens do contrato e separa o caminho", () => {
    const error = apiError(422, {
      errors: [
        "Current data contains a value outside an editable field at $.hero",
        "Current data editable fields must contain both value and type at $.features[0].label",
        "Current data contains an unsupported editable field type at $.hero.title",
        "Current data editable field value does not match its type at $.hero.title",
      ],
    })

    expect(contractErrors(error)).toEqual([
      { message: "Valor fora de um Campo Editável.", path: "$.hero" },
      { message: "O Campo Editável precisa de value e type.", path: "$.features[0].label" },
      { message: "Tipo de Campo Editável não suportado.", path: "$.hero.title" },
      { message: "O value não corresponde ao type do campo.", path: "$.hero.title" },
    ])
  })

  it("o caminho pode ter espaço, como numa chave com espaço", () => {
    const error = apiError(422, {
      errors: ["Current data contains a value outside an editable field at $.minha chave"],
    })

    expect(contractErrors(error)?.[0].path).toBe("$.minha chave")
  })

  it("422 com mensagem desconhecida não é erro de contrato", () => {
    expect(contractErrors(apiError(422, { errors: ["Name can't be blank"] }))).toBeNull()
    expect(contractErrors(apiError(422, { errors: ["Current data can't be blank"] }))).toBeNull()
  })

  it("outro status ou outro erro não é erro de contrato", () => {
    expect(contractErrors(apiError(500, { errors: [] }))).toBeNull()
    expect(contractErrors(new Error("boom"))).toBeNull()
  })
})
