// O host como a API o compara com o Origin: example.com ou host:porta, sem esquema nem caminho.
// A API só converte para minúsculas e não valida o formato, então uma URL colada inteira nunca
// casaria com o Origin. O que não se lê como endereço vai como digitado.
export function hostFrom(text: string): string {
  const trimmed = text.trim()
  const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`
  try {
    return new URL(withScheme).host || trimmed.toLowerCase()
  } catch {
    return trimmed.toLowerCase()
  }
}
