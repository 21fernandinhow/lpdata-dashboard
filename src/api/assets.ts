import type { AxiosInstance } from "axios"

// O asset como o AssetSerializer da API o devolve.
export type Asset = {
  id: number
  filename: string
  content_type: string
  byte_size: number
  public_url: string
}

export async function listAssets(api: AxiosInstance, signal?: AbortSignal) {
  const { data } = await api.get<{ assets: Asset[] }>("/assets", { signal })
  return data.assets
}

// Multipart, no campo asset[file]. O axios monta o Content-Type com o boundary a partir do
// FormData. onProgress recebe de 0 a 1, quando o navegador sabe o total.
export async function uploadAsset(
  api: AxiosInstance,
  file: File,
  onProgress?: (fraction: number) => void,
) {
  const form = new FormData()
  form.append("asset[file]", file)
  const { data } = await api.post<{ asset: Asset }>("/assets", form, {
    onUploadProgress: ({ progress }) => {
      if (progress !== undefined) onProgress?.(progress)
    },
  })
  return data.asset
}

// A API não confere se alguma landing page usa o arquivo antes de apagar.
export async function deleteAsset(api: AxiosInstance, id: number) {
  await api.delete(`/assets/${id}`)
}
