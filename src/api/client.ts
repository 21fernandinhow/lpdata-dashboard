import { isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios"
import { createHttpClient } from "@/api/http"

type AuthenticatedConfig = InternalAxiosRequestConfig & {
  // O access token enviado nesta requisição, para saber se outra já o renovou.
  sentAccessToken?: string | null
  retried?: boolean
}

type ApiClientOptions = {
  getAccessToken: () => string | null
  // Renova a sessão. Rejeita se a renovação falhar.
  renew: () => Promise<void>
  // Encerra a sessão quando a requisição repetida também recebe 401.
  expire: () => void
}

// O cliente central da API: manda o access token e, diante de um 401, renova a sessão e repete a
// requisição uma vez.
export function createApiClient({
  getAccessToken,
  renew,
  expire,
}: ApiClientOptions): AxiosInstance {
  const client = createHttpClient()

  client.interceptors.request.use((config: AuthenticatedConfig) => {
    const token = getAccessToken()
    config.sentAccessToken = token
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error) || error.response?.status !== 401) throw error
    const config = error.config as AuthenticatedConfig | undefined
    if (!config) throw error
    if (config.retried) {
      expire()
      throw error
    }

    // Se outra requisição já renovou enquanto esta estava no ar, basta repetir.
    if (getAccessToken() === config.sentAccessToken) await renew()
    config.retried = true
    return client.request(config)
  })

  return client
}
