import { AxiosError, AxiosHeaders } from "axios"
import { apiErrorDetails, isNotFound, userMessage } from "@/api/errors"

function responseError(status: number, data: unknown = {}) {
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

function networkError() {
  return new AxiosError("Network Error", AxiosError.ERR_NETWORK, undefined, {})
}

describe("userMessage", () => {
  it.each([
    [404, "Não encontrado."],
    [422, "Não foi possível salvar. Confira os dados."],
    [429, "Muitas tentativas. Aguarde um minuto e tente de novo."],
    [500, "A API está com problemas. Tente de novo em instantes."],
    [503, "A API está com problemas. Tente de novo em instantes."],
  ])("traduz %i", (status, message) => {
    expect(userMessage(responseError(status))).toBe(message)
  })

  it("traduz a falta de rede", () => {
    expect(userMessage(networkError())).toBe("Sem conexão com a API. Confira sua internet.")
  })

  it("no login, 401 é email ou senha incorretos", () => {
    expect(userMessage(responseError(401), "sign-in")).toBe("Email ou senha incorretos.")
  })

  it("no cadastro, 422 é a conta recusada", () => {
    expect(userMessage(responseError(422), "sign-up")).toBe(
      "Não foi possível criar a conta. Confira o email e a senha.",
    )
  })

  it("fora do login, 401 é sessão expirada", () => {
    expect(userMessage(responseError(401))).toBe("Sua sessão expirou. Entre de novo.")
  })

  it("um erro que não veio da API tem mensagem genérica", () => {
    expect(userMessage(new Error("boom"))).toBe("Algo deu errado. Tente de novo.")
  })
})

describe("apiErrorDetails", () => {
  it("lê o envelope errors, de validação e dos controllers de auth", () => {
    const error = responseError(422, { errors: ["Email is invalid", "Password is too short"] })

    expect(apiErrorDetails(error)).toEqual(["Email is invalid", "Password is too short"])
  })

  it("lê o envelope error, do 401 do Warden, 404 e 429", () => {
    const error = responseError(401, {
      error: "You need to sign in or sign up before continuing.",
    })

    expect(apiErrorDetails(error)).toEqual(["You need to sign in or sign up before continuing."])
  })

  it("sem corpo de erro da API, não há detalhes", () => {
    expect(apiErrorDetails(networkError())).toEqual([])
    expect(apiErrorDetails(responseError(500, "<html>"))).toEqual([])
  })
})

describe("isNotFound", () => {
  it("só o 404 da API é não encontrado", () => {
    expect(isNotFound(responseError(404, { error: "Landing page not found" }))).toBe(true)
    expect(isNotFound(responseError(422))).toBe(false)
    expect(isNotFound(networkError())).toBe(false)
    expect(isNotFound(new Error("boom"))).toBe(false)
  })
})
