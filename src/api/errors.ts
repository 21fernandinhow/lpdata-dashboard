import { isAxiosError } from "axios"

// Mensagens genéricas por situação. O texto completo da API fica nas ferramentas de
// desenvolvedor do navegador.
export const MESSAGES = {
  invalidCredentials: "Email ou senha incorretos.",
  sessionExpired: "Sua sessão expirou. Entre de novo.",
  signUpRejected: "Não foi possível criar a conta. Confira o email e a senha.",
  validation: "Não foi possível salvar. Confira os dados.",
  notFound: "Não encontrado.",
  tooManyRequests: "Muitas tentativas. Aguarde um minuto e tente de novo.",
  serverError: "A API está com problemas. Tente de novo em instantes.",
  offline: "Sem conexão com a API. Confira sua internet.",
  unexpected: "Algo deu errado. Tente de novo.",
} as const

// Onde o erro aconteceu, para os casos em que o mesmo status quer dizer coisas diferentes.
export type ErrorSituation = "sign-in" | "sign-up" | "default"

export function userMessage(error: unknown, situation: ErrorSituation = "default"): string {
  if (!isAxiosError(error)) return MESSAGES.unexpected
  if (!error.response) return MESSAGES.offline

  const { status } = error.response
  if (status === 401)
    return situation === "sign-in" ? MESSAGES.invalidCredentials : MESSAGES.sessionExpired
  if (status === 422) return situation === "sign-up" ? MESSAGES.signUpRejected : MESSAGES.validation
  if (status === 404) return MESSAGES.notFound
  if (status === 429) return MESSAGES.tooManyRequests
  if (status >= 500) return MESSAGES.serverError
  return MESSAGES.unexpected
}

export function isNotFound(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}

// A API responde erros em dois envelopes: { errors: [...] } na validação (422) e nos 401 dos
// controllers de auth, e { error: "..." } no 401 de Bearer ausente ou vencido, no 404 e no 429.
export function apiErrorDetails(error: unknown): string[] {
  if (!isAxiosError(error)) return []
  const data: unknown = error.response?.data
  if (typeof data !== "object" || data === null) return []

  if ("errors" in data && Array.isArray(data.errors)) {
    return data.errors.filter((item): item is string => typeof item === "string")
  }
  if ("error" in data && typeof data.error === "string") return [data.error]
  return []
}
