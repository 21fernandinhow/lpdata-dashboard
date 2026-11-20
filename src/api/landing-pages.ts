import type { AxiosInstance } from "axios"
import { env } from "@/env"

// A landing page como a API a serializa nas rotas de gerenciamento.
export type LandingPage = {
  id: number
  public_id: number
  name: string
  // O Documento de Conteúdo. O contrato é da API (ADR 0006); a edição chega na #14.
  current_data: unknown
  allowed_hosts: string[]
  created_at: string
  updated_at: string
}

export async function listLandingPages(api: AxiosInstance, signal?: AbortSignal) {
  const { data } = await api.get<{ landing_pages: LandingPage[] }>("/manage/landing_pages", {
    signal,
  })
  return data.landing_pages
}

export async function getLandingPage(api: AxiosInstance, id: string, signal?: AbortSignal) {
  const { data } = await api.get<{ landing_page: LandingPage }>(`/manage/landing_pages/${id}`, {
    signal,
  })
  return data.landing_page
}

// O current_data não pode ser nulo, então a landing page nasce com o documento vazio, que é
// válido pelo contrato.
export async function createLandingPage(api: AxiosInstance, name: string) {
  const { data } = await api.post<{ landing_page: LandingPage }>("/manage/landing_pages", {
    landing_page: { name, current_data: {} },
  })
  return data.landing_page
}

// O PATCH é parcial: mandar só o name não toca no current_data (ADR 0005).
export async function renameLandingPage(api: AxiosInstance, id: number, name: string) {
  const { data } = await api.patch<{ landing_page: LandingPage }>(`/manage/landing_pages/${id}`, {
    landing_page: { name },
  })
  return data.landing_page
}

export async function deleteLandingPage(api: AxiosInstance, id: number) {
  await api.delete(`/manage/landing_pages/${id}`)
}

export async function updateAllowedHosts(api: AxiosInstance, id: number, hosts: string[]) {
  const { data } = await api.patch<{ landing_page: LandingPage }>(`/manage/landing_pages/${id}`, {
    landing_page: { allowed_hosts: hosts },
  })
  return data.landing_page
}

export function publicUrl(publicId: number) {
  return `${env.apiUrl}/landing_pages/${publicId}`
}
