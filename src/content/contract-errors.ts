import { isAxiosError } from "axios"
import { apiErrorDetails } from "@/api/errors"

// Um erro de contrato do Documento de Conteúdo, com o caminho do campo no formato da API.
export type ContractError = { message: string; path: string }

// As mensagens do ContentDocumentValidator do LPData, que chegam como full_messages do Rails:
// "Current data <mensagem> at <caminho>".
const MESSAGES: Record<string, string> = {
  "contains a value outside an editable field": "Valor fora de um Campo Editável.",
  "editable fields must contain both value and type": "O Campo Editável precisa de value e type.",
  "contains an unsupported editable field type": "Tipo de Campo Editável não suportado.",
  "editable field value does not match its type": "O value não corresponde ao type do campo.",
}

const FULL_MESSAGE = /^Current data (.+?) at (\$.*)$/

// Os erros de contrato de um 422 ao gravar o documento. Nulo quando não é esse o caso, ou quando
// alguma mensagem não é conhecida: aí vale a mensagem genérica.
export function contractErrors(error: unknown): ContractError[] | null {
  if (!isAxiosError(error) || error.response?.status !== 422) return null

  const found: ContractError[] = []
  for (const detail of apiErrorDetails(error)) {
    const match = FULL_MESSAGE.exec(detail)
    const message = match && MESSAGES[match[1]]
    if (!match || !message) return null
    found.push({ message, path: match[2] })
  }
  return found.length ? found : null
}
