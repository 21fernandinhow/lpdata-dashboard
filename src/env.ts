const DEFAULT_API_URL = "https://api.lpdata.io"

function readApiUrl(): string {
  const value = import.meta.env.VITE_LPDATA_API_URL?.trim()
  if (value) return value.replace(/\/+$/, "")

  if (import.meta.env.DEV) {
    console.warn(
      `VITE_LPDATA_API_URL não está definida. O dashboard vai usar ${DEFAULT_API_URL}, que é a API de produção.`,
    )
  }
  return DEFAULT_API_URL
}

export const env = {
  apiUrl: readApiUrl(),
} as const
