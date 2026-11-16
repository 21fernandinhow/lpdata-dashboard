import axios from "axios"
import { env } from "@/env"

// Base de toda chamada à API. O Accept fixo é obrigatório: com o Accept padrão, o Rails trata a
// requisição como navegação e responde 302 com HTML em vez de 401 em JSON, e o navegador segue o
// redirecionamento até o CORS bloquear. Sem withCredentials: a sessão é por token, não por cookie.
export function createHttpClient() {
  return axios.create({
    baseURL: env.apiBaseUrl,
    headers: { Accept: "application/json" },
  })
}
