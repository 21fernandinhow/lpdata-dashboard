import { useId, useImperativeHandle, useRef, useState, type ChangeEvent, type Ref } from "react"
import { userMessage } from "@/api/errors"
import { listAssets, uploadAsset, type Asset } from "@/api/assets"
import { formatBytes, previewKind, typeLabel } from "@/assets/asset-format"
import { Icon } from "@/components/Icon"
import { Loader } from "@/components/Loader"
import { Tooltip } from "@/components/Tooltip"
import { useApi } from "@/session/context"

export type AssetPickerHandle = {
  // Abre o seletor. onPick recebe o asset escolhido; fechar sem escolher não chama nada.
  open: (onPick: (asset: Asset) => void) => void
}

type ListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; assets: Asset[] }
  | { status: "failed"; error: unknown }

// O seletor de assets dos campos hosted_file (#17), em dialog nativo. A lista é buscada na primeira
// vez que ele abre e fica guardada enquanto o formulário está aberto. Enviar daqui põe o arquivo
// novo no topo, pronto para escolher.
export function AssetPicker({ ref }: { ref?: Ref<AssetPickerHandle> }) {
  const api = useApi()
  const titleId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onPickRef = useRef<((asset: Asset) => void) | null>(null)
  const [list, setList] = useState<ListState>({ status: "idle" })
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function load() {
    setList({ status: "loading" })
    try {
      setList({ status: "loaded", assets: await listAssets(api) })
    } catch (error) {
      setList({ status: "failed", error })
    }
  }

  useImperativeHandle(ref, () => ({
    open(onPick) {
      onPickRef.current = onPick
      setUploadError(null)
      dialogRef.current?.showModal()
      if (list.status === "idle" || list.status === "failed") void load()
    },
  }))

  function pick(asset: Asset) {
    onPickRef.current?.(asset)
    dialogRef.current?.close()
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ""
    if (!file || list.status !== "loaded") return

    setUploadError(null)
    setUploading(file.name)
    try {
      const created = await uploadAsset(api, file)
      setList((current) =>
        current.status === "loaded"
          ? { status: "loaded", assets: [created, ...current.assets] }
          : current,
      )
    } catch (error) {
      setUploadError(`Não foi possível enviar ${file.name}. ${userMessage(error, "upload")}`)
    } finally {
      setUploading(null)
    }
  }

  // A API não ordena a lista: os mais novos primeiro, como na aba Arquivos.
  const assets = list.status === "loaded" ? [...list.assets].sort((a, b) => b.id - a.id) : []

  return (
    <dialog ref={dialogRef} className="asset-picker" aria-labelledby={titleId}>
      <div className="asset-picker__header">
        <h2 id={titleId} className="asset-picker__title">
          Escolher arquivo
        </h2>
        <div className="asset-picker__tools">
          <Tooltip label="Enviar arquivo">
            {(tooltipId) => (
              <button
                type="button"
                className="button button--ghost button--icon"
                aria-labelledby={tooltipId}
                disabled={list.status !== "loaded" || uploading !== null}
                onClick={() => inputRef.current?.click()}
              >
                <Icon>
                  <path d="M9 3.75V14.25" />
                  <path d="M3.75 9H14.25" />
                </Icon>
              </button>
            )}
          </Tooltip>
          <input
            ref={inputRef}
            type="file"
            className="visually-hidden"
            aria-label="Arquivo para enviar"
            tabIndex={-1}
            onChange={handleFile}
          />
          <Tooltip label="Fechar">
            {(tooltipId) => (
              <button
                type="button"
                className="button button--ghost button--icon"
                aria-labelledby={tooltipId}
                onClick={() => dialogRef.current?.close()}
              >
                <Icon>
                  <path d="M4.5 4.5L13.5 13.5" />
                  <path d="M13.5 4.5L4.5 13.5" />
                </Icon>
              </button>
            )}
          </Tooltip>
        </div>
      </div>

      {uploading && (
        <p className="asset-picker__status" role="status">
          Enviando {uploading}…
        </p>
      )}
      {uploadError && (
        <p className="asset-picker__error" role="alert">
          {uploadError}
        </p>
      )}

      {list.status === "loading" && <Loader />}
      {list.status === "failed" && (
        <div className="asset-picker__error" role="alert">
          <p>{userMessage(list.error)}</p>
          <button type="button" className="button button--secondary" onClick={() => void load()}>
            Tentar de novo
          </button>
        </div>
      )}
      {list.status === "loaded" && assets.length === 0 && (
        <p className="asset-picker__empty">
          Você ainda não enviou arquivos. Envie o primeiro pelo +.
        </p>
      )}
      {assets.length > 0 && (
        <ul className="asset-picker__list" aria-label="Arquivos">
          {assets.map((asset) => (
            <li key={asset.id}>
              <button type="button" className="asset-picker__option" onClick={() => pick(asset)}>
                <span className="asset-picker__preview">
                  {previewKind(asset) === "image" ? (
                    <img src={asset.public_url} alt="" loading="lazy" />
                  ) : (
                    <span className="asset__badge">{typeLabel(asset)}</span>
                  )}
                </span>
                <span className="asset-picker__name">{asset.filename}</span>
                <span className="asset-picker__meta">
                  {typeLabel(asset)} · {formatBytes(asset.byte_size)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  )
}
