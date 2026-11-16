const DEFAULT_API_URL = "https://api.lpdata.io"

// Em desenvolvimento, o proxy do Vite repassa /api para a API (vite.config.ts), e o navegador
// vê tudo na mesma origem. Fora dele, o cliente fala direto com a API.
const DEV_PROXY_PATH = "/api"

function readApiUrl(): string {
  const value = import.meta.env.VITE_LPDATA_API_URL?.trim()
  return value ? value.replace(/\/+$/, "") : DEFAULT_API_URL
}

export const env = {
  apiBaseUrl: import.meta.env.MODE === "development" ? DEV_PROXY_PATH : readApiUrl(),
} as const
