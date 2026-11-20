import { useCallback, useRef, useState, type ChangeEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { userMessage } from "@/api/errors"
import { deleteAsset, listAssets, uploadAsset, type Asset } from "@/api/assets"
import { useLoad } from "@/api/use-load"
import { formatBytes, previewKind, typeLabel } from "@/assets/asset-format"
import { CopyButton } from "@/components/CopyButton"
import { ErrorState } from "@/components/ErrorState"
import { FormDialog } from "@/components/FormDialog"
import { ASSETS_TAB, HOME_TAB_PARAM, HomeTabs } from "@/components/HomeTabs"
import { Icon } from "@/components/Icon"
import { Loader } from "@/components/Loader"
import { Tooltip } from "@/components/Tooltip"
import { useApi } from "@/session/context"

// A visão fica no endereço. A grade é o padrão: reconhece imagens de relance.
const VIEW_PARAM = "visao"
const LIST_VIEW = "lista"

// O envio em andamento: o nome do arquivo e o progresso, quando o navegador sabe o total.
type Upload = { name: string; progress: number | null }

// Os arquivos da conta, que servem a todas as landing pages. Não há atualização na API: trocar um
// arquivo é enviar outro e apagar o anterior (ADR 0002).
export default function AssetsPage() {
  const api = useApi()
  const [searchParams] = useSearchParams()
  const asList = searchParams.get(VIEW_PARAM) === LIST_VIEW
  const inputRef = useRef<HTMLInputElement>(null)
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const [upload, setUpload] = useState<Upload | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Asset | null>(null)
  const load = useCallback((signal: AbortSignal) => listAssets(api, signal), [api])
  const { state, reload, replace } = useLoad(load)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    // Limpa a escolha, para o mesmo arquivo poder ser escolhido de novo.
    input.value = ""
    if (!file || state.status !== "loaded") return

    setUploadError(null)
    setUpload({ name: file.name, progress: null })
    try {
      const created = await uploadAsset(api, file, (progress) =>
        setUpload({ name: file.name, progress }),
      )
      replace([created, ...state.data])
    } catch (error) {
      setUploadError(`Não foi possível enviar ${file.name}. ${userMessage(error, "upload")}`)
    } finally {
      setUpload(null)
    }
  }

  async function remove() {
    if (!deleting || state.status !== "loaded") return
    await deleteAsset(api, deleting.id)
    replace(state.data.filter((asset) => asset.id !== deleting.id))
  }

  if (state.status === "loading") return <Loader />
  if (state.status === "failed") {
    return (
      <ErrorState
        title="Não foi possível carregar os assets"
        message={userMessage(state.error)}
        action={{ label: "Tentar de novo", onClick: reload }}
      />
    )
  }

  // A API não ordena a lista: os mais novos primeiro, para o envio aparecer no topo.
  const assets = [...state.data].sort((a, b) => b.id - a.id)

  return (
    <section className="assets">
      <header className="home-bar">
        <h1 className="visually-hidden">Assets</h1>
        <HomeTabs current="assets" />
        <div className="home-bar__tools">
          <nav className="segmented" aria-label="Visão">
            <Link
              to={{ search: `?${HOME_TAB_PARAM}=${ASSETS_TAB}` }}
              className="segmented__option"
              aria-current={asList ? undefined : "page"}
            >
              Grade
            </Link>
            <Link
              to={{ search: `?${HOME_TAB_PARAM}=${ASSETS_TAB}&${VIEW_PARAM}=${LIST_VIEW}` }}
              className="segmented__option"
              aria-current={asList ? "page" : undefined}
            >
              Lista
            </Link>
          </nav>
          <Tooltip label="Enviar arquivo">
            {(tooltipId) => (
              <button
                type="button"
                className="button button--ghost button--icon"
                aria-labelledby={tooltipId}
                disabled={upload !== null}
                onClick={() => inputRef.current?.click()}
              >
                <Icon>
                  <path d="M9 3.75V14.25" />
                  <path d="M3.75 9H14.25" />
                </Icon>
              </button>
            )}
          </Tooltip>
          {/* O seletor nativo, aberto pelo +. Um arquivo por vez. */}
          <input
            ref={inputRef}
            type="file"
            className="visually-hidden"
            aria-label="Arquivo para enviar"
            tabIndex={-1}
            onChange={handleFile}
          />
        </div>
      </header>

      {upload && (
        <div className="assets__upload" role="status">
          <span>Enviando {upload.name}</span>
          <progress
            className="assets__progress"
            value={upload.progress ?? undefined}
            max={1}
            aria-label={`Progresso do envio de ${upload.name}`}
          />
        </div>
      )}
      {uploadError && (
        <p className="assets__error" role="alert">
          {uploadError}
        </p>
      )}

      {assets.length === 0 ? (
        <p className="assets__empty">Você ainda não enviou arquivos.</p>
      ) : (
        <ul
          className={asList ? "assets__list assets__list--rows" : "assets__list assets__list--grid"}
          aria-label="Assets"
        >
          {assets.map((asset) => (
            <AssetItem
              key={asset.id}
              asset={asset}
              onDelete={() => {
                setDeleting(asset)
                deleteDialog.current?.showModal()
              }}
            />
          ))}
        </ul>
      )}

      <FormDialog ref={deleteDialog} title="Apagar arquivo" submitLabel="Apagar" onSubmit={remove}>
        <p className="form-dialog__text">
          <strong>{deleting?.filename}</strong> sai do LPData. As landing pages que usam este
          arquivo deixam de mostrar o conteúdo dele. Isso não pode ser desfeito.
        </p>
      </FormDialog>
    </section>
  )
}

function AssetItem({ asset, onDelete }: { asset: Asset; onDelete: () => void }) {
  const kind = previewKind(asset)
  const label = typeLabel(asset)

  return (
    <li className="asset">
      <div className="asset__preview">
        {kind === "image" ? (
          <img src={asset.public_url} alt={asset.filename} loading="lazy" />
        ) : (
          <span className="asset__badge" aria-hidden="true">
            {label}
          </span>
        )}
      </div>
      <div className="asset__info">
        <span className="asset__name">{asset.filename}</span>
        <span className="asset__meta">
          {label} · {formatBytes(asset.byte_size)}
        </span>
        {kind === "svg" && (
          <span className="asset__note">SVG não aparece como imagem na landing page.</span>
        )}
      </div>
      <div className="asset__actions">
        <CopyButton value={asset.public_url} label={`Copiar URL de ${asset.filename}`} />
        <Tooltip label={`Apagar ${asset.filename}`}>
          {(tooltipId) => (
            <button
              type="button"
              className="button button--ghost button--icon"
              aria-labelledby={tooltipId}
              onClick={onDelete}
            >
              <Icon>
                <path d="M3 4.75H15" />
                <path d="M7 4.75V2.75H11V4.75" />
                <path d="M4.5 4.75L5.25 15.25H12.75L13.5 4.75" />
                <path d="M7.5 8V12" />
                <path d="M10.5 8V12" />
              </Icon>
            </button>
          )}
        </Tooltip>
      </div>
    </li>
  )
}
